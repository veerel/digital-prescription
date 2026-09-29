import uuid

from sqlalchemy import select

from app.database.repository import MAX_PAGE_SIZE, BaseRepository
from app.models.activity import Activity, ActivityType
from app.utils.time import utcnow

_MAX_DESCRIPTION = 500


class ActivityRepository(BaseRepository[Activity]):
    model = Activity

    def record(
        self,
        type_: ActivityType,
        *,
        actor_id: uuid.UUID,
        description: str,
        patient_id: uuid.UUID | None = None,
    ) -> Activity:
        """Add an entry. The calling service commits it along with the action."""
        if len(description) > _MAX_DESCRIPTION:
            description = description[: _MAX_DESCRIPTION - 1] + "…"
        return self.add(
            Activity(
                type=type_,
                actor_id=actor_id,
                patient_id=patient_id,
                description=description,
                # Wall-clock time, not the DB's now() (which is the transaction start),
                # so several entries written in one transaction keep their order.
                created_at=utcnow(),
            )
        )

    def recent(self, limit: int) -> list[Activity]:
        return list(
            self.session.scalars(
                select(Activity)
                .order_by(Activity.created_at.desc(), Activity.id.desc())
                .limit(max(1, min(limit, MAX_PAGE_SIZE)))
            ).all()
        )
