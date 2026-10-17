from abc import ABC, abstractmethod


class IncidentState(ABC):

    @abstractmethod
    def transition_to(self, new_status: str) -> str:
        pass


class ReportedState(IncidentState):

    def transition_to(self, new_status: str) -> str:

        if new_status == "ASSIGNED":
            return "ASSIGNED"

        if new_status == "ESCALATED":
            return "ESCALATED"

        raise ValueError(
            "REPORTED incident can only move to ASSIGNED or ESCALATED"
        )


class AssignedState(IncidentState):

    def transition_to(self, new_status: str) -> str:

        if new_status in ("IN_PROGRESS", "RESOLVED", "ESCALATED"):
            return new_status

        raise ValueError(
            "ASSIGNED incident can only move to IN_PROGRESS, RESOLVED, or ESCALATED"
        )


class InProgressState(IncidentState):

    def transition_to(self, new_status: str) -> str:

        if new_status == "RESOLVED":
            return "RESOLVED"

        if new_status == "ESCALATED":
            return "ESCALATED"

        raise ValueError(
            "IN_PROGRESS incident can only move to RESOLVED or ESCALATED"
        )


class ResolvedState(IncidentState):

    def transition_to(self, new_status: str) -> str:

        if new_status == "CLOSED":
            return "CLOSED"

        if new_status == "REOPENED":
            return "REOPENED"

        raise ValueError(
            "RESOLVED incident can only move to CLOSED or REOPENED"
        )


class ClosedState(IncidentState):

    def transition_to(self, new_status: str) -> str:

        raise ValueError(
            "CLOSED incident cannot be changed"
        )


class EscalatedState(IncidentState):

    def transition_to(self, new_status: str) -> str:

        if new_status == "ASSIGNED":
            return "ASSIGNED"

        raise ValueError(
            "ESCALATED incident can only move to ASSIGNED"
        )


class ReopenedState(IncidentState):

    def transition_to(self, new_status: str) -> str:

        if new_status == "IN_PROGRESS":
            return "IN_PROGRESS"

        if new_status == "ESCALATED":
            return "ESCALATED"

        raise ValueError(
            "REOPENED incident can only move to IN_PROGRESS or ESCALATED"
        )

def get_incident_state(status: str) -> IncidentState:

    states = {
        "REPORTED": ReportedState(),
        "ASSIGNED": AssignedState(),
        "IN_PROGRESS": InProgressState(),
        "RESOLVED": ResolvedState(),
        "CLOSED": ClosedState(),
        "ESCALATED": EscalatedState(),
        "REOPENED": ReopenedState(),
    }

    if status not in states:
        raise ValueError(
            f"Invalid incident status: {status}"
        )

    return states[status]