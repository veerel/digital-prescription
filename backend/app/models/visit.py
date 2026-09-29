import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.patient import Patient
from app.models.user import User


class Visit(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """One consultation and the prescription written during it.

    Visits are part of the medical record, so they are never edited or
    deleted through the API: a correction is a new visit.
    """

    __tablename__ = "visits"
    __table_args__ = (
        # Patient history and "latest visit per patient" read newest-first.
        Index("ix_visits_patient_id_visited_at", "patient_id", "visited_at"),
    )

    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patients.id", ondelete="RESTRICT"))
    # The doctor who saw the patient and signed the prescription.
    doctor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    visited_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    # {"bp": "120/80", "temperature": "98.4°F", ...}; validated by schemas.visit.Vitals.
    vitals: Mapped[dict[str, str]] = mapped_column(JSONB, default=dict)
    complaints: Mapped[str | None] = mapped_column(Text)
    diagnosis: Mapped[str] = mapped_column(String(500))
    advice: Mapped[str | None] = mapped_column(Text)
    follow_up_date: Mapped[date | None] = mapped_column(Date, index=True)

    patient: Mapped[Patient] = relationship(lazy="joined")
    doctor: Mapped[User] = relationship(lazy="joined")
    medicines: Mapped[list["PrescriptionItem"]] = relationship(
        back_populates="visit",
        cascade="all, delete-orphan",
        order_by="PrescriptionItem.position",
        lazy="selectin",
    )


class PrescriptionItem(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """One medicine line on a prescription, kept in the order the doctor wrote it."""

    __tablename__ = "prescription_items"

    visit_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("visits.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int]
    name: Mapped[str] = mapped_column(String(200))
    dosage: Mapped[str | None] = mapped_column(String(100))
    frequency: Mapped[str | None] = mapped_column(String(100))
    duration: Mapped[str | None] = mapped_column(String(100))
    instructions: Mapped[str | None] = mapped_column(String(200))

    visit: Mapped[Visit] = relationship(back_populates="medicines")
