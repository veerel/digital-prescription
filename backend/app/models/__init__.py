"""Import every model here so Alembic autogenerate can see all tables."""

from app.models.activity import Activity, ActivityType
from app.models.patient import BloodGroup, Gender, Patient
from app.models.refresh_token import RefreshToken
from app.models.user import Role, User
from app.models.visit import PrescriptionItem, Visit

__all__ = [
    "Activity",
    "ActivityType",
    "BloodGroup",
    "Gender",
    "Patient",
    "PrescriptionItem",
    "RefreshToken",
    "Role",
    "User",
    "Visit",
]
