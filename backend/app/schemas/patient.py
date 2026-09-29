import uuid
from datetime import date, datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints

from app.models.patient import BloodGroup, Gender
from app.schemas.common import Name, OptionalText300, Phone
from app.schemas.doctor import DoctorBrief

MAX_ALLERGIES = 20

Allergy = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


def _dedupe(values: list[str]) -> list[str]:
    """Drop repeats case-insensitively, keeping the first spelling and the order."""
    seen: set[str] = set()
    result = []
    for value in values:
        if value.casefold() not in seen:
            seen.add(value.casefold())
            result.append(value)
    return result


Allergies = Annotated[list[Allergy], Field(max_length=MAX_ALLERGIES), AfterValidator(_dedupe)]
Age = Annotated[int, Field(ge=0, le=130)]


class PatientCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: Name
    age: Age
    gender: Gender
    phone: Phone
    address: OptionalText300 = None
    blood_group: BloodGroup
    allergies: Allergies = []
    assigned_doctor_id: uuid.UUID


class PatientUpdate(BaseModel):
    """Only the fields sent are changed."""

    model_config = ConfigDict(extra="forbid")

    full_name: Name | None = None
    age: Age | None = None
    gender: Gender | None = None
    phone: Phone | None = None
    address: OptionalText300 = None
    blood_group: BloodGroup | None = None
    allergies: Allergies | None = None
    assigned_doctor_id: uuid.UUID | None = None


class PatientBrief(BaseModel):
    """The patient details embedded in visits and printed prescriptions."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_number: int
    full_name: str
    age: int
    gender: Gender
    phone: str
    blood_group: BloodGroup
    allergies: list[str]


class PatientRead(PatientBrief):
    address: str | None
    assigned_doctor: DoctorBrief
    created_at: datetime
    # Computed from the patient's visits, not stored on the patient.
    visit_count: int
    last_visit_at: datetime | None
    # The follow-up date set on the most recent visit, if any.
    next_follow_up_date: date | None
