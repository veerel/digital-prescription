import uuid
from enum import StrEnum

from sqlalchemy import ForeignKey, Identity, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.user import User


class Gender(StrEnum):
    FEMALE = "female"
    MALE = "male"
    OTHER = "other"


class BloodGroup(StrEnum):
    O_POS = "O+"
    O_NEG = "O-"
    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"


class Patient(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A registered patient. Records are shared by every doctor at the clinic."""

    __tablename__ = "patients"

    # Short, human-friendly number printed on prescriptions (the UUID stays the API id).
    patient_number: Mapped[int] = mapped_column(Integer, Identity(), unique=True)
    full_name: Mapped[str] = mapped_column(String(200), index=True)
    age: Mapped[int]
    gender: Mapped[str] = mapped_column(String(10))
    phone: Mapped[str] = mapped_column(String(30), index=True)
    address: Mapped[str | None] = mapped_column(String(300))
    blood_group: Mapped[str] = mapped_column(String(3))
    allergies: Mapped[list[str]] = mapped_column(ARRAY(String(100)), default=list)

    # The doctor who currently looks after the patient.
    assigned_doctor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))

    assigned_doctor: Mapped[User] = relationship(foreign_keys=[assigned_doctor_id], lazy="joined")
