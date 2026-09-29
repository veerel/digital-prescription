import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.user import DEFAULT_ACCENT_COLOR, Role
from app.schemas.common import (
    Email,
    HexColor,
    OptionalPhone,
    OptionalText50,
    OptionalText100,
    OptionalText200,
    Password,
)


class UserRead(BaseModel):
    """What the API returns. Never includes password_hash or lockout fields."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    role: Role
    is_active: bool
    specialization: str | None
    qualification: str | None
    registration_number: str | None
    phone: str | None
    accent_color: str
    created_at: datetime


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: Email
    full_name: str = Field(min_length=1, max_length=200)
    password: Password
    role: Role = Role.DOCTOR
    specialization: OptionalText100 = None
    qualification: OptionalText200 = None
    registration_number: OptionalText50 = None
    phone: OptionalPhone = None
    accent_color: HexColor = DEFAULT_ACCENT_COLOR


class UserUpdate(BaseModel):
    """All fields optional; only the fields sent are changed.

    `extra="forbid"` rejects unknown fields, so a client can't slip in
    something like `password_hash` or `token_version`.
    """

    model_config = ConfigDict(extra="forbid")

    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    role: Role | None = None
    is_active: bool | None = None
    specialization: OptionalText100 = None
    qualification: OptionalText200 = None
    registration_number: OptionalText50 = None
    phone: OptionalPhone = None
    accent_color: HexColor | None = None
