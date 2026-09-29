"""The care-team directory.

Any active doctor can see the whole team (names are needed for patient
assignment, filters and referrals). Adding, disabling or changing a
doctor's role goes through UserService, which is admin-only.
"""

from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.users import UserRepository
from app.schemas.doctor import DoctorRead
from app.schemas.user import UserRead


class DoctorService:
    def __init__(self, db: Session) -> None:
        self.users = UserRepository(db)

    def list_doctors(self, _actor: User) -> list[DoctorRead]:
        return [
            DoctorRead(
                **UserRead.model_validate(user).model_dump(),
                patient_count=patient_count,
                prescription_count=prescription_count,
            )
            for user, patient_count, prescription_count in self.users.list_with_workload()
        ]
