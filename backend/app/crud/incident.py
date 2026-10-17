from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.incident import Incident
from app.models.incident_history import IncidentHistory
from app.models.notification import Notification
from app.models.user import User
from app.schemas.incident import IncidentCreate
from app.states.incident_state import get_incident_state
from app.strategies.assignment_strategy import get_assignment_strategy
from app.observers.notification_observer import (
    IncidentEvent, IncidentNotifier, ReporterObserver,
    TechnicianObserver, AdminObserver,
)
from app.adapters.notification_adapter import get_notification_service


def _notify_and_save(
    db: Session,
    incident: Incident,
    old_status: str,
    changed_by_id: int,
    admin_ids: list[int],
) -> None:
    """
    Internal helper: fires Observer pattern notifications and saves them to DB.
    Also triggers the Adapter for external delivery.
    """
    notifier = IncidentNotifier()
    notifier.subscribe(ReporterObserver())
    notifier.subscribe(TechnicianObserver())
    if admin_ids:
        notifier.subscribe(AdminObserver(admin_ids))

    event = IncidentEvent(
        incident_id=incident.id,
        incident_title=incident.title,
        old_status=old_status,
        new_status=incident.status,
        changed_by_id=changed_by_id,
        reporter_id=incident.reporter_id,
        assigned_to_id=incident.assigned_to_id,
        priority=incident.priority,
    )
    records = notifier.notify(event)

    notification_service = get_notification_service()
    for record in records:
        db.add(Notification(
            user_id=record.user_id,
            incident_id=record.incident_id,
            message=record.message,
        ))
        notification_service.send(record.user_id, record.message, record.incident_id)


def create_incident(
    db: Session,
    incident_data: IncidentCreate,
    reporter_id: int
) -> Incident:
    """Legacy create — used when Facade is not called."""
    incident = Incident(
        title=incident_data.title,
        description=incident_data.description,
        category=incident_data.category,
        priority=incident_data.priority,
        location=incident_data.location,
        reporter_id=reporter_id,
        department_id=incident_data.department_id,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


def get_incidents(db: Session) -> list[Incident]:
    return db.query(Incident).all()


def get_my_incidents(db: Session, user_id: int) -> list[Incident]:
    return db.query(Incident).filter(Incident.reporter_id == user_id).all()


def get_incident_by_id(db: Session, incident_id: int) -> Incident | None:
    return db.query(Incident).filter(Incident.id == incident_id).first()


def update_incident_status(
    db: Session,
    incident: Incident,
    new_status: str,
    changed_by_id: int,
    note: str | None = None,
) -> Incident:
    """
    Uses STATE PATTERN to validate the transition,
    then saves an audit record and fires OBSERVER notifications.
    """
    current_state = get_incident_state(incident.status)
    old_status = incident.status

    # State Pattern validates the transition (raises ValueError if invalid)
    validated_status = current_state.transition_to(new_status)

    incident.status = validated_status
    db.flush()

    # Audit log
    db.add(IncidentHistory(
        incident_id=incident.id,
        changed_by_id=changed_by_id,
        old_status=old_status,
        new_status=validated_status,
        note=note,
    ))

    # Get admin IDs for AdminObserver
    admin_ids = [
        u.id for u in db.query(User).filter(User.role == "ADMIN").all()
    ]
    _notify_and_save(db, incident, old_status, changed_by_id, admin_ids)

    db.commit()
    db.refresh(incident)
    return incident


def assign_technician(
    db: Session,
    incident: Incident,
    strategy_name: str = "least_busy",
    technician_id: int | None = None,
    assigner_id: int | None = None,
) -> Incident:
    """
    Uses STRATEGY PATTERN to assign a technician.
    If technician_id is explicitly given, skip strategy selection.
    """
    old_status = incident.status

    if technician_id is not None:
        # Validate that the technician user exists in the DB
        tech = db.query(User).filter(User.id == technician_id).first()
        if not tech:
            raise ValueError(f"Technician with User ID {technician_id} does not exist in database")
        if (
            incident.department_id is not None
            and tech.role == "TECHNICIAN"
            and db.query(User.id).filter(
                User.role == "TECHNICIAN",
                User.department_id == incident.department_id,
            ).first()
            and tech.department_id != incident.department_id
        ):
            raise ValueError("Selected technician belongs to a different department")
        incident.assigned_to_id = tech.id
    else:
        # Strategy Pattern: gather available technicians (preferring TECHNICIAN role)
        department_tech_query = (
            db.query(User, func.count(Incident.id).label("active_count"))
            .outerjoin(
                Incident,
                (Incident.assigned_to_id == User.id) &
                (Incident.status.in_(["ASSIGNED", "IN_PROGRESS"]))
            )
            .filter(
                User.role == "TECHNICIAN",
                User.department_id == incident.department_id,
            )
            .group_by(User.id)
        )
        technicians_raw = department_tech_query.all() if incident.department_id else []

        tech_query = (
            db.query(User, func.count(Incident.id).label("active_count"))
            .outerjoin(
                Incident,
                (Incident.assigned_to_id == User.id) &
                (Incident.status.in_(["ASSIGNED", "IN_PROGRESS"]))
            )
            .filter(User.role == "TECHNICIAN")
            .group_by(User.id)
        )
        if not technicians_raw:
            technicians_raw = tech_query.all()
        if not technicians_raw:
            technicians_raw = (
                db.query(User, func.count(Incident.id).label("active_count"))
                .outerjoin(
                    Incident,
                    (Incident.assigned_to_id == User.id) &
                    (Incident.status.in_(["ASSIGNED", "IN_PROGRESS"]))
                )
                .filter(User.role.in_(["TECHNICIAN", "OFFICER", "ADMIN"]))
                .group_by(User.id)
                .all()
            )
        technicians = [
            {
                "id": u.id,
                "name": u.name,
                "active_count": active_count,
                "specialization": getattr(u, "specialization", ""),
            }
            for u, active_count in technicians_raw
        ]

        strategy = get_assignment_strategy(strategy_name)
        selected = strategy.assign(
            incident_category=incident.category,
            incident_priority=incident.priority,
            technicians=technicians,
        )
        if selected is None:
            raise ValueError("No available technicians found in database")
        incident.assigned_to_id = selected["id"]

    changed_by = assigner_id or incident.assigned_to_id or incident.reporter_id

    # Transition status to ASSIGNED via State Pattern if needed
    if incident.status in ("REPORTED", "ESCALATED"):
        current_state = get_incident_state(incident.status)
        incident.status = current_state.transition_to("ASSIGNED")

    db.add(IncidentHistory(
        incident_id=incident.id,
        changed_by_id=changed_by,
        old_status=old_status,
        new_status="ASSIGNED",
        note=f"Assigned using {strategy_name} strategy to User #{incident.assigned_to_id}",
    ))

    admin_ids = [
        u.id for u in db.query(User).filter(User.role == "ADMIN").all()
    ]
    _notify_and_save(db, incident, old_status, changed_by, admin_ids)

    db.commit()
    db.refresh(incident)
    return incident


def get_incident_history(
    db: Session,
    incident_id: int
) -> list[IncidentHistory]:
    return (
        db.query(IncidentHistory)
        .filter(IncidentHistory.incident_id == incident_id)
        .order_by(IncidentHistory.changed_at)
        .all()
    )


def get_analytics(db: Session) -> dict:
    total = db.query(Incident).count()

    statuses = db.query(Incident.status, func.count(Incident.id)).group_by(Incident.status).all()
    categories = db.query(Incident.category, func.count(Incident.id)).group_by(Incident.category).all()
    priorities = db.query(Incident.priority, func.count(Incident.id)).group_by(Incident.priority).all()

    by_status = {s: c for s, c in statuses}
    by_category = {cat: c for cat, c in categories}
    by_priority = {p: c for p, c in priorities}

    return {
        "total_incidents": total,
        "open_incidents": by_status.get("REPORTED", 0) + by_status.get("ASSIGNED", 0) + by_status.get("IN_PROGRESS", 0),
        "resolved_incidents": by_status.get("RESOLVED", 0),
        "closed_incidents": by_status.get("CLOSED", 0),
        "critical_incidents": by_priority.get("CRITICAL", 0),
        "escalated_incidents": by_status.get("ESCALATED", 0),
        "by_category": by_category,
        "by_status": by_status,
        "by_priority": by_priority,
    }