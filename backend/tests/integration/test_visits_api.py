"""Visits/prescriptions: any doctor can prescribe for any patient, always as
themselves; visits are read-only medical records."""

from collections.abc import Callable
from datetime import UTC, date, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity import Activity, ActivityType
from app.models.patient import Patient
from app.models.user import User
from app.models.visit import Visit
from app.utils.time import utcnow
from tests.conftest import csrf, login

API = "/api/v1/visits"

UserFactory = Callable[..., User]
PatientFactory = Callable[..., Patient]
VisitFactory = Callable[..., Visit]


@pytest.fixture
def doctor(make_user: UserFactory) -> User:
    return make_user(full_name="Dr. Vikram Shah")


@pytest.fixture
def patient(make_user: UserFactory, make_patient: PatientFactory) -> Patient:
    # Assigned to a different doctor: prescribing isn't limited to the assigned doctor.
    return make_patient(make_user(), full_name="Meena Iyer", allergies=["Penicillin"])


def _payload(patient: Patient, **overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "patient_id": str(patient.id),
        "vitals": {"bp": "118/76", "temperature": "100.8°F", "pulse": "", "spo2": " 97% "},
        "complaints": "Fever with body ache for 2 days.",
        "diagnosis": "Viral Fever",
        "medicines": [
            {
                "name": "Paracetamol 500mg",
                "dosage": "1-1-1",
                "frequency": "Three times daily",
                "duration": "4 days",
                "instructions": "After food",
            },
            {"name": "ORS Powder", "dosage": "", "frequency": "As needed"},
        ],
        "advice": "Plenty of fluids.",
        "follow_up_date": (date.today() + timedelta(days=5)).isoformat(),
    }
    payload.update(overrides)
    return payload


class TestCreateVisit:
    def test_doctor_writes_prescription_as_themselves(
        self, client: TestClient, doctor: User, patient: Patient, db: Session
    ) -> None:
        login(client, doctor)

        response = client.post(API, json=_payload(patient), headers=csrf(client))

        assert response.status_code == 201
        body = response.json()
        assert body["doctor"]["id"] == str(doctor.id)
        assert body["patient"]["allergies"] == ["Penicillin"]
        assert [m["name"] for m in body["medicines"]] == ["Paracetamol 500mg", "ORS Powder"]
        assert body["medicines"][1]["dosage"] is None  # blank field stored as "not given"
        assert body["vitals"] == {
            "bp": "118/76",
            "temperature": "100.8°F",
            "pulse": None,
            "weight": None,
            "spo2": "97%",
        }
        activity = db.scalars(
            select(Activity).where(Activity.type == ActivityType.PRESCRIPTION)
        ).one()
        assert activity.description == (
            "Dr. Vikram Shah created a prescription for Meena Iyer — Viral Fever"
        )

    def test_client_cannot_choose_the_prescribing_doctor(
        self, client: TestClient, doctor: User, patient: Patient, make_user: UserFactory
    ) -> None:
        login(client, doctor)
        payload = _payload(patient, doctor_id=str(make_user().id))
        assert client.post(API, json=payload, headers=csrf(client)).status_code == 422

    def test_client_cannot_backdate_a_visit(
        self, client: TestClient, doctor: User, patient: Patient
    ) -> None:
        login(client, doctor)
        payload = _payload(patient, visited_at="2020-01-01T00:00:00Z")
        assert client.post(API, json=payload, headers=csrf(client)).status_code == 422

    @pytest.mark.parametrize(
        "overrides",
        [
            {"diagnosis": " "},
            {"medicines": []},
            {"medicines": [{"name": ""}]},
            {"medicines": [{"name": "X"}] * 31},
            {"vitals": {"height": "170cm"}},
            {"vitals": {"bp": "x" * 21}},
        ],
    )
    def test_invalid_input_is_422(
        self, client: TestClient, doctor: User, patient: Patient, overrides: dict[str, Any]
    ) -> None:
        login(client, doctor)
        response = client.post(API, json=_payload(patient, **overrides), headers=csrf(client))
        assert response.status_code == 422

    def test_follow_up_cannot_be_in_the_past(
        self, client: TestClient, doctor: User, patient: Patient
    ) -> None:
        login(client, doctor)
        yesterday = (date.today() - timedelta(days=2)).isoformat()
        response = client.post(
            API, json=_payload(patient, follow_up_date=yesterday), headers=csrf(client)
        )
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "business_rule_violation"

    def test_unknown_patient_is_404(
        self, client: TestClient, doctor: User, patient: Patient
    ) -> None:
        login(client, doctor)
        payload = _payload(patient, patient_id="00000000-0000-0000-0000-000000000000")
        assert client.post(API, json=payload, headers=csrf(client)).status_code == 404

    def test_anonymous_is_rejected(self, client: TestClient, patient: Patient) -> None:
        assert client.post(API, json=_payload(patient)).status_code in (401, 403)

    def test_visits_cannot_be_edited_or_deleted(
        self,
        client: TestClient,
        doctor: User,
        patient: Patient,
        make_visit: VisitFactory,
    ) -> None:
        visit = make_visit(patient, doctor)
        login(client, doctor)
        assert client.patch(f"{API}/{visit.id}", json={}, headers=csrf(client)).status_code == 405
        assert client.delete(f"{API}/{visit.id}", headers=csrf(client)).status_code == 405


