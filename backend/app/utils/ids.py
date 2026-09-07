import secrets
import uuid
from datetime import UTC, datetime


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def now() -> datetime:
    return datetime.now(UTC)


def as_utc(dt: datetime) -> datetime:
    """Mongo hands back naive datetimes; they are UTC, so say so."""
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=UTC)


def iso(dt: datetime | None) -> str | None:
    return as_utc(dt).isoformat().replace("+00:00", "Z") if dt else None


def token(nbytes: int = 32) -> str:
    return secrets.token_urlsafe(nbytes)
