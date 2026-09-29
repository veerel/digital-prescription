"""create patients, visits, prescription items and activities

Revision ID: 7f2e4b8c6d10
Revises: 3c1d7e5a9b21
Create Date: 2026-09-28 10:05:00.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "7f2e4b8c6d10"
down_revision: str | None = "3c1d7e5a9b21"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _timestamps() -> list[sa.Column[object]]:
    return [
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    ]


def upgrade() -> None:
    op.create_table(
        "patients",
        sa.Column("patient_number", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("full_name", sa.String(length=200), nullable=False),
        sa.Column("age", sa.Integer(), nullable=False),
        sa.Column("gender", sa.String(length=10), nullable=False),
        sa.Column("phone", sa.String(length=30), nullable=False),
        sa.Column("address", sa.String(length=300), nullable=True),
        sa.Column("blood_group", sa.String(length=3), nullable=False),
        sa.Column("allergies", postgresql.ARRAY(sa.String(length=100)), nullable=False),
        sa.Column("assigned_doctor_id", sa.Uuid(), nullable=False),
        sa.Column("created_by_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["assigned_doctor_id"],
            ["users.id"],
            name=op.f("fk_patients_assigned_doctor_id_users"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_id"],
            ["users.id"],
            name=op.f("fk_patients_created_by_id_users"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_patients")),
        sa.UniqueConstraint("patient_number", name=op.f("uq_patients_patient_number")),
    )
    op.create_index(
        op.f("ix_patients_assigned_doctor_id"), "patients", ["assigned_doctor_id"], unique=False
    )
    op.create_index(op.f("ix_patients_full_name"), "patients", ["full_name"], unique=False)
    op.create_index(op.f("ix_patients_phone"), "patients", ["phone"], unique=False)

    op.create_table(
        "visits",
        sa.Column("patient_id", sa.Uuid(), nullable=False),
        sa.Column("doctor_id", sa.Uuid(), nullable=False),
        sa.Column(
            "visited_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("vitals", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("complaints", sa.Text(), nullable=True),
        sa.Column("diagnosis", sa.String(length=500), nullable=False),
        sa.Column("advice", sa.Text(), nullable=True),
        sa.Column("follow_up_date", sa.Date(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["doctor_id"], ["users.id"], name=op.f("fk_visits_doctor_id_users"), ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["patient_id"],
            ["patients.id"],
            name=op.f("fk_visits_patient_id_patients"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_visits")),
    )
    op.create_index(op.f("ix_visits_doctor_id"), "visits", ["doctor_id"], unique=False)
    op.create_index(op.f("ix_visits_follow_up_date"), "visits", ["follow_up_date"], unique=False)
    op.create_index(op.f("ix_visits_visited_at"), "visits", ["visited_at"], unique=False)
    op.create_index(
        "ix_visits_patient_id_visited_at", "visits", ["patient_id", "visited_at"], unique=False
    )

    op.create_table(
        "prescription_items",
        sa.Column("visit_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("dosage", sa.String(length=100), nullable=True),
        sa.Column("frequency", sa.String(length=100), nullable=True),
        sa.Column("duration", sa.String(length=100), nullable=True),
        sa.Column("instructions", sa.String(length=200), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["visit_id"],
            ["visits.id"],
            name=op.f("fk_prescription_items_visit_id_visits"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_prescription_items")),
    )
    op.create_index(
        op.f("ix_prescription_items_visit_id"), "prescription_items", ["visit_id"], unique=False
    )

    op.create_table(
        "activities",
        sa.Column("type", sa.String(length=30), nullable=False),
        sa.Column("actor_id", sa.Uuid(), nullable=False),
        sa.Column("patient_id", sa.Uuid(), nullable=True),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["actor_id"],
            ["users.id"],
            name=op.f("fk_activities_actor_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["patient_id"],
            ["patients.id"],
            name=op.f("fk_activities_patient_id_patients"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_activities")),
    )
    op.create_index(op.f("ix_activities_actor_id"), "activities", ["actor_id"], unique=False)
    op.create_index(op.f("ix_activities_patient_id"), "activities", ["patient_id"], unique=False)
    op.create_index("ix_activities_created_at", "activities", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_table("activities")
    op.drop_table("prescription_items")
    op.drop_table("visits")
    op.drop_table("patients")
