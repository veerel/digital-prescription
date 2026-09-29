import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.activity import ActivityType


class ActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: ActivityType
    actor_id: uuid.UUID
    patient_id: uuid.UUID | None
    description: str
    created_at: datetime
