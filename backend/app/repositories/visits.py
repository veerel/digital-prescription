import uuid
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

from sqlalchemy import Date, cast, distinct, func, or_, select
from sqlalchemy.dialects.postgresql import distinct_on

from app.database.repository import MAX_PAGE_SIZE, BaseRepository
from app.models.patient import Patient
from app.models.visit import Visit


@dataclass(frozen=True)
class VisitFilters:
    patient_id: uuid.UUID | None = None
    doctor_id: uuid.UUID | None = None
    query: str | None = None  # patient name or phone
    start: datetime | None = None  # inclusive, UTC
    end: datetime | None = None  # exclusive, UTC


class VisitRepository(BaseRepository[Visit]):
    model = Visit

    @staticmethod
    def _conditions(filters: VisitFilters) -> list[Any]:
        conditions: list[Any] = []
        if filters.patient_id is not None:
            conditions.append(Visit.patient_id == filters.patient_id)
        if filters.doctor_id is not None:
            conditions.append(Visit.doctor_id == filters.doctor_id)
        if filters.start is not None:
            conditions.append(Visit.visited_at >= filters.start)
        if filters.end is not None:
            conditions.append(Visit.visited_at < filters.end)
        if filters.query:
            matches = [Patient.full_name.icontains(filters.query, autoescape=True)]
            digits = "".join(ch for ch in filters.query if ch.isdigit())
            if digits:
                matches.append(
                    func.regexp_replace(Patient.phone, "[^0-9]", "", "g").contains(digits)
                )
            conditions.append(or_(*matches))
        return conditions

    def search(
        self, filters: VisitFilters, *, offset: int, limit: int
    ) -> tuple[list[Visit], int, int, int]:
        """Newest first. Returns (page, total visits, distinct patients, distinct doctors)."""
        conditions = self._conditions(filters)
        page = self.session.scalars(
            select(Visit)
            .join(Patient, Patient.id == Visit.patient_id)
            .where(*conditions)
            .order_by(Visit.visited_at.desc(), Visit.id.desc())
            .offset(max(0, offset))
            .limit(max(1, min(limit, MAX_PAGE_SIZE)))
        ).all()
        totals = self.session.execute(
            select(
                func.count(),
                func.count(distinct(Visit.patient_id)),
                func.count(distinct(Visit.doctor_id)),
            )
            .select_from(Visit)
            .join(Patient, Patient.id == Visit.patient_id)
            .where(*conditions)
        ).one()
        return list(page), int(totals[0]), int(totals[1]), int(totals[2])

    def count_between(self, start: datetime, end: datetime) -> int:
        return self.count(select(Visit).where(Visit.visited_at >= start, Visit.visited_at < end))

    def daily_counts(self, start: datetime, end: datetime, tz_name: str) -> dict[date, int]:
        """Visits per local calendar day in [start, end)."""
        local_day = cast(func.timezone(tz_name, Visit.visited_at), Date)
        rows = self.session.execute(
            select(local_day, func.count())
            .where(Visit.visited_at >= start, Visit.visited_at < end)
            .group_by(local_day)
        ).all()
        return {row[0]: int(row[1]) for row in rows}

    def diagnosis_counts(self) -> list[tuple[str, int]]:
        rows = self.session.execute(
            select(Visit.diagnosis, func.count()).group_by(Visit.diagnosis)
        ).all()
        return [(row[0], int(row[1])) for row in rows]

    def upcoming_follow_ups(self, first: date, last: date, limit: int) -> list[Visit]:
        """Each patient's most recent visit, if its follow-up falls in [first, last]."""
        latest_ids = (
            select(Visit.id)
            .ext(distinct_on(Visit.patient_id))
            .order_by(Visit.patient_id, Visit.visited_at.desc(), Visit.id.desc())
            .subquery()
        )
        return list(
            self.session.scalars(
                select(Visit)
                .where(
                    Visit.id.in_(select(latest_ids.c.id)),
                    Visit.follow_up_date >= first,
                    Visit.follow_up_date <= last,
                )
                .order_by(Visit.follow_up_date, Visit.id)
                .limit(limit)
            ).all()
        )
