# =============================================================================
# PATTERN: OBSERVER
# =============================================================================
#
# Problem:
#   When an incident status changes, multiple parties need to be notified:
#   the student who reported it, the assigned technician, the officer, admin.
#   Without Observer, the status-change code would need explicit calls to
#   every notification target — tightly coupling them and making it hard
#   to add new notification recipients later.
#
# Solution:
#   The incident status change acts as the Subject (publisher).
#   Interested parties register as Observers (subscribers).
#   When the status changes, all registered observers are notified automatically.
#
# Architecture:
#   IncidentObserver (abstract)
#       ├── ReporterObserver    — notifies the student who reported
#       ├── TechnicianObserver  — notifies the assigned technician
#       └── AdminObserver       — notifies admins on critical changes
#
#   IncidentEventData — carries the event info to all observers
#   IncidentNotifier  — the Subject; manages the observer list
# =============================================================================

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class IncidentEvent:
    """
    Data passed to all observers when an incident changes.
    """
    incident_id: int
    incident_title: str
    old_status: str
    new_status: str
    changed_by_id: int
    reporter_id: int
    assigned_to_id: int | None
    priority: str


@dataclass
class NotificationRecord:
    """
    In-memory notification to be persisted to the DB.
    """
    user_id: int
    incident_id: int
    message: str


class IncidentObserver(ABC):
    """
    Abstract Observer — all notification types implement this.
    """

    @abstractmethod
    def update(self, event: IncidentEvent) -> list[NotificationRecord]:
        """
        Called when an incident event occurs.
        Returns a list of NotificationRecord objects to be saved.
        """
        pass


class ReporterObserver(IncidentObserver):
    """
    Notifies the student/staff who originally reported the incident.
    Always active — reporters always get notified.
    """

    def update(self, event: IncidentEvent) -> list[NotificationRecord]:
        message = (
            f"Your incident '{event.incident_title}' status changed: "
            f"{event.old_status} → {event.new_status}"
        )
        return [NotificationRecord(
            user_id=event.reporter_id,
            incident_id=event.incident_id,
            message=message
        )]


class TechnicianObserver(IncidentObserver):
    """
    Notifies the assigned technician when work is assigned or updated.
    Only fires if a technician is assigned to this incident.
    """

    def update(self, event: IncidentEvent) -> list[NotificationRecord]:
        if event.assigned_to_id is None:
            return []  # No technician assigned yet

        if event.assigned_to_id == event.reporter_id:
            return []  # Don't double-notify

        message = (
            f"Incident '{event.incident_title}' assigned to you. "
            f"New status: {event.new_status}"
        )
        return [NotificationRecord(
            user_id=event.assigned_to_id,
            incident_id=event.incident_id,
            message=message
        )]


class AdminObserver(IncidentObserver):
    """
    Notifies admins when a CRITICAL or ESCALATED incident changes.
    Requires the admin user IDs to be injected at construction.
    """

    def __init__(self, admin_user_ids: list[int]):
        self.admin_user_ids = admin_user_ids

    def update(self, event: IncidentEvent) -> list[NotificationRecord]:
        # Only fire for critical priority or escalation events
        if event.priority not in ("CRITICAL", "HIGH") and event.new_status != "ESCALATED":
            return []

        records = []
        for admin_id in self.admin_user_ids:
            if admin_id == event.changed_by_id:
                continue  # Don't notify the person who made the change
            message = (
                f"[{event.priority}] Incident '{event.incident_title}' "
                f"changed to {event.new_status} — review required."
            )
            records.append(NotificationRecord(
                user_id=admin_id,
                incident_id=event.incident_id,
                message=message
            ))
        return records


class IncidentNotifier:
    """
    The Subject in the Observer Pattern.
    Maintains a list of observers and notifies all of them when an event occurs.
    """

    def __init__(self):
        self._observers: list[IncidentObserver] = []

    def subscribe(self, observer: IncidentObserver) -> None:
        self._observers.append(observer)

    def unsubscribe(self, observer: IncidentObserver) -> None:
        self._observers.remove(observer)

    def notify(self, event: IncidentEvent) -> list[NotificationRecord]:
        """
        Notifies all registered observers and collects all notification records.
        """
        all_records: list[NotificationRecord] = []
        for observer in self._observers:
            records = observer.update(event)
            all_records.extend(records)
        return all_records
