# =============================================================================
# PATTERN: FACTORY METHOD
# =============================================================================
#
# Problem:
#   When creating an incident, we need to handle different categories
#   (Medical, Security, Hostel, IT, etc.) differently — each has its own
#   default priority, department classification, and urgency rules.
#   Without Factory, we'd end up with one giant if/elif block in the
#   create_incident function that becomes impossible to maintain.
#
# Solution:
#   The Factory Method pattern defines an interface for creating objects
#   but lets subclasses (concrete factories) decide which class to instantiate.
#   Each incident category gets its own factory with its own defaults and rules.
#
# Architecture:
#   IncidentFactory (abstract base)
#       ├── MedicalIncidentFactory
#       ├── SecurityIncidentFactory
#       ├── HostelIncidentFactory
#       ├── ITIncidentFactory
#       ├── InfrastructureIncidentFactory
#       ├── TransportIncidentFactory
#       └── OtherIncidentFactory
#
# Golden Scenario:
#   Student reports "Water Leakage - Hostel A"
#   → category = "Hostel"
#   → HostelIncidentFactory.create() sets:
#       priority = "HIGH" (overrides MEDIUM default)
#       department_hint = "Hostel Maintenance"
# =============================================================================

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class IncidentData:
    """
    Represents a resolved incident ready to be saved.
    The factory produces this from raw user input.
    """
    title: str
    description: str
    category: str
    priority: str
    location: str
    department_hint: str  # suggested department name for auto-assignment
    reporter_id: int
    department_id: int | None = None


class IncidentFactory(ABC):
    """
    Abstract Factory — defines the interface for creating incident data.
    Subclasses implement create() with category-specific logic.
    """

    @abstractmethod
    def create(
        self,
        title: str,
        description: str,
        priority: str,
        location: str,
        reporter_id: int,
        department_id: int | None = None,
    ) -> IncidentData:
        pass

    def _make(
        self,
        title: str,
        description: str,
        category: str,
        priority: str,
        location: str,
        reporter_id: int,
        department_hint: str,
        department_id: int | None,
    ) -> IncidentData:
        return IncidentData(
            title=title,
            description=description,
            category=category,
            priority=priority,
            location=location,
            reporter_id=reporter_id,
            department_hint=department_hint,
            department_id=department_id,
        )


class MedicalIncidentFactory(IncidentFactory):
    """Medical emergencies — always CRITICAL priority."""

    def create(self, title, description, priority, location, reporter_id, department_id=None):
        return self._make(
            title=title,
            description=description,
            category="Medical",
            priority="CRITICAL",  # Medical always escalates to CRITICAL
            location=location,
            reporter_id=reporter_id,
            department_hint="Medical Center",
            department_id=department_id,
        )


class SecurityIncidentFactory(IncidentFactory):
    """Security/fire incidents — HIGH or CRITICAL priority."""

    def create(self, title, description, priority, location, reporter_id, department_id=None):
        resolved_priority = "CRITICAL" if priority == "LOW" else priority
        return self._make(
            title=title,
            description=description,
            category="Security",
            priority=resolved_priority,
            location=location,
            reporter_id=reporter_id,
            department_hint="Security Department",
            department_id=department_id,
        )


class HostelIncidentFactory(IncidentFactory):
    """Hostel maintenance incidents."""

    def create(self, title, description, priority, location, reporter_id, department_id=None):
        return self._make(
            title=title,
            description=description,
            category="Hostel",
            priority=priority,
            location=location,
            reporter_id=reporter_id,
            department_hint="Hostel Maintenance",
            department_id=department_id,
        )


class ITIncidentFactory(IncidentFactory):
    """IT/network incidents."""

    def create(self, title, description, priority, location, reporter_id, department_id=None):
        return self._make(
            title=title,
            description=description,
            category="Tech",
            priority=priority,
            location=location,
            reporter_id=reporter_id,
            department_hint="IT Department",
            department_id=department_id,
        )


class InfrastructureIncidentFactory(IncidentFactory):
    """Roads, lights, buildings."""

    def create(self, title, description, priority, location, reporter_id, department_id=None):
        return self._make(
            title=title,
            description=description,
            category="Infrastructure",
            priority=priority,
            location=location,
            reporter_id=reporter_id,
            department_hint="Facilities Management",
            department_id=department_id,
        )


class TransportIncidentFactory(IncidentFactory):
    """Transport/vehicle incidents."""

    def create(self, title, description, priority, location, reporter_id, department_id=None):
        return self._make(
            title=title,
            description=description,
            category="Transport",
            priority=priority,
            location=location,
            reporter_id=reporter_id,
            department_hint="Transport Department",
            department_id=department_id,
        )


class OtherIncidentFactory(IncidentFactory):
    """Catch-all for uncategorized incidents."""

    def create(self, title, description, priority, location, reporter_id, department_id=None):
        return self._make(
            title=title,
            description=description,
            category="Other",
            priority=priority,
            location=location,
            reporter_id=reporter_id,
            department_hint="General Administration",
            department_id=department_id,
        )


class DepartmentIncidentFactory(IncidentFactory):
    """Creates an incident for a department configured by an administrator."""

    def __init__(self, category: str):
        self.category = category

    def create(self, title, description, priority, location, reporter_id, department_id=None):
        return self._make(
            title=title,
            description=description,
            category=self.category,
            priority=priority,
            location=location,
            reporter_id=reporter_id,
            department_hint=self.category,
            department_id=department_id,
        )


# Registry — maps category string to factory class
_FACTORY_REGISTRY: dict[str, type[IncidentFactory]] = {
    "Medical":        MedicalIncidentFactory,
    "Security":       SecurityIncidentFactory,
    "Hostel":         HostelIncidentFactory,
    "IT":             ITIncidentFactory,
    "Tech":           ITIncidentFactory,
    "Infrastructure": InfrastructureIncidentFactory,
    "Transport":      TransportIncidentFactory,
    "Other":          OtherIncidentFactory,
}


def get_incident_factory(
    category: str,
    preserve_category: bool = False,
) -> IncidentFactory:
    """
    Returns the appropriate factory for a given incident category.
    Preserves department names configured by administrators.
    """
    if preserve_category:
        return DepartmentIncidentFactory(category)
    factory_class = _FACTORY_REGISTRY.get(category)
    if factory_class is not None:
        return factory_class()
    return DepartmentIncidentFactory(category)
