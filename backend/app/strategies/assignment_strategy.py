# =============================================================================
# PATTERN: STRATEGY
# =============================================================================
#
# Problem:
#   Technician assignment needs to support multiple algorithms:
#   - Assign the technician with the fewest active incidents (least busy)
#   - Assign based on category specialization
#   - Assign based on incident priority
#
#   Without Strategy, we'd need a massive if/elif block and changing the
#   algorithm would require modifying the core assignment service.
#
# Solution:
#   Define a family of assignment algorithms, encapsulate each one,
#   and make them interchangeable. The assignment service uses whichever
#   strategy is passed in, without knowing its internal implementation.
#
# Architecture:
#   AssignmentStrategy (abstract)
#       ├── LeastBusyStrategy     — fewest active incidents
#       ├── SpecializedStrategy   — category-matched technician
#       └── PriorityBasedStrategy — CRITICAL → most experienced
#
# Usage:
#   strategy = LeastBusyStrategy()
#   technician = strategy.assign(incident, available_technicians)
# =============================================================================

from abc import ABC, abstractmethod


class AssignmentStrategy(ABC):
    """
    Abstract Strategy — all assignment algorithms implement this interface.
    """

    @abstractmethod
    def assign(
        self,
        incident_category: str,
        incident_priority: str,
        technicians: list[dict],
    ) -> dict | None:
        """
        Given a list of available technician dicts, return the best one.
        Each technician dict has: id, name, active_count, specialization
        Returns None if no technician is available.
        """
        pass

    def _get_name(self) -> str:
        return self.__class__.__name__


class LeastBusyStrategy(AssignmentStrategy):
    """
    Assigns the technician with the fewest currently active incidents.
    Best for general workload balancing.
    """

    def assign(self, incident_category, incident_priority, technicians):
        if not technicians:
            return None
        return min(technicians, key=lambda t: t["active_count"])


class SpecializedStrategy(AssignmentStrategy):
    """
    Assigns a technician whose specialization matches the incident category.
    Falls back to LeastBusy if no specialist is found.
    """

    def assign(self, incident_category, incident_priority, technicians):
        if not technicians:
            return None

        # Find technicians specialized in this category
        specialists = [
            t for t in technicians
            if t.get("specialization", "").upper() == incident_category.upper()
        ]

        if specialists:
            # Among specialists, pick the least busy
            return min(specialists, key=lambda t: t["active_count"])

        # Fallback: least busy among all
        return min(technicians, key=lambda t: t["active_count"])


class PriorityBasedStrategy(AssignmentStrategy):
    """
    For CRITICAL incidents, assigns the most experienced technician
    (least active_count as a proxy for availability/experience).
    For lower priority, assigns the least busy.
    """

    def assign(self, incident_category, incident_priority, technicians):
        if not technicians:
            return None

        if incident_priority in ("CRITICAL", "HIGH"):
            # Pick most available (lowest workload) for urgent cases
            return min(technicians, key=lambda t: t["active_count"])

        # For MEDIUM/LOW — still least busy
        return min(technicians, key=lambda t: t["active_count"])


# Map strategy name to class for API selection
STRATEGY_MAP: dict[str, type[AssignmentStrategy]] = {
    "least_busy":   LeastBusyStrategy,
    "specialized":  SpecializedStrategy,
    "priority":     PriorityBasedStrategy,
}


def get_assignment_strategy(name: str = "least_busy") -> AssignmentStrategy:
    """Returns the strategy instance by name. Defaults to LeastBusy."""
    strategy_class = STRATEGY_MAP.get(name, LeastBusyStrategy)
    return strategy_class()
