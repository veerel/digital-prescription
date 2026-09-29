"""The clinic's recent-activity feed. Visible to every active doctor.

Entries are written by the services that perform the action (patients,
visits, users, auth); this service only reads them.
"""

from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.activities import ActivityRepository
from app.schemas.activity import ActivityRead


class ActivityService:
    def __init__(self, db: Session) -> None:
        self.activities = ActivityRepository(db)

    def recent(self, _actor: User, *, limit: int) -> list[ActivityRead]:
        return [ActivityRead.model_validate(a) for a in self.activities.recent(limit)]
