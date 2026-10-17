# =============================================================================
# PERMISSION LAYER — Role-Based Status Transition Access
# =============================================================================
#
# Design Principle: Single Responsibility Principle (SRP)
#
# The STATE PATTERN answers:  "Is this transition logically valid?"
#   e.g. REPORTED → CLOSED is invalid regardless of who tries it.
#
# This module answers:        "Is this USER ROLE allowed to make it?"
#   e.g. STUDENT cannot ASSIGN an incident even if the transition is valid.
#
# These two concerns are deliberately kept in separate layers.
# =============================================================================

# Maps each target status to the list of roles allowed to trigger it.
TRANSITION_PERMISSIONS: dict[str, list[str]] = {
    # Officers, Admins, and Technicians can assign/claim an incident
    "ASSIGNED": ["OFFICER", "ADMIN", "TECHNICIAN"],

    # Technicians, Admins, and Officers can start work on an incident
    "IN_PROGRESS": ["TECHNICIAN", "ADMIN", "OFFICER"],

    # Technicians and Admins can mark work as resolved
    "RESOLVED": ["TECHNICIAN", "ADMIN"],

    # Students (reporters), Officers, and Admins can confirm and close an incident
    "CLOSED": ["STUDENT", "OFFICER", "ADMIN"],

    # Students (reporters), Admins, and Officers can reopen a resolved incident
    "REOPENED": ["STUDENT", "ADMIN", "OFFICER"],

    # Officers, Admins, Security, and Technicians can escalate incidents
    "ESCALATED": ["OFFICER", "ADMIN", "SECURITY", "TECHNICIAN"],
}


def can_transition_to(role: str, target_status: str) -> bool:
    """
    Returns True if the given role is permitted to transition
    an incident to the target_status.
    """
    allowed_roles = TRANSITION_PERMISSIONS.get(target_status, [])
    return role in allowed_roles
