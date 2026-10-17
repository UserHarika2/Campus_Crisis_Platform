from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class IncidentHistory(Base):
    """
    Audit log for every status change on an incident.
    Every time an incident transitions, one record is inserted here.
    This gives us a full timeline of the incident lifecycle.
    """

    __tablename__ = "incident_history"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    incident_id: Mapped[int] = mapped_column(
        ForeignKey("incidents.id"),
        nullable=False,
        index=True
    )

    changed_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )

    old_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    new_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    changed_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )
