"""Visits (consultations) and the prescriptions written in them.

Authorization rules:
- Any active doctor can read the visit log and any patient's history.
- Any active doctor can write a prescription for any patient. The
  prescribing doctor is always the logged-in user; it can't be chosen.
- Visits are medical records: there is no edit or delete.
"""

import uuid
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import BusinessRuleError, NotFoundError
from app.models.activity import ActivityType
from app.models.user import User
from app.models.visit import PrescriptionItem, Visit
from app.repositories.activities import ActivityRepository
from app.repositories.patients import PatientRepository
from app.repositories.visits import VisitFilters, VisitRepository
from app.schemas.visit import VisitCreate, VisitPage, VisitRead
from app.utils.time import local_day_start, local_today, utcnow

VISIT_NOT_FOUND = "Visit not found"


class VisitService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.visits = VisitRepository(db)
        self.patients = PatientRepository(db)
        self.activities = ActivityRepository(db)
        self.tz = get_settings().clinic_tz

    def list_visits(
        self,
        _actor: User,
        *,
        patient_id: uuid.UUID | None = None,
        doctor_id: uuid.UUID | None = None,
        query: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> VisitPage:
        """`date_from`/`date_to` are inclusive calendar days in the clinic's timezone."""
        if date_from and date_to and date_from > date_to:
            raise BusinessRuleError("The start date must be on or before the end date")
        filters = VisitFilters(
            patient_id=patient_id,
            doctor_id=doctor_id,
            query=query.strip() if query and query.strip() else None,
            start=local_day_start(date_from, self.tz) if date_from else None,
            end=local_day_start(date_to + timedelta(days=1), self.tz) if date_to else None,
        )
        items, total, patient_count, doctor_count = self.visits.search(
            filters, offset=offset, limit=limit
        )
        return VisitPage(
            items=[VisitRead.model_validate(v) for v in items],
            total=total,
            offset=offset,
            limit=limit,
            patient_count=patient_count,
            doctor_count=doctor_count,
        )

    def get_visit(self, _actor: User, visit_id: uuid.UUID) -> Visit:
        visit = self.visits.get(visit_id)
        if visit is None:
            raise NotFoundError(VISIT_NOT_FOUND)
        return visit

    def create_visit(self, actor: User, data: VisitCreate) -> Visit:
        patient = self.patients.get(data.patient_id)
        if patient is None:
            raise NotFoundError("Patient not found")
        if data.follow_up_date and data.follow_up_date < local_today(self.tz):
            raise BusinessRuleError("The follow-up date cannot be in the past")

        visit = self.visits.add(
            Visit(
                patient_id=patient.id,
                doctor_id=actor.id,
                visited_at=utcnow(),
                vitals=data.vitals.model_dump(exclude_none=True),
                complaints=data.complaints,
                diagnosis=data.diagnosis,
                advice=data.advice,
                follow_up_date=data.follow_up_date,
                medicines=[
                    PrescriptionItem(position=i, **medicine.model_dump())
                    for i, medicine in enumerate(data.medicines)
                ],
            )
        )
        self.activities.record(
            ActivityType.PRESCRIPTION,
            actor_id=actor.id,
            patient_id=patient.id,
            description=(
                f"{actor.full_name} created a prescription for {patient.full_name}"
                f" — {data.diagnosis}"
            ),
        )
        self.db.commit()
        return visit
