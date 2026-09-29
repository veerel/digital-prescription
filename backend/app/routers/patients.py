import uuid

from fastapi import APIRouter, Query, status

from app.core.dependencies import CurrentUser, DbSession
from app.schemas.common import Page
from app.schemas.patient import PatientCreate, PatientRead, PatientUpdate
from app.services.patients import PatientService

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("")
def list_patients(
    actor: CurrentUser,
    db: DbSession,
    q: str | None = Query(None, max_length=100, description="Name or phone number"),
    doctor_id: uuid.UUID | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> Page[PatientRead]:
    return PatientService(db).list_patients(
        actor, query=q, doctor_id=doctor_id, offset=offset, limit=limit
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_patient(body: PatientCreate, actor: CurrentUser, db: DbSession) -> PatientRead:
    return PatientService(db).create_patient(actor, body)


@router.get("/{patient_id}")
def get_patient(patient_id: uuid.UUID, actor: CurrentUser, db: DbSession) -> PatientRead:
    return PatientService(db).get_patient(actor, patient_id)


@router.patch("/{patient_id}")
def update_patient(
    patient_id: uuid.UUID, body: PatientUpdate, actor: CurrentUser, db: DbSession
) -> PatientRead:
    return PatientService(db).update_patient(actor, patient_id, body)
