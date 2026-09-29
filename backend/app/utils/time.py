from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo


def utcnow() -> datetime:
    """Timezone-aware current time in UTC. Never use naive datetimes."""
    return datetime.now(UTC)


def local_today(tz: ZoneInfo) -> date:
    """Today's calendar date in the given timezone (e.g. the clinic's)."""
    return utcnow().astimezone(tz).date()


def local_day_start(day: date, tz: ZoneInfo) -> datetime:
    """The UTC instant at which `day` begins in `tz`. Use half-open ranges:
    `start <= t < local_day_start(day + 1 day)`."""
    return datetime.combine(day, time.min, tzinfo=tz).astimezone(UTC)


def local_day_range(first: date, last: date, tz: ZoneInfo) -> tuple[datetime, datetime]:
    """[start, end) in UTC covering every local day from `first` to `last` inclusive."""
    return local_day_start(first, tz), local_day_start(last + timedelta(days=1), tz)
