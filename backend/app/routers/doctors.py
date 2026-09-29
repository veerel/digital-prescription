from fastapi import APIRouter

from app.core.dependencies import CurrentUser, DbSession
from app.schemas.doctor import DoctorRead
from app.services.doctors import DoctorService

router = APIRouter(prefix="/doctors", tags=["doctors"])


@router.get("")
def list_doctors(actor: CurrentUser, db: DbSession) -> list[DoctorRead]:
    """The whole care team. Adding/disabling doctors is `POST/PATCH /users` (admin)."""
    return DoctorService(db).list_doctors(actor)
