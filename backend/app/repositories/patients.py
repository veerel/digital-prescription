import uuid
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

from sqlalchemy import Select, func, or_, select
from sqlalchemy.dialects.postgresql import distinct_on

from app.database.repository import MAX_PAGE_SIZE, BaseRepository
from app.models.patient import Patient
from app.models.visit import Visit


@dataclass(frozen=True)
class PatientWithStats:
    patient: Patient
    visit_count: int
    last_visit_at: datetime | None
    next_follow_up_date: date | None


def _digits(value: str) -> str:
    return "".join(ch for ch in value if ch.isdigit())


class PatientRepository(BaseRepository[Patient]):
    model = Patient

    def _with_stats(self) -> Select[Any]:
        stats = (
            select(
                Visit.patient_id,
                func.count().label("visit_count"),
                func.max(Visit.visited_at).label("last_visit_at"),
            )
            .group_by(Visit.patient_id)
            .subquery()
        )
        # The most recent visit per patient carries the current follow-up date.
        latest = (
            select(Visit.patient_id, Visit.follow_up_date)
            .ext(distinct_on(Visit.patient_id))
            .order_by(Visit.patient_id, Visit.visited_at.desc(), Visit.id.desc())
            .subquery()
        )
        return (
            select(
                Patient,
                func.coalesce(stats.c.visit_count, 0),
                stats.c.last_visit_at,
                latest.c.follow_up_date,
            )
            .outerjoin(stats, stats.c.patient_id == Patient.id)
            .outerjoin(latest, latest.c.patient_id == Patient.id)
        )

    @staticmethod
    def _filters(query: str | None, doctor_id: uuid.UUID | None) -> list[Any]:
        conditions: list[Any] = []
        if doctor_id is not None:
            conditions.append(Patient.assigned_doctor_id == doctor_id)
        if query:
            matches = [Patient.full_name.icontains(query, autoescape=True)]
            digits = _digits(query)
            if digits:
                # Match "90000 11122" against "+91 90000 11122" regardless of spacing.
                matches.append(
                    func.regexp_replace(Patient.phone, "[^0-9]", "", "g").contains(digits)
                )
            conditions.append(or_(*matches))
        return conditions

    def search(
        self,
        *,
        query: str | None,
        doctor_id: uuid.UUID | None,
        offset: int,
        limit: int,
    ) -> tuple[list[PatientWithStats], int]:
        conditions = self._filters(query, doctor_id)
        stmt = (
            self._with_stats()
            .where(*conditions)
            .order_by(Patient.full_name, Patient.id)
            .offset(max(0, offset))
            .limit(max(1, min(limit, MAX_PAGE_SIZE)))
        )
        rows = [PatientWithStats(*row) for row in self.session.execute(stmt).all()]
        return rows, self.count(select(Patient).where(*conditions))

    def get_with_stats(self, patient_id: uuid.UUID) -> PatientWithStats | None:
        row = self.session.execute(self._with_stats().where(Patient.id == patient_id)).first()
        return PatientWithStats(*row) if row else None
