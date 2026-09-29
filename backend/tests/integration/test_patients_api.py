"""Patients: every doctor shares the clinic's records; only the assigned
doctor or an admin may edit one."""

from collections.abc import Callable
from datetime import timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity import Activity, ActivityType
from app.models.patient import Patient
from app.models.user import Role, User
from app.models.visit import Visit
from app.utils.time import utcnow
from tests.conftest import csrf, login

API = "/api/v1/patients"

UserFactory = Callable[..., User]
PatientFactory = Callable[..., Patient]
VisitFactory = Callable[..., Visit]


@pytest.fixture
def doctor(make_user: UserFactory) -> User:
    return make_user(full_name="Dr. Asha Menon")


@pytest.fixture
def other_doctor(make_user: UserFactory) -> User:
    return make_user(full_name="Dr. Other")


def _payload(doctor: User, **overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "full_name": "Sundari Raman",
        "age": 34,
        "gender": "female",
        "phone": "+91 90000 00001",
        "address": "Adyar, Chennai",
        "blood_group": "B+",
        "allergies": ["Penicillin", "Dust"],
        "assigned_doctor_id": str(doctor.id),
    }
    payload.update(overrides)
    return payload


class TestListPatients:
    def test_anonymous_gets_401(self, client: TestClient) -> None:
        assert client.get(API).status_code == 401

    def test_doctor_sees_every_doctors_patients(
        self,
        client: TestClient,
        doctor: User,
        other_doctor: User,
        make_patient: PatientFactory,
    ) -> None:
        make_patient(doctor, full_name="Mine")
        make_patient(other_doctor, full_name="Theirs")
        login(client, doctor)

        body = client.get(API).json()

        assert body["total"] == 2
        assert [p["full_name"] for p in body["items"]] == ["Mine", "Theirs"]  # sorted by name
        assert body["items"][1]["assigned_doctor"]["full_name"] == "Dr. Other"

    def test_search_by_name_is_case_insensitive(
        self, client: TestClient, doctor: User, make_patient: PatientFactory
    ) -> None:
        make_patient(doctor, full_name="Fathima Begum")
        make_patient(doctor, full_name="Suresh Babu")
        login(client, doctor)

        items = client.get(API, params={"q": "fATH"}).json()["items"]

        assert [p["full_name"] for p in items] == ["Fathima Begum"]

    def test_search_by_phone_ignores_spacing(
        self, client: TestClient, doctor: User, make_patient: PatientFactory
    ) -> None:
        make_patient(doctor, full_name="A", phone="+91 90000 11122")
        make_patient(doctor, full_name="B", phone="+91 80000 33344")
        login(client, doctor)

        items = client.get(API, params={"q": "0000111"}).json()["items"]

        assert [p["full_name"] for p in items] == ["A"]

    def test_like_wildcards_are_literal(
        self, client: TestClient, doctor: User, make_patient: PatientFactory
    ) -> None:
        make_patient(doctor, full_name="Anyone")
        login(client, doctor)
        assert client.get(API, params={"q": "%"}).json()["total"] == 0

    def test_filter_by_assigned_doctor(
        self,
        client: TestClient,
        doctor: User,
        other_doctor: User,
        make_patient: PatientFactory,
    ) -> None:
        make_patient(doctor, full_name="Mine")
        make_patient(other_doctor, full_name="Theirs")
        login(client, doctor)

        items = client.get(API, params={"doctor_id": str(other_doctor.id)}).json()["items"]

        assert [p["full_name"] for p in items] == ["Theirs"]

    def test_includes_visit_stats_from_latest_visit(
        self,
        client: TestClient,
        doctor: User,
        make_patient: PatientFactory,
        make_visit: VisitFactory,
    ) -> None:
        patient = make_patient(doctor)
        make_patient(doctor, full_name="Zed, never visited")
        today = utcnow().date()
        make_visit(
            patient,
            doctor,
            visited_at=utcnow() - timedelta(days=10),
            follow_up_date=today + timedelta(days=30),
        )
        latest = make_visit(patient, doctor, follow_up_date=today + timedelta(days=2))
        login(client, doctor)

        seen, unseen = client.get(API).json()["items"]

        assert seen["visit_count"] == 2
        assert seen["next_follow_up_date"] == latest.follow_up_date.isoformat()  # type: ignore[union-attr]
        assert seen["last_visit_at"] is not None
        assert unseen["visit_count"] == 0
        assert unseen["last_visit_at"] is None

    def test_limit_is_capped(self, client: TestClient, doctor: User) -> None:
        login(client, doctor)
        assert client.get(API, params={"limit": 1000}).status_code == 422


