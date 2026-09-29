"""Clinic-wide dashboard numbers. Visible to every active doctor.

All "today"/"this month"/"this week" boundaries are calendar days in the
clinic's timezone (CLINIC_TIMEZONE), not UTC.
"""

import re
from collections import Counter
from datetime import timedelta

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.user import User
from app.repositories.patients import PatientRepository
from app.repositories.users import UserRepository
from app.repositories.visits import VisitRepository
from app.schemas.dashboard import (
    DailyVisits,
    DashboardSummary,
    DiagnosisCount,
    FollowUp,
    FollowUpPatient,
)
from app.schemas.doctor import DoctorBrief
from app.utils.time import local_day_range, local_day_start, local_today

TREND_DAYS = 7
FOLLOW_UP_DAYS = 14
TOP_DIAGNOSES = 5
MAX_FOLLOW_UPS = 5

# First match wins, so more specific groups come first.
DIAGNOSIS_GROUPS: list[tuple[str, re.Pattern[str]]] = [
    ("Hypertension", re.compile(r"hypertension|\bbp\b", re.IGNORECASE)),
    ("Diabetes", re.compile(r"diabet|t2dm", re.IGNORECASE)),
    ("Cardiac", re.compile(r"angina|cardiac|\bcad\b|ischemic|heart|palpitation", re.IGNORECASE)),
    ("Infection / Fever", re.compile(r"fever|infection|\buri\b|viral|cold", re.IGNORECASE)),
    ("Orthopedic", re.compile(r"sprain|back pain|orthop|fracture", re.IGNORECASE)),
    ("Skin", re.compile(r"acne|dermatitis|skin", re.IGNORECASE)),
    ("Allergy", re.compile(r"allerg", re.IGNORECASE)),
    ("Routine / Wellness", re.compile(r"healthy|routine|growth|wellness", re.IGNORECASE)),
]


def categorize(diagnosis: str) -> str:
    for label, pattern in DIAGNOSIS_GROUPS:
        if pattern.search(diagnosis):
            return label
    return "Other"


class DashboardService:
    def __init__(self, db: Session) -> None:
        self.patients = PatientRepository(db)
        self.users = UserRepository(db)
        self.visits = VisitRepository(db)
        self.settings = get_settings()

    def summary(self, _actor: User) -> DashboardSummary:
        tz = self.settings.clinic_tz
        today = local_today(tz)

        today_start, today_end = local_day_range(today, today, tz)
        month_start = local_day_start(today.replace(day=1), tz)

        first_trend_day = today - timedelta(days=TREND_DAYS - 1)
        trend_start, _ = local_day_range(first_trend_day, today, tz)
        per_day = self.visits.daily_counts(trend_start, today_end, self.settings.clinic_timezone)

        categories: Counter[str] = Counter()
        for diagnosis, count in self.visits.diagnosis_counts():
            categories[categorize(diagnosis)] += count

        follow_ups = self.visits.upcoming_follow_ups(
            today, today + timedelta(days=FOLLOW_UP_DAYS), MAX_FOLLOW_UPS
        )

        return DashboardSummary(
            today=today,
            total_patients=self.patients.count(),
            todays_visits=self.visits.count_between(today_start, today_end),
            prescriptions_this_month=self.visits.count_between(month_start, today_end),
            active_doctors=self.users.count_active(),
            visits_per_day=[
                DailyVisits(date=day, count=per_day.get(day, 0))
                for day in (first_trend_day + timedelta(days=i) for i in range(TREND_DAYS))
            ],
            top_diagnoses=[
                DiagnosisCount(label=label, count=count)
                for label, count in categories.most_common(TOP_DIAGNOSES)
            ],
            follow_ups=[
                FollowUp(
                    visit_id=v.id,
                    follow_up_date=v.follow_up_date,
                    patient=FollowUpPatient(id=v.patient.id, full_name=v.patient.full_name),
                    doctor=DoctorBrief.model_validate(v.doctor),
                )
                for v in follow_ups
            ],
        )
