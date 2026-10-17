# =============================================================================
# PATTERN: CHAIN OF RESPONSIBILITY
# =============================================================================
#
# Problem:
#   Incident escalation involves multiple levels — if the technician cannot
#   resolve the incident, it goes to the supervisor, then officer, then admin.
#   Without CoR, the escalation logic would be a deeply nested if/else block
#   tightly coupled to every role's logic.
#
# Solution:
#   Build a chain of handlers. Each handler either processes the escalation
#   or passes it to the next handler in the chain. The sender doesn't know
#   which handler will ultimately respond.
#
# Architecture:
#   EscalationHandler (abstract)
#       ├── TechnicianHandler     — Can handle: LOW, MEDIUM
#       ├── SupervisorHandler     — Can handle: MEDIUM, HIGH
#       ├── OfficerHandler        — Can handle: HIGH, CRITICAL
#       └── AdminHandler          — Handles everything (final handler)
#
# Routing by priority:
#   LOW      → TechnicianHandler
#   MEDIUM   → SupervisorHandler
#   HIGH     → OfficerHandler
#   CRITICAL → AdminHandler
# =============================================================================

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class EscalationRequest:
    """
    Represents an escalation request passed through the chain.
    """
    incident_id: int
    incident_title: str
    priority: str
    current_status: str
    reason: str


@dataclass
class EscalationResult:
    """
    Result returned when a handler accepts the escalation.
    """
    handled_by: str       # Handler name (role level)
    action: str           # What they will do
    escalated_to: str     # Which role/person is now responsible


class EscalationHandler(ABC):
    """
    Abstract handler — each level implements this interface.
    """

    def __init__(self):
        self._next_handler: "EscalationHandler | None" = None

    def set_next(self, handler: "EscalationHandler") -> "EscalationHandler":
        """Chain handlers together. Returns the handler for fluent chaining."""
        self._next_handler = handler
        return handler

    def handle(self, request: EscalationRequest) -> EscalationResult | None:
        """
        Try to handle the request. If this handler cannot manage it,
        pass it to the next handler in the chain.
        """
        if self._can_handle(request):
            return self._process(request)

        if self._next_handler:
            return self._next_handler.handle(request)

        return None  # No handler could manage it

    @abstractmethod
    def _can_handle(self, request: EscalationRequest) -> bool:
        """Returns True if this handler should process this request."""
        pass

    @abstractmethod
    def _process(self, request: EscalationRequest) -> EscalationResult:
        """Process the escalation and return a result."""
        pass


class TechnicianHandler(EscalationHandler):
    """
    First in chain. Handles LOW priority incidents only.
    Most incidents pass through this to higher levels.
    """

    def _can_handle(self, request: EscalationRequest) -> bool:
        return request.priority == "LOW"

    def _process(self, request: EscalationRequest) -> EscalationResult:
        return EscalationResult(
            handled_by="Technician",
            action="Reassign to available technician",
            escalated_to="TECHNICIAN"
        )


class SupervisorHandler(EscalationHandler):
    """
    Second in chain. Handles LOW and MEDIUM priority incidents.
    """

    def _can_handle(self, request: EscalationRequest) -> bool:
        return request.priority in ("LOW", "MEDIUM")

    def _process(self, request: EscalationRequest) -> EscalationResult:
        return EscalationResult(
            handled_by="Supervisor",
            action="Review incident and coordinate response team",
            escalated_to="OFFICER"
        )


class OfficerHandler(EscalationHandler):
    """
    Third in chain. Handles HIGH priority incidents.
    """

    def _can_handle(self, request: EscalationRequest) -> bool:
        return request.priority in ("LOW", "MEDIUM", "HIGH")

    def _process(self, request: EscalationRequest) -> EscalationResult:
        return EscalationResult(
            handled_by="Department Officer",
            action="Take direct command of incident response",
            escalated_to="OFFICER"
        )


class AdminHandler(EscalationHandler):
    """
    Final handler. Handles everything — ensures no request falls through.
    """

    def _can_handle(self, request: EscalationRequest) -> bool:
        return True  # Admin handles everything

    def _process(self, request: EscalationRequest) -> EscalationResult:
        return EscalationResult(
            handled_by="System Administrator",
            action="Emergency override — mobilize all resources",
            escalated_to="ADMIN"
        )


def build_escalation_chain() -> EscalationHandler:
    """
    Builds and returns the full escalation chain.
    Order: Technician → Supervisor → Officer → Admin
    """
    technician = TechnicianHandler()
    supervisor = SupervisorHandler()
    officer = OfficerHandler()
    admin = AdminHandler()

    # Chain them together
    technician.set_next(supervisor).set_next(officer).set_next(admin)

    return technician  # Return the first handler — requests enter here