class TestListVisits:
    def test_anonymous_gets_401(self, client: TestClient) -> None:
        assert client.get(API).status_code == 401

    def test_newest_first_with_totals(
        self,
        client: TestClient,
        doctor: User,
        patient: Patient,
        make_user: UserFactory,
        make_patient: PatientFactory,
        make_visit: VisitFactory,
    ) -> None:
        other_doctor = make_user()
        old = make_visit(patient, doctor, visited_at=utcnow() - timedelta(days=3))
        new = make_visit(make_patient(doctor), other_doctor)
        make_visit(patient, doctor, visited_at=utcnow() - timedelta(days=1))
        login(client, doctor)

        body = client.get(API, params={"limit": 2}).json()

        assert body["items"][0]["id"] == str(new.id)
        assert str(old.id) not in [v["id"] for v in body["items"]]
        assert body["total"] == 3
        assert body["patient_count"] == 2
        assert body["doctor_count"] == 2

    def test_filters_by_patient_doctor_and_search(
        self,
        client: TestClient,
        doctor: User,
        patient: Patient,
        make_user: UserFactory,
        make_patient: PatientFactory,
        make_visit: VisitFactory,
    ) -> None:
        other_doctor = make_user()
        mine = make_visit(patient, doctor)
        make_visit(make_patient(other_doctor, full_name="Ramesh Kumar"), other_doctor)
        login(client, doctor)

        def ids(**params: str) -> list[str]:
            return [v["id"] for v in client.get(API, params=params).json()["items"]]

        assert ids(patient_id=str(patient.id)) == [str(mine.id)]
        assert ids(doctor_id=str(doctor.id)) == [str(mine.id)]
        assert ids(q="meena") == [str(mine.id)]

    def test_date_range_uses_the_clinic_timezone(
        self,
        client: TestClient,
        doctor: User,
        patient: Patient,
        make_visit: VisitFactory,
    ) -> None:
        day = date(2026, 3, 10)
        # 19:00 UTC on the 9th is 00:30 on the 10th in India (UTC+05:30).
        inside = make_visit(patient, doctor, visited_at=datetime(2026, 3, 9, 19, 0, tzinfo=UTC))
        # 19:00 UTC on the 10th is already the 11th in India.
        make_visit(patient, doctor, visited_at=datetime(2026, 3, 10, 19, 0, tzinfo=UTC))
        login(client, doctor)

        body = client.get(
            API, params={"date_from": day.isoformat(), "date_to": day.isoformat()}
        ).json()

        assert [v["id"] for v in body["items"]] == [str(inside.id)]

    def test_reversed_date_range_is_422(self, client: TestClient, doctor: User) -> None:
        login(client, doctor)
        response = client.get(API, params={"date_from": "2026-03-10", "date_to": "2026-03-01"})
        assert response.status_code == 422


class TestGetVisit:
    def test_any_doctor_can_open_a_prescription(
        self,
        client: TestClient,
        patient: Patient,
        make_user: UserFactory,
        make_visit: VisitFactory,
    ) -> None:
        author = make_user(full_name="Dr. Author")
        visit = make_visit(patient, author)
        login(client, make_user())

        response = client.get(f"{API}/{visit.id}")

        assert response.status_code == 200
        body = response.json()
        assert body["doctor"]["full_name"] == "Dr. Author"
        assert body["patient"]["patient_number"] == patient.patient_number
        assert "password_hash" not in response.text
        assert "email" not in body["doctor"]

    def test_unknown_visit_is_404(self, client: TestClient, doctor: User) -> None:
        login(client, doctor)
        assert client.get(f"{API}/00000000-0000-0000-0000-000000000000").status_code == 404

    def test_anonymous_gets_401(
        self, client: TestClient, doctor: User, patient: Patient, make_visit: VisitFactory
    ) -> None:
        assert client.get(f"{API}/{make_visit(patient, doctor).id}").status_code == 401
