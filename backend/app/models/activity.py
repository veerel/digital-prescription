import uuid
from enum import StrEnum

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ActivityType(StrEnum):
    PRESCRIPTION = "prescription"
    PATIENT_ADDED = "patient_added"
    DOCTOR_ADDED = "doctor_added"
    LOGIN = "login"


class Activity(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Append-only audit trail shown in the dashboard's recent-activity feed.

    Written by services as a side effect of the action, in the same
    transaction, so an activity exists exactly when the action succeeded.
    """

    __tablename__ = "activities"
    __table_args__ = (Index("ix_activities_created_at", "created_at"),)  # feed reads newest first

    type: Mapped[str] = mapped_column(String(30))
    actor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    patient_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), index=True
    )
    description: Mapped[str] = mapped_column(String(500))