class TestCreatePatient:
    def test_doctor_registers_patient(
        self, client: TestClient, doctor: User, other_doctor: User, db: Session
    ) -> None:
        login(client, doctor)

        response = client.post(API, json=_payload(other_doctor), headers=csrf(client))

        assert response.status_code == 201
        body = response.json()
        assert body["patient_number"] > 0
        assert body["assigned_doctor"]["id"] == str(other_doctor.id)
        assert body["allergies"] == ["Penicillin", "Dust"]
        assert body["visit_count"] == 0
        activity = db.scalars(select(Activity).where(Activity.patient_id == body["id"])).one()
        assert activity.type == ActivityType.PATIENT_ADDED
        assert activity.actor_id == doctor.id
        assert activity.description == "Dr. Asha Menon registered new patient Sundari Raman"

    def test_patient_numbers_increase(self, client: TestClient, doctor: User) -> None:
        login(client, doctor)
        first = client.post(API, json=_payload(doctor), headers=csrf(client)).json()
        second = client.post(API, json=_payload(doctor), headers=csrf(client)).json()
        assert second["patient_number"] > first["patient_number"]

    def test_anonymous_gets_401(self, client: TestClient, doctor: User) -> None:
        assert client.post(API, json=_payload(doctor)).status_code in (401, 403)

    def test_missing_csrf_is_rejected(self, client: TestClient, doctor: User) -> None:
        login(client, doctor)
        assert client.post(API, json=_payload(doctor)).status_code == 403

    @pytest.mark.parametrize(
        "overrides",
        [
            {"full_name": "  "},
            {"age": -1},
            {"age": 131},
            {"gender": "unknown"},
            {"phone": "call me"},
            {"blood_group": "C+"},
            {"allergies": ["x"] * 21},
            {"created_by_id": "00000000-0000-0000-0000-000000000000"},
        ],
    )
    def test_invalid_input_is_422(
        self, client: TestClient, doctor: User, overrides: dict[str, Any]
    ) -> None:
        login(client, doctor)
        response = client.post(API, json=_payload(doctor, **overrides), headers=csrf(client))
        assert response.status_code == 422

    def test_cannot_assign_to_inactive_doctor(
        self, client: TestClient, doctor: User, make_user: UserFactory
    ) -> None:
        inactive = make_user(is_active=False)
        login(client, doctor)
        response = client.post(API, json=_payload(inactive), headers=csrf(client))
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "business_rule_violation"

    def test_cannot_assign_to_unknown_doctor(self, client: TestClient, doctor: User) -> None:
        login(client, doctor)
        payload = _payload(doctor, assigned_doctor_id="00000000-0000-0000-0000-000000000000")
        assert client.post(API, json=payload, headers=csrf(client)).status_code == 422


class TestGetPatient:
    def test_any_doctor_can_read_any_patient(
        self,
        client: TestClient,
        doctor: User,
        other_doctor: User,
        make_patient: PatientFactory,
    ) -> None:
        patient = make_patient(other_doctor)
        login(client, doctor)

        response = client.get(f"{API}/{patient.id}")

        assert response.status_code == 200
        assert response.json()["full_name"] == patient.full_name

    def test_unknown_patient_is_404(self, client: TestClient, doctor: User) -> None:
        login(client, doctor)
        response = client.get(f"{API}/00000000-0000-0000-0000-000000000000")
        assert response.status_code == 404

    def test_invalid_id_is_422(self, client: TestClient, doctor: User) -> None:
        login(client, doctor)
        assert client.get(f"{API}/not-a-uuid").status_code == 422

    def test_anonymous_gets_401(
        self, client: TestClient, doctor: User, make_patient: PatientFactory
    ) -> None:
        assert client.get(f"{API}/{make_patient(doctor).id}").status_code == 401


class TestUpdatePatient:
    def test_assigned_doctor_can_edit(
        self, client: TestClient, doctor: User, make_patient: PatientFactory
    ) -> None:
        patient = make_patient(doctor)
        login(client, doctor)

        response = client.patch(
            f"{API}/{patient.id}", json={"allergies": ["Latex"], "age": 41}, headers=csrf(client)
        )

        assert response.status_code == 200
        assert response.json()["allergies"] == ["Latex"]
        assert response.json()["age"] == 41

    def test_other_doctor_cannot_edit(
        self,
        client: TestClient,
        doctor: User,
        other_doctor: User,
        make_patient: PatientFactory,
    ) -> None:
        patient = make_patient(other_doctor)
        login(client, doctor)
        response = client.patch(f"{API}/{patient.id}", json={"age": 1}, headers=csrf(client))
        assert response.status_code == 403

    def test_admin_can_reassign(
        self,
        client: TestClient,
        doctor: User,
        other_doctor: User,
        make_user: UserFactory,
        make_patient: PatientFactory,
    ) -> None:
        patient = make_patient(doctor)
        login(client, make_user(role=Role.ADMIN))

        response = client.patch(
            f"{API}/{patient.id}",
            json={"assigned_doctor_id": str(other_doctor.id)},
            headers=csrf(client),
        )

        assert response.status_code == 200
        assert response.json()["assigned_doctor"]["id"] == str(other_doctor.id)

    @pytest.mark.parametrize(
        "body", [{"full_name": None}, {"assigned_doctor_id": None}, {"allergies": None}]
    )
    def test_required_fields_cannot_be_cleared(
        self,
        client: TestClient,
        doctor: User,
        make_patient: PatientFactory,
        body: dict[str, Any],
    ) -> None:
        patient = make_patient(doctor)
        login(client, doctor)
        response = client.patch(f"{API}/{patient.id}", json=body, headers=csrf(client))
        assert response.status_code == 422

    def test_cannot_reassign_to_inactive_doctor(
        self,
        client: TestClient,
        doctor: User,
        make_user: UserFactory,
        make_patient: PatientFactory,
    ) -> None:
        patient = make_patient(doctor)
        inactive = make_user(is_active=False)
        login(client, doctor)
        response = client.patch(
            f"{API}/{patient.id}",
            json={"assigned_doctor_id": str(inactive.id)},
            headers=csrf(client),
        )
        assert response.status_code == 422

    def test_unknown_patient_is_404(self, client: TestClient, doctor: User) -> None:
        login(client, doctor)
        response = client.patch(
            f"{API}/00000000-0000-0000-0000-000000000000", json={"age": 1}, headers=csrf(client)
        )
        assert response.status_code == 404

    def test_unknown_fields_rejected(
        self, client: TestClient, doctor: User, make_patient: PatientFactory
    ) -> None:
        patient = make_patient(doctor)
        login(client, doctor)
        response = client.patch(
            f"{API}/{patient.id}", json={"patient_number": 1}, headers=csrf(client)
        )
        assert response.status_code == 422
