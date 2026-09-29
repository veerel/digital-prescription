"""Admin commands.

    uv run python -m app.cli create-admin --email admin@example.com --name "Dr. Admin"
    uv run python -m app.cli seed-demo

Passwords are prompted for (never pass them as arguments: they would end up
in shell history). For unattended installs, set ADMIN_PASSWORD / DEMO_PASSWORD.
"""

import argparse
import getpass
import os
import sys

from pydantic import TypeAdapter, ValidationError

from app.database.session import session_scope
from app.models.user import Role
from app.schemas.common import Password
from app.schemas.user import UserCreate
from app.scripts.seed_demo import SeedError, seed_demo
from app.services.users import UserService


def create_admin(email: str, name: str, specialization: str | None) -> None:
    password = os.environ.get("ADMIN_PASSWORD") or getpass.getpass("Password (12+ chars): ")
    try:
        data = UserCreate(
            email=email,
            full_name=name,
            password=password,
            role=Role.ADMIN,
            specialization=specialization,
        )
    except ValidationError as exc:
        sys.exit(f"Invalid input: {exc.errors()[0]['msg']}")
    with session_scope() as db:
        user = UserService(db).create_user(data)
        print(f"Created admin {user.email} ({user.id})")


def load_demo() -> None:
    password = os.environ.get("DEMO_PASSWORD") or getpass.getpass(
        "Password for every demo doctor (12+ chars): "
    )
    try:
        TypeAdapter(Password).validate_python(password)
    except ValidationError:
        sys.exit("The password must be 12 to 128 characters")
    with session_scope() as db:
        try:
            counts = seed_demo(db, password)
        except SeedError as exc:
            sys.exit(str(exc))
    print(
        f"Loaded {counts['doctors']} doctors, {counts['patients']} patients and "
        f"{counts['visits']} visits. Sign in as ananya.rao@clinic.in (admin) or any "
        "other demo doctor with the password you chose."
    )


def main() -> None:
    parser = argparse.ArgumentParser(prog="app.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    admin = sub.add_parser("create-admin", help="Create an admin doctor")
    admin.add_argument("--email", required=True)
    admin.add_argument("--name", required=True)
    admin.add_argument("--specialization")
    sub.add_parser("seed-demo", help="Load the sample clinic into an empty database")
    args = parser.parse_args()

    if args.command == "create-admin":
        create_admin(args.email, args.name, args.specialization)
    elif args.command == "seed-demo":
        load_demo()


if __name__ == "__main__":
    main()
