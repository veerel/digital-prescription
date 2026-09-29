"""Doctors directory, dashboard, activity feed, adding doctors, and demo seeding."""

from collections.abc import Callable
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.activity import Activity
from app.models.patient import Patient
from app.models.user import Role, User
from app.models.visit import Visit
from app.scripts.seed_demo import SeedError, seed_demo
from app.utils.time import local_today, utcnow
from tests.conftest import TEST_PASSWORD, csrf, login

UserFactory = Callable[..., User]
PatientFactory = Callable[..., Patient]
VisitFactory = Callable[..., Visit]


class TestDoctors:
    def test_anonymous_gets_401(self, client: TestClient) -> None:
        assert client.get("/api/v1/doctors").status_code == 401

    def test_any_doctor_sees_team_with_workload(
        self,
        client: TestClient,
        make_user: UserFactory,
        make_patient: PatientFactory,
        make_visit: VisitFactory,
    ) -> None:
        busy = make_user(full_name="Dr. A Busy")
        idle = make_user(full_name="Dr. B Idle")
        patient = make_patient(busy)
        make_patient(busy)
        make_visit(patient, busy)
        login(client, idle)

        response = client.get("/api/v1/doctors")

        assert response.status_code == 200
        rows = {d["full_name"]: d for d in response.json()}
        assert rows["Dr. A Busy"]["patient_count"] == 2
        assert rows["Dr. A Busy"]["prescription_count"] == 1
        assert rows["Dr. B Idle"]["patient_count"] == 0
        assert "password_hash" not in response.text
        assert "token_version" not in response.text


class TestAddDoctor:
    payload = {  # noqa: RUF012
        "email": "rahul.verma@clinic.in",
        "full_name": "Dr. Rahul Verma",
        "password": "a-temporary-password",
        "specialization": "ENT",
        "qualification": "MBBS, MS (ENT)",
        "registration_number": "TN/MCI/00001",
        "phone": "+91 90000 00000",
    }

    def test_admin_adds_doctor_with_profile_and_activity(
        self, client: TestClient, make_user: UserFactory, db: Session
    ) -> None:
        admin = make_user(role=Role.ADMIN, full_name="Dr. Admin")
        login(client, admin)

        response = client.post("/api/v1/users", json=self.payload, headers=csrf(client))

        assert response.status_code == 201
        body = response.json()
        assert body["role"] == "doctor"
        assert body["specialization"] == "ENT"
        assert body["registration_number"] == "TN/MCI/00001"
        descriptions = db.scalars(select(Activity.description)).all()
        assert "Dr. Admin added Dr. Rahul Verma (ENT) to the team" in descriptions

    def test_doctor_cannot_add_doctors(self, client: TestClient, make_user: UserFactory) -> None:
        login(client, make_user())
        response = client.post("/api/v1/users", json=self.payload, headers=csrf(client))
        assert response.status_code == 403

    def test_invalid_accent_color_is_422(self, client: TestClient, make_user: UserFactory) -> None:
        login(client, make_user(role=Role.ADMIN))
        payload = {**self.payload, "accent_color": "red; background: url(x)"}
        response = client.post("/api/v1/users", json=payload, headers=csrf(client))
        assert response.status_code == 422


class TestDashboard:
    def test_anonymous_gets_401(self, client: TestClient) -> None:
        assert client.get("/api/v1/dashboard").status_code == 401

    def test_summary(
        self,
        client: TestClient,
        make_user: UserFactory,
        make_patient: PatientFactory,
        make_visit: VisitFactory,
    ) -> None:
        doctor = make_user()
        make_user(is_active=False)
        fathima, suresh = make_patient(doctor, full_name="Fathima"), make_patient(doctor)
        today = local_today(get_settings().clinic_tz)
        # Older visit's follow-up is superseded by the newer visit's.
        make_visit(
            fathima,
            doctor,
            visited_at=utcnow() - timedelta(days=40),
            diagnosis="Essential Hypertension",
            follow_up_date=today + timedelta(days=1),
        )
        make_visit(
            fathima,
            doctor,
            diagnosis="Hypertension — stable",
            follow_up_date=today + timedelta(days=3),
        )
        make_visit(
            suresh, doctor, diagnosis="Something rare", follow_up_date=today + timedelta(days=30)
        )
        login(client, doctor)

        body = client.get("/api/v1/dashboard").json()

        assert body["today"] == today.isoformat()
        assert body["total_patients"] == 2
        assert body["todays_visits"] == 2
        assert body["active_doctors"] == 1
        assert len(body["visits_per_day"]) == 7
        assert body["visits_per_day"][-1] == {"date": today.isoformat(), "count": 2}
        assert body["top_diagnoses"][0] == {"label": "Hypertension", "count": 2}
        assert {"label": "Other", "count": 1} in body["top_diagnoses"]
        assert [f["patient"]["full_name"] for f in body["follow_ups"]] == ["Fathima"]
        assert body["follow_ups"][0]["follow_up_date"] == (today + timedelta(days=3)).isoformat()


class TestActivities:
    def test_anonymous_gets_401(self, client: TestClient) -> None:
        assert client.get("/api/v1/activities").status_code == 401

    def test_sign_in_is_recorded_and_feed_is_newest_first(
        self, client: TestClient, make_user: UserFactory
    ) -> None:
        doctor = make_user(full_name="Dr. Priya Menon")
        login(client, doctor)
        client.post(
            "/api/v1/patients",
            json={
                "full_name": "New Patient",
                "age": 5,
                "gender": "male",
                "phone": "+91 90000 13131",
                "blood_group": "B+",
                "assigned_doctor_id": str(doctor.id),
            },
            headers=csrf(client),
        )

        feed = client.get("/api/v1/activities", params={"limit": 5}).json()

        assert [a["type"] for a in feed] == ["patient_added", "login"]
        assert feed[1]["description"] == "Dr. Priya Menon signed in"
        assert feed[0]["patient_id"] is not None

    def test_limit_is_capped(self, client: TestClient, make_user: UserFactory) -> None:
        login(client, make_user())
        assert client.get("/api/v1/activities", params={"limit": 101}).status_code == 422


class TestSeedDemo:
    def test_loads_the_sample_clinic_once(self, client: TestClient, db: Session) -> None:
        counts = seed_demo(db, TEST_PASSWORD)

        assert counts == {"doctors": 5, "patients": 12, "visits": 27}
        assert db.scalar(select(func.count()).select_from(Visit)) == 27
        admin = db.scalars(select(User).where(User.email == "ananya.rao@clinic.in")).one()
        assert admin.role == Role.ADMIN
        response = client.post(
            "/api/v1/auth/login", json={"email": admin.email, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        assert client.get("/api/v1/dashboard").json()["todays_visits"] >= 1

        with pytest.raises(SeedError, match="already has patients"):
            seed_demo(db, TEST_PASSWORD)
