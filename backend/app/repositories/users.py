from sqlalchemy import func, select

from app.database.repository import BaseRepository
from app.models.patient import Patient
from app.models.user import User
from app.models.visit import Visit
from app.utils.text import normalize_email


class UserRepository(BaseRepository[User]):
    model = User

    def get_by_email(self, email: str) -> User | None:
        return self.session.scalars(
            select(User).where(User.email == normalize_email(email))
        ).first()

    def list_ordered(self, *, offset: int, limit: int) -> tuple[list[User], int]:
        query = select(User).order_by(User.created_at, User.id)
        return list(self.list(offset=offset, limit=limit, query=query)), self.count()

    def list_with_workload(self) -> list[tuple[User, int, int]]:
        """Every doctor with (assigned patient count, prescriptions written).

        Unpaginated on purpose: a clinic's care team is small, and the UI
        needs the whole directory for filters and pickers.
        """
        patients = (
            select(Patient.assigned_doctor_id.label("doctor_id"), func.count().label("n"))
            .group_by(Patient.assigned_doctor_id)
            .subquery()
        )
        visits = (
            select(Visit.doctor_id.label("doctor_id"), func.count().label("n"))
            .group_by(Visit.doctor_id)
            .subquery()
        )
        rows = self.session.execute(
            select(User, func.coalesce(patients.c.n, 0), func.coalesce(visits.c.n, 0))
            .outerjoin(patients, patients.c.doctor_id == User.id)
            .outerjoin(visits, visits.c.doctor_id == User.id)
            .order_by(User.full_name, User.id)
        ).all()
        return [(row[0], int(row[1]), int(row[2])) for row in rows]

    def count_active(self) -> int:
        return self.count(select(User).where(User.is_active.is_(True)))
