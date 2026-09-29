"""Shared test fixtures.

Unit tests (tests/unit) need nothing. Integration tests (tests/integration)
need a real PostgreSQL database in TEST_DATABASE_URL (env var or backend/.env).
Its name must end in `_test`, because the suite wipes it on every run.

Each test runs inside a transaction that is rolled back afterwards, so tests
never see each other's data and need no cleanup.
"""

import os
from collections.abc import Callable, Iterator
from datetime import date, datetime
from typing import Any

# Settings are cached on first use, so fix them before importing the app.
os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-that-is-long-enough-for-hs256-0123456789"
os.environ["COOKIE_SECURE"] = "true"
os.environ["CORS_ORIGINS"] = ""
os.environ["MAX_FAILED_LOGINS"] = "3"
os.environ["LOG_LEVEL"] = "WARNING"
os.environ["CLINIC_TIMEZONE"] = "Asia/Kolkata"

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.cookies import CSRF_COOKIE, CSRF_HEADER
from app.core.dependencies import get_db
from app.core.security import hash_password
from app.main import app
from app.models.patient import BloodGroup, Gender, Patient
from app.models.user import Role, User
from app.models.visit import PrescriptionItem, Visit
from app.utils.time import utcnow

TEST_PASSWORD = "correct-horse-battery"
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    for item in items:
        if "integration" in item.path.parts:
            item.add_marker(pytest.mark.integration)


@pytest.fixture(scope="session")
def engine() -> Iterator[Engine]:
    url = get_settings().test_database_url
    if not url:
        pytest.skip("TEST_DATABASE_URL is not set; skipping integration tests")
    database = make_url(url).database or ""
    if not database.endswith("_test"):
        pytest.exit(f"Refusing to wipe {database!r}: test database name must end in '_test'")

    engine = create_engine(url)
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))

    # Build the schema with the real migrations, and check they reverse cleanly.
    cfg = Config(os.path.join(BACKEND_DIR, "alembic.ini"))
    cfg.attributes["database_url"] = url
    command.upgrade(cfg, "head")
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")

    yield engine
    engine.dispose()


@pytest.fixture
def db(engine: Engine) -> Iterator[Session]:
    connection = engine.connect()
    outer = connection.begin()
    # Service-level commit() only releases a savepoint; the outer rollback undoes everything.
    session = Session(
        bind=connection, join_transaction_mode="create_savepoint", expire_on_commit=False
    )
    try:
        yield session
    finally:
        session.close()
        outer.rollback()
        connection.close()


@pytest.fixture
def client(db: Session) -> Iterator[TestClient]:
    app.dependency_overrides[get_db] = lambda: db
    # https base URL, otherwise the client won't send our Secure cookies back.
    with TestClient(app, base_url="https://testserver") as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def make_user(db: Session) -> Callable[..., User]:
    counter = iter(range(1, 10_000))

    def _make(
        *,
        email: str | None = None,
        role: Role = Role.DOCTOR,
        password: str = TEST_PASSWORD,
        is_active: bool = True,
        full_name: str = "Test User",
    ) -> User:
        user = User(
            email=email or f"user{next(counter)}@example.com",
            full_name=full_name,
            password_hash=hash_password(password),
            role=role,
            is_active=is_active,
        )
        db.add(user)
        db.flush()
        return user

    return _make


@pytest.fixture
def make_patient(db: Session) -> Callable[..., Patient]:
    def _make(
        doctor: User,
        *,
        full_name: str = "Test Patient",
        phone: str = "+91 90000 11122",
        allergies: list[str] | None = None,
    ) -> Patient:
        patient = Patient(
            full_name=full_name,
            age=40,
            gender=Gender.FEMALE,
            phone=phone,
            blood_group=BloodGroup.O_POS,
            allergies=allergies or [],
            assigned_doctor_id=doctor.id,
            created_by_id=doctor.id,
        )
        db.add(patient)
        db.flush()
        return patient

    return _make


@pytest.fixture
def make_visit(db: Session) -> Callable[..., Visit]:
    def _make(
        patient: Patient,
        doctor: User,
        *,
        visited_at: datetime | None = None,
        diagnosis: str = "Viral Fever",
        follow_up_date: date | None = None,
    ) -> Visit:
        visit = Visit(
            patient_id=patient.id,
            doctor_id=doctor.id,
            visited_at=visited_at or utcnow(),
            vitals={"bp": "120/80"},
            diagnosis=diagnosis,
            follow_up_date=follow_up_date,
            medicines=[PrescriptionItem(position=0, name="Paracetamol 500mg", dosage="1-0-1")],
        )
        db.add(visit)
        db.flush()
        return visit

    return _make


def login(client: TestClient, user: User, password: str = TEST_PASSWORD) -> Any:
    response = client.post("/api/v1/auth/login", json={"email": user.email, "password": password})
    assert response.status_code == 200, response.text
    return response


def csrf(client: TestClient) -> dict[str, str]:
    """Header the frontend sends on every state-changing request."""
    return {CSRF_HEADER: client.cookies.get(CSRF_COOKIE) or ""}
