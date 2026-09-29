from typing import Annotated, Any

from pydantic import AfterValidator, BaseModel, BeforeValidator, Field, StringConstraints

from app.utils.text import normalize_email

_MAX_EMAIL_LENGTH = 320


def _validate_email(value: str) -> str:
    value = normalize_email(value)
    local, sep, domain = value.partition("@")
    # Deliberately permissive: LAN deployments use internal domains like
    # `user@client.local`, which strict validators reject.
    if (
        not sep
        or not local
        or not domain
        or "@" in domain
        or any(ch.isspace() for ch in value)
        or len(value) > _MAX_EMAIL_LENGTH
    ):
        raise ValueError("Enter a valid email address")
    return value


def _blank_to_none(value: object) -> object:
    """Optional text fields: trim, and treat an empty form field as "not given"."""
    if isinstance(value, str):
        return value.strip() or None
    return value


Email = Annotated[str, AfterValidator(_validate_email)]

# Min length is the main defence; max length stops huge inputs from
# making argon2 hashing an easy denial-of-service.
Password = Annotated[str, Field(min_length=12, max_length=128)]

# Required, trimmed text.
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Phone = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True, min_length=6, max_length=30, pattern=r"^\+?[0-9][0-9 ()-]*$"
    ),
]
HexColor = Annotated[str, StringConstraints(pattern=r"^#[0-9a-fA-F]{6}$")]

# Optional, trimmed text: an empty string becomes None.
OptionalPhone = Annotated[Phone | None, BeforeValidator(_blank_to_none)]
OptionalText20 = Annotated[
    Annotated[str, StringConstraints(max_length=20)] | None, BeforeValidator(_blank_to_none)
]
OptionalText50 = Annotated[
    Annotated[str, StringConstraints(max_length=50)] | None, BeforeValidator(_blank_to_none)
]
OptionalText100 = Annotated[
    Annotated[str, StringConstraints(max_length=100)] | None, BeforeValidator(_blank_to_none)
]
OptionalText200 = Annotated[
    Annotated[str, StringConstraints(max_length=200)] | None, BeforeValidator(_blank_to_none)
]
OptionalText300 = Annotated[
    Annotated[str, StringConstraints(max_length=300)] | None, BeforeValidator(_blank_to_none)
]
OptionalText2000 = Annotated[
    Annotated[str, StringConstraints(max_length=2000)] | None, BeforeValidator(_blank_to_none)
]


class Page[ItemT](BaseModel):
    items: list[ItemT]
    total: int
    offset: int
    limit: int


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Any | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail
