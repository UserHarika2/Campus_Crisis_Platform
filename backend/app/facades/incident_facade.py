# =============================================================================
# PATTERN: FACADE
# =============================================================================
#
# Problem:
#   Creating an incident involves many subsystems:
#     1. Factory Method  → create the right incident type
#     2. DB persistence  → save the incident
#     3. Department lookup → auto-assign department by category
#     4. Observer → send notifications
#     5. Adapter → deliver those notifications externally
#     6. Audit log → record the creation event
#
#   Without Facade, the router (or frontend) would need to know and call
#   all of these subsystems in the correct order. Any change to a subsystem
#   would break the router.
#
# Solution:
#   A single IncidentFacade class with a report_incident() method.
#   It orchestrates all subsystems internally.
#   The router calls ONE method. The rest is hidden.
#
# Architecture:
#   IncidentFacade
#       → uses IncidentFactory (Factory Method)
#       → uses SQLAlchemy Session (persistence)
#       → uses IncidentNotifier (Observer)
#       → uses NotificationAdapter (Adapter)
#       → saves IncidentHistory (Audit)
# =============================================================================

from sqlalchemy.orm import Session

from app.factories.incident_factory import get_incident_factory
from app.models.incident import Incident
from app.models.incident_history import IncidentHistory
from app.models.notification import Notification
from app.observers.notification_observer import (
    IncidentEvent,
    IncidentNotifier,
    ReporterObserver,
    AdminObserver,
)
from app.adapters.notification_adapter import get_notification_service


class IncidentFacade:
    """
    Facade — single entry point for the incident reporting workflow.
    Hides all subsystem complexity from the router.

    The router calls:
        facade.report_incident(...)

    Internally it:
        1. Selects the right Factory based on category
        2. Creates incident data with category-specific rules
        3. Persists the incident to PostgreSQL
        4. Auto-assigns department if not provided
        5. Records audit history
        6. Triggers Observer notifications
        7. Delivers notifications via Adapter
    """

    def __init__(self, db: Session):
        self.db = db
        self._notification_service = get_notification_service()

    def report_incident(
        self,
        title: str,
        description: str,
        category: str,
        priority: str,
        location: str,
        reporter_id: int,
        department_id: int | None = None,
        admin_user_ids: list[int] | None = None,
    ) -> Incident:

        # ── STEP 1: Factory Method ─────────────────────────────────────────
        # Select the appropriate factory for this incident category.
        # Each factory applies category-specific rules (e.g. Medical → CRITICAL).
        factory = get_incident_factory(
            category,
            preserve_category=department_id is not None,
        )
        incident_data = factory.create(
            title=title,
            description=description,
            priority=priority,
            location=location,
            reporter_id=reporter_id,
            department_id=department_id,
        )

        # ── STEP 2: Auto-assign Department ────────────────────────────────
        # If no department_id was given, look up by the factory's hint.
        resolved_department_id = incident_data.department_id
        if resolved_department_id is None:
            resolved_department_id = self._find_department(
                incident_data.department_hint
            )

        # ── STEP 3: Persist to PostgreSQL ─────────────────────────────────
        incident = Incident(
            title=incident_data.title,
            description=incident_data.description,
            category=incident_data.category,
            priority=incident_data.priority,
            status="REPORTED",
            location=incident_data.location,
            reporter_id=incident_data.reporter_id,
            department_id=resolved_department_id,
        )
        self.db.add(incident)
        self.db.flush()  # Get incident.id without committing yet

        # ── STEP 4: Audit Log ──────────────────────────────────────────────
        history = IncidentHistory(
            incident_id=incident.id,
            changed_by_id=reporter_id,
            old_status="NEW",
            new_status="REPORTED",
            note=f"Incident created via {incident_data.category} factory"
        )
        self.db.add(history)

        # ── STEP 5: Observer — generate notification records ───────────────
        notifier = IncidentNotifier()
        notifier.subscribe(ReporterObserver())
        if admin_user_ids:
            notifier.subscribe(AdminObserver(admin_user_ids))

        event = IncidentEvent(
            incident_id=incident.id,
            incident_title=incident.title,
            old_status="NEW",
            new_status="REPORTED",
            changed_by_id=reporter_id,
            reporter_id=reporter_id,
            assigned_to_id=None,
            priority=incident_data.priority,
        )
        notification_records = notifier.notify(event)

        # ── STEP 6: Save notifications to DB ──────────────────────────────
        for record in notification_records:
            notif = Notification(
                user_id=record.user_id,
                incident_id=record.incident_id,
                message=record.message,
            )
            self.db.add(notif)

        # ── STEP 7: Adapter — external delivery ───────────────────────────
        for record in notification_records:
            self._notification_service.send(
                user_id=record.user_id,
                message=record.message,
                incident_id=record.incident_id,
            )

        # ── Commit everything atomically ───────────────────────────────────
        self.db.commit()
        self.db.refresh(incident)

        return incident

    def _find_department(self, department_hint: str) -> int | None:
        """
        Look up a department by name hint from the factory.
        Returns the department ID or None if not found.
        """
        from app.models.department import Department
        dept = (
            self.db.query(Department)
            .filter(Department.name.ilike(f"%{department_hint}%"))
            .first()
        )
        return dept.id if dept else None
