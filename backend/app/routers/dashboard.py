from fastapi import APIRouter, Query

from app.core.dependencies import CurrentUser, DbSession
from app.schemas.activity import ActivityRead
from app.schemas.dashboard import DashboardSummary
from app.services.activities import ActivityService
from app.services.dashboard import DashboardService

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard")
def dashboard(actor: CurrentUser, db: DbSession) -> DashboardSummary:
    return DashboardService(db).summary(actor)


@router.get("/activities")
def recent_activities(
    actor: CurrentUser, db: DbSession, limit: int = Query(20, ge=1, le=100)
) -> list[ActivityRead]:
    return ActivityService(db).recent(actor, limit=limit)
