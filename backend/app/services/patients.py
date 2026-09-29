"""Patient records.

Authorization rules (the clinic shares one set of records):
- Any active doctor can list, search, view and register patients. Patients
  are often seen by several doctors (walk-ins, referrals), so records are
  not partitioned by doctor.
- Only the patient's assigned doctor or an admin can edit the record.
- A patient can only be assigned to an active doctor.
"""

import uuid

from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, NotFoundError, PermissionDeniedError
from app.models.activity import ActivityType
from app.models.patient import Patient
from app.models.user import Role, User
from app.repositories.activities import ActivityRepository
from app.repositories.patients import PatientRepository, PatientWithStats
from app.repositories.users import UserRepository
from app.schemas.common import Page
from app.schemas.doctor import DoctorBrief
from app.schemas.patient import PatientCreate, PatientRead, PatientUpdate

PATIENT_NOT_FOUND = "Patient not found"


def to_read(row: PatientWithStats) -> PatientRead:
    patient = row.patient
    return PatientRead(
        id=patient.id,
        patient_number=patient.patient_number,
        full_name=patient.full_name,
        age=patient.age,
        gender=patient.gender,
        phone=patient.phone,
        blood_group=patient.blood_group,
        allergies=list(patient.allergies),
        address=patient.address,
        assigned_doctor=DoctorBrief.model_validate(patient.assigned_doctor),
        created_at=patient.created_at,
        visit_count=row.visit_count,
        last_visit_at=row.last_visit_at,
        next_follow_up_date=row.next_follow_up_date,
    )


class PatientService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.patients = PatientRepository(db)
        self.users = UserRepository(db)
        self.activities = ActivityRepository(db)

    def list_patients(
        self,
        _actor: User,
        *,
        query: str | None,
        doctor_id: uuid.UUID | None,
        offset: int,
        limit: int,
    ) -> Page[PatientRead]:
        rows, total = self.patients.search(
            query=query.strip() if query else None, doctor_id=doctor_id, offset=offset, limit=limit
        )
        return Page[PatientRead](
            items=[to_read(r) for r in rows], total=total, offset=offset, limit=limit
        )

    def get_patient(self, _actor: User, patient_id: uuid.UUID) -> PatientRead:
        row = self.patients.get_with_stats(patient_id)
        if row is None:
            raise NotFoundError(PATIENT_NOT_FOUND)
        return to_read(row)

    def create_patient(self, actor: User, data: PatientCreate) -> PatientRead:
        self._require_active_doctor(data.assigned_doctor_id)
        patient = self.patients.add(
            Patient(
                full_name=data.full_name,
                age=data.age,
                gender=data.gender,
                phone=data.phone,
                address=data.address,
                blood_group=data.blood_group,
                allergies=data.allergies,
                assigned_doctor_id=data.assigned_doctor_id,
                created_by_id=actor.id,
            )
        )
        self.activities.record(
            ActivityType.PATIENT_ADDED,
            actor_id=actor.id,
            patient_id=patient.id,
            description=f"{actor.full_name} registered new patient {patient.full_name}",
        )
        self.db.commit()
        return self.get_patient(actor, patient.id)

    def update_patient(
        self, actor: User, patient_id: uuid.UUID, data: PatientUpdate
    ) -> PatientRead:
        patient = self.patients.get(patient_id)
        if patient is None:
            raise NotFoundError(PATIENT_NOT_FOUND)
        if actor.role != Role.ADMIN and patient.assigned_doctor_id != actor.id:
            # The record is visible to every doctor, so 403 (not 404) reveals nothing new.
            raise PermissionDeniedError(
                "Only the assigned doctor or an admin can edit this patient"
            )

        changes = data.model_dump(exclude_unset=True)
        for required in ("full_name", "age", "gender", "phone", "blood_group", "allergies"):
            if required in changes and changes[required] is None:
                raise BusinessRuleError(f"{required} cannot be cleared")
        if changes.get("assigned_doctor_id") is not None:
            self._require_active_doctor(changes["assigned_doctor_id"])
        elif "assigned_doctor_id" in changes:
            raise BusinessRuleError("A patient must have an assigned doctor")

        self.patients.update(patient, changes)
        self.db.commit()
        self.db.refresh(patient)  # reload the assigned_doctor relationship
        return self.get_patient(actor, patient.id)

    def _require_active_doctor(self, doctor_id: uuid.UUID) -> None:
        doctor = self.users.get(doctor_id)
        if doctor is None or not doctor.is_active:
            raise BusinessRuleError("The assigned doctor must be an active doctor")
