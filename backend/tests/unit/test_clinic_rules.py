from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.schemas.patient import PatientCreate
from app.schemas.visit import VisitCreate
from app.services.dashboard import categorize
from app.utils.time import local_day_range, local_day_start

IST = ZoneInfo("Asia/Kolkata")
DOCTOR_ID = "11111111-1111-1111-1111-111111111111"


class TestCategorize:
    @pytest.mark.parametrize(
        ("diagnosis", "label"),
        [
            ("Essential Hypertension", "Hypertension"),
            ("T2DM with Hypertension — improving control", "Hypertension"),  # first match wins
            ("Type 2 Diabetes Mellitus, newly diagnosed", "Diabetes"),
            ("Stable Angina, likely CAD", "Cardiac"),
            ("Upper Respiratory Tract Infection", "Infection / Fever"),
            ("Grade II Ankle Sprain (Left)", "Orthopedic"),
            ("Moderate Acne Vulgaris", "Skin"),
            ("Allergic Contact Dermatitis (Latex)", "Skin"),
            ("Healthy — normal growth for age", "Routine / Wellness"),
            ("Something else entirely", "Other"),
            ("Bpositive", "Other"),  # "bp" only as a whole word
        ],
    )
    def test_groups(self, diagnosis: str, label: str) -> None:
        assert categorize(diagnosis) == label


class TestClinicTime:
    def test_local_day_start_is_utc_instant(self) -> None:
        assert local_day_start(date(2026, 3, 10), IST) == datetime(2026, 3, 9, 18, 30, tzinfo=UTC)

    def test_day_range_is_half_open_and_inclusive_of_last_day(self) -> None:
        start, end = local_day_range(date(2026, 3, 1), date(2026, 3, 31), IST)
        assert start == datetime(2026, 2, 28, 18, 30, tzinfo=UTC)
        assert end == datetime(2026, 3, 31, 18, 30, tzinfo=UTC)

    def test_unknown_timezone_is_refused(self) -> None:
        with pytest.raises(ValidationError, match="CLINIC_TIMEZONE"):
            Settings(clinic_timezone="Mars/Olympus", _env_file=None)


def _patient(**overrides: object) -> PatientCreate:
    data: dict[str, object] = {
        "full_name": "A",
        "age": 3,
        "gender": "male",
        "phone": "+91 90000 11122",
        "blood_group": "O+",
        "assigned_doctor_id": DOCTOR_ID,
    }
    data.update(overrides)
    return PatientCreate.model_validate(data)


class TestPatientSchema:
    def test_trims_and_dedupes_allergies(self) -> None:
        assert _patient(allergies=[" Dust ", "dust", "Latex"]).allergies == ["Dust", "Latex"]

    def test_blank_address_is_none(self) -> None:
        assert _patient(address="   ").address is None

    @pytest.mark.parametrize("phone", ["12345", "phone", "+91 9000a", "--123456"])
    def test_rejects_bad_phone(self, phone: str) -> None:
        with pytest.raises(ValidationError):
            _patient(phone=phone)


class TestVisitSchema:
    def test_forbids_server_owned_fields(self) -> None:
        for field in ("doctor_id", "visited_at"):
            with pytest.raises(ValidationError):
                VisitCreate.model_validate(
                    {
                        "patient_id": DOCTOR_ID,
                        "diagnosis": "x",
                        "medicines": [{"name": "y"}],
                        field: "anything",
                    }
                )
