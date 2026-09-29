import uuid
from datetime import date, datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.schemas.common import (
    OptionalText20,
    OptionalText100,
    OptionalText200,
    OptionalText2000,
    Page,
)
from app.schemas.doctor import DoctorBrief
from app.schemas.patient import PatientBrief

MAX_MEDICINES = 30

Diagnosis = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
MedicineName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]


class Vitals(BaseModel):
    """Free text, as doctors write them ("120/80", "98.4°F", "62kg"). All optional."""

    model_config = ConfigDict(extra="forbid")

    bp: OptionalText20 = None
    temperature: OptionalText20 = None
    pulse: OptionalText20 = None
    weight: OptionalText20 = None
    spo2: OptionalText20 = None


class MedicineCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: MedicineName
    dosage: OptionalText100 = None
    frequency: OptionalText100 = None
    duration: OptionalText100 = None
    instructions: OptionalText200 = None


class MedicineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    dosage: str | None
    frequency: str | None
    duration: str | None
    instructions: str | None


class VisitCreate(BaseModel):
    """A new consultation. The prescribing doctor is always the logged-in user
    and the visit time is set by the server, so neither can be sent."""

    model_config = ConfigDict(extra="forbid")

    patient_id: uuid.UUID
    vitals: Vitals = Vitals()
    complaints: OptionalText2000 = None
    diagnosis: Diagnosis
    medicines: list[MedicineCreate] = Field(min_length=1, max_length=MAX_MEDICINES)
    advice: OptionalText2000 = None
    follow_up_date: date | None = None


class VisitRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    visited_at: datetime
    vitals: Vitals
    complaints: str | None
    diagnosis: str
    advice: str | None
    follow_up_date: date | None
    medicines: list[MedicineRead]
    patient: PatientBrief
    doctor: DoctorBrief


class VisitPage(Page[VisitRead]):
    """A page of the visit log, plus totals across every matching visit."""

    patient_count: int
    doctor_count: int
