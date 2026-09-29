from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

DEFAULT_ACCENT_COLOR = "#14b8a6"


class Role(StrEnum):
    ADMIN = "admin"  # a doctor who can also manage the care team
    DOCTOR = "doctor"


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A login account. Every account belongs to a doctor at the clinic."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(200))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default=Role.DOCTOR)
    is_active: Mapped[bool] = mapped_column(default=True)

    # Doctor profile: printed on the prescription pad and shown in the directory.
    specialization: Mapped[str | None] = mapped_column(String(100))
    qualification: Mapped[str | None] = mapped_column(String(200))
    registration_number: Mapped[str | None] = mapped_column(String(50))
    phone: Mapped[str | None] = mapped_column(String(30))
    accent_color: Mapped[str] = mapped_column(
        String(7), default=DEFAULT_ACCENT_COLOR, server_default=DEFAULT_ACCENT_COLOR
    )

    # Bumped on password change / forced logout; access tokens carrying an
    # older version are rejected immediately instead of living until expiry.
    token_version: Mapped[int] = mapped_column(default=0)

    failed_login_attempts: Mapped[int] = mapped_column(default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
