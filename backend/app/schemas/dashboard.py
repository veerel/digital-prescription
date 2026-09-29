import uuid
from datetime import date

from pydantic import BaseModel

from app.schemas.doctor import DoctorBrief


class DailyVisits(BaseModel):
    date: date
    count: int


class DiagnosisCount(BaseModel):
    label: str
    count: int


class FollowUpPatient(BaseModel):
    id: uuid.UUID
    full_name: str


class FollowUp(BaseModel):
    visit_id: uuid.UUID
    follow_up_date: date
    patient: FollowUpPatient
    doctor: DoctorBrief


class DashboardSummary(BaseModel):
    """Clinic-wide numbers for the dashboard. Dates are in the clinic's timezone."""

    today: date
    total_patients: int
    todays_visits: int
    prescriptions_this_month: int
    active_doctors: int
    visits_per_day: list[DailyVisits]
    top_diagnoses: list[DiagnosisCount]
    follow_ups: list[FollowUp]
