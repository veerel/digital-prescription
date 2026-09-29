"""Load the sample clinic (5 doctors, 12 patients, their visit history) into an
empty database, for demos and local development.

    uv run python -m app.cli seed-demo

Every demo doctor gets the same password (prompted, or DEMO_PASSWORD).
Refuses to run in production or when patients already exist.
"""

from datetime import date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.models.activity import Activity, ActivityType
from app.models.patient import Patient
from app.models.user import User
from app.models.visit import PrescriptionItem, Visit
from app.scripts.demo_data import DOCTORS, LOGINS, PATIENTS, VISITS
from app.utils.time import local_today


class SeedError(Exception):
    pass


def seed_demo(db: Session, password: str) -> dict[str, int]:
    settings = get_settings()
    if settings.is_production:
        raise SeedError("Refusing to load demo data in production")
    if db.scalars(select(Patient.id).limit(1)).first() is not None:
        raise SeedError("The database already has patients; demo data is only for an empty clinic")

    tz = settings.clinic_tz
    today = local_today(tz)

    def at(days_ago: int, hour: int = 9, minute: int = 30) -> datetime:
        return datetime.combine(today - timedelta(days=days_ago), time(hour, minute), tzinfo=tz)

    def on(days_from_now: int) -> date:
        return today + timedelta(days=days_from_now)

    password_hash = hash_password(password)
    doctors: dict[str, User] = {}
    for d in DOCTORS:
        existing = db.scalars(select(User).where(User.email == d["email"])).first()
        if existing is not None:
            raise SeedError(f"A user with email {d['email']} already exists")
        doctor = User(
            email=d["email"],
            full_name=d["full_name"],
            password_hash=password_hash,
            role=d["role"],
            specialization=d["specialization"],
            qualification=d["qualification"],
            registration_number=d["registration_number"],
            phone=d["phone"],
            accent_color=d["accent_color"],
            created_at=at(d["joined_days_ago"]),
        )
        db.add(doctor)
        doctors[d["key"]] = doctor
    db.flush()

    activities: list[Activity] = []
    patients: dict[str, Patient] = {}
    for p in sorted(PATIENTS, key=lambda p: -p["registered_days_ago"]):
        doctor = doctors[p["doctor"]]
        patient = Patient(
            full_name=p["full_name"],
            age=p["age"],
            gender=p["gender"],
            phone=p["phone"],
            address=p["address"],
            blood_group=p["blood_group"],
            allergies=p["allergies"],
            assigned_doctor_id=doctor.id,
            created_by_id=doctor.id,
            created_at=at(p["registered_days_ago"], 9, 0),
        )
        db.add(patient)
        db.flush()
        patients[p["key"]] = patient
        activities.append(
            Activity(
                type=ActivityType.PATIENT_ADDED,
                actor_id=doctor.id,
                patient_id=patient.id,
                description=f"{doctor.full_name} registered new patient {patient.full_name}",
                created_at=patient.created_at,
            )
        )

    for i, v in enumerate(VISITS):
        doctor, patient = doctors[v["doctor"]], patients[v["patient"]]
        # Stagger same-day visits so their order is stable.
        visited_at = at(v["days_ago"], 9, 30) + timedelta(minutes=i % 5 * 20)
        db.add(
            Visit(
                patient_id=patient.id,
                doctor_id=doctor.id,
                visited_at=visited_at,
                vitals=v["vitals"],
                complaints=v["complaints"],
                diagnosis=v["diagnosis"],
                advice=v["advice"],
                follow_up_date=on(v["follow_up"]),
                medicines=[PrescriptionItem(position=n, **m) for n, m in enumerate(v["medicines"])],
            )
        )
        activities.append(
            Activity(
                type=ActivityType.PRESCRIPTION,
                actor_id=doctor.id,
                patient_id=patient.id,
                description=(
                    f"{doctor.full_name} created a prescription for {patient.full_name}"
                    f" — {v['diagnosis']}"
                ),
                created_at=visited_at,
            )
        )

    admin, newest = doctors["rao"], doctors["iyer"]
    activities.append(
        Activity(
            type=ActivityType.DOCTOR_ADDED,
            actor_id=admin.id,
            description=f"{admin.full_name} added {newest.full_name} ({newest.specialization}) "
            "to the team",
            created_at=newest.created_at,
        )
    )
    for key, days_ago in LOGINS:
        activities.append(
            Activity(
                type=ActivityType.LOGIN,
                actor_id=doctors[key].id,
                description=f"{doctors[key].full_name} signed in",
                created_at=at(days_ago, 9, 0),
            )
        )
    db.add_all(activities)
    db.commit()
    return {"doctors": len(doctors), "patients": len(patients), "visits": len(VISITS)}
