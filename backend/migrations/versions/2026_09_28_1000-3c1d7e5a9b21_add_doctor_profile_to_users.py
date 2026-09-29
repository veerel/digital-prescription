"""add doctor profile to users

Every account is a doctor. The template's "user" role becomes "doctor".

Revision ID: 3c1d7e5a9b21
Revises: a9f4fbf6a67f
Create Date: 2026-09-28 10:00:00.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "3c1d7e5a9b21"
down_revision: str | None = "a9f4fbf6a67f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

users = sa.table("users", sa.column("role", sa.String))


def upgrade() -> None:
    op.add_column("users", sa.Column("specialization", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("qualification", sa.String(length=200), nullable=True))
    op.add_column("users", sa.Column("registration_number", sa.String(length=50), nullable=True))
    op.add_column("users", sa.Column("phone", sa.String(length=30), nullable=True))
    op.add_column(
        "users",
        sa.Column("accent_color", sa.String(length=7), server_default="#14b8a6", nullable=False),
    )
    op.execute(users.update().where(users.c.role == "user").values(role="doctor"))


def downgrade() -> None:
    op.execute(users.update().where(users.c.role == "doctor").values(role="user"))
    op.drop_column("users", "accent_color")
    op.drop_column("users", "phone")
    op.drop_column("users", "registration_number")
    op.drop_column("users", "qualification")
    op.drop_column("users", "specialization")
