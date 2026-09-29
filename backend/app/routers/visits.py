import uuid
from datetime import date

from fastapi import APIRouter, Query, status

from app.core.dependencies import CurrentUser, DbSession
from app.schemas.visit import VisitCreate, VisitPage, VisitRead
from app.services.visits import VisitService

router = APIRouter(prefix="/visits", tags=["visits"])


@router.get("")
def list_visits(
    actor: CurrentUser,
    db: DbSession,
    patient_id: uuid.UUID | None = None,
    doctor_id: uuid.UUID | None = None,
    q: str | None = Query(None, max_length=100, description="Patient name or phone number"),
    date_from: date | None = Query(None, description="Inclusive, clinic timezone"),
    date_to: date | None = Query(None, description="Inclusive, clinic timezone"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> VisitPage:
    return VisitService(db).list_visits(
        actor,
        patient_id=patient_id,
        doctor_id=doctor_id,
        query=q,
        date_from=date_from,
        date_to=date_to,
        offset=offset,
        limit=limit,
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_visit(body: VisitCreate, actor: CurrentUser, db: DbSession) -> VisitRead:
    return VisitRead.model_validate(VisitService(db).create_visit(actor, body))


@router.get("/{visit_id}")
def get_visit(visit_id: uuid.UUID, actor: CurrentUser, db: DbSession) -> VisitRead:
    return VisitRead.model_validate(VisitService(db).get_visit(actor, visit_id))
