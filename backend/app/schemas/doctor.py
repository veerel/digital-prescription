import uuid

from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserRead


class DoctorBrief(BaseModel):
    """The doctor details embedded in patients, visits and printed prescriptions."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    specialization: str | None
    qualification: str | None
    registration_number: str | None
    accent_color: str


class DoctorRead(UserRead):
    """A care-team directory entry: the doctor's profile plus workload counts."""

    patient_count: int
    prescription_count: int
