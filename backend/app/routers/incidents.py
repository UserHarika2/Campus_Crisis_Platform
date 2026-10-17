from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_role
from app.auth.permissions import can_transition_to
from app.database.connection import get_db
from app.crud.incident import (
    get_incidents,
    get_my_incidents,
    get_incident_by_id,
    update_incident_status,
    assign_technician,
    get_incident_history,
    get_analytics,
)
from app.facades.incident_facade import IncidentFacade
from app.chains.escalation_chain import build_escalation_chain, EscalationRequest
from app.models.user import User
from app.models.department import Department
from app.schemas.incident import (
    IncidentCreate,
    IncidentResponse,
    IncidentStatusUpdate,
    IncidentAssign,
    IncidentHistoryResponse,
)
from app.schemas.admin import AnalyticsResponse, DepartmentResponse, UserResponse


router = APIRouter(
    prefix="/api/incidents",
    tags=["Incidents"]
)


@router.get(
    "/technicians",
    response_model=list[UserResponse]
)
def list_available_technicians(
    department_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List available technician accounts for assignment dropdowns."""
    tech_query = db.query(User).filter(User.role == "TECHNICIAN")
    if department_id is not None:
        department_techs = tech_query.filter(
            User.department_id == department_id
        ).all()
        if department_techs:
            return department_techs
    techs = tech_query.all()
    if not techs:
        techs = db.query(User).filter(User.role.in_(["TECHNICIAN", "OFFICER", "ADMIN"])).all()
    return techs


@router.get("/departments", response_model=list[DepartmentResponse])
def list_reportable_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List departments enabled by an administrator for incident reporting."""
    return (
        db.query(Department)
        .filter(Department.is_reportable.is_(True))
        .order_by(Department.name)
        .all()
    )


@router.post(
    "/",
    response_model=IncidentResponse,
    status_code=status.HTTP_201_CREATED
)
def create_new_incident(
    incident_data: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create an incident using the FACADE PATTERN.
    Internally uses Factory Method, Observer, and Adapter.
    """
    if incident_data.department_id is not None:
        department = db.query(Department).filter(
            Department.id == incident_data.department_id,
            Department.is_reportable.is_(True),
        ).first()
        if department is None:
            raise HTTPException(status_code=400, detail="Department is not available for reporting")
        if incident_data.category != department.name:
            raise HTTPException(
                status_code=400,
                detail="Incident category must match the selected department"
            )
    elif incident_data.category not in {"Hostel", "Tech", "Infrastructure"}:
        raise HTTPException(
            status_code=400,
            detail="Select an available department for the incident category"
        )

    facade = IncidentFacade(db)
    return facade.report_incident(
        title=incident_data.title,
        description=incident_data.description,
        category=incident_data.category,
        priority=incident_data.priority,
        location=incident_data.location,
        reporter_id=current_user.id,
        department_id=incident_data.department_id,
    )


@router.get(
    "/",
    response_model=list[IncidentResponse]
)
def read_incidents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Students may only see their own reports; staff can see campus incidents."""
    if current_user.role == "STUDENT":
        return get_my_incidents(db, current_user.id)
    return get_incidents(db)


@router.get(
    "/analytics",
    response_model=AnalyticsResponse
)
def read_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "OFFICER"))
):
    """Analytics — ADMIN and OFFICER only."""
    return get_analytics(db)


@router.get(
    "/{incident_id}",
    response_model=IncidentResponse
)
def read_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    incident = get_incident_by_id(db, incident_id)
    if incident is None or (
        current_user.role == "STUDENT" and incident.reporter_id != current_user.id
    ):
        raise HTTPException(status_code=404, detail="Incident not found")

    return incident


@router.get(
    "/{incident_id}/history",
    response_model=list[IncidentHistoryResponse]
)
def read_incident_history(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Full audit trail of an incident's lifecycle."""
    incident = get_incident_by_id(db, incident_id)
    if incident is None or (
        current_user.role == "STUDENT" and incident.reporter_id != current_user.id
    ):
        raise HTTPException(status_code=404, detail="Incident not found")
    return get_incident_history(db, incident_id)


@router.patch(
    "/{incident_id}/status",
    response_model=IncidentResponse
)
def change_incident_status(
    incident_id: int,
    status_data: IncidentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Change incident status using STATE PATTERN (validation) +
    PERMISSION LAYER (authorization) + OBSERVER (notifications).
    """
    incident = get_incident_by_id(db, incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Students can only update their own incidents (for CLOSED/REOPENED)
    if current_user.role == "STUDENT" and incident.reporter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # PERMISSION CHECK — role allowed to trigger this target status?
    if not can_transition_to(current_user.role, status_data.status):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Role '{current_user.role}' is not permitted "
                f"to set status to '{status_data.status}'"
            )
        )

    # STATE PATTERN — is this a valid transition from current state?
    try:
        return update_incident_status(
            db=db,
            incident=incident,
            new_status=status_data.status,
            changed_by_id=current_user.id,
            note=status_data.note,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        )


@router.post(
    "/{incident_id}/assign",
    response_model=IncidentResponse
)
def assign_incident(
    incident_id: int,
    assign_data: IncidentAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("OFFICER", "ADMIN", "TECHNICIAN"))
):
    """
    Assign a technician using STRATEGY PATTERN or manual claim.
    Officers, Admins, and Technicians allowed.
    """
    incident = get_incident_by_id(db, incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    try:
        return assign_technician(
            db=db,
            incident=incident,
            strategy_name=assign_data.strategy,
            technician_id=assign_data.technician_id,
            assigner_id=current_user.id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        )


@router.post(
    "/{incident_id}/escalate",
    response_model=dict
)
def escalate_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("OFFICER", "ADMIN", "SECURITY", "TECHNICIAN"))
):
    """
    Escalate an incident using CHAIN OF RESPONSIBILITY PATTERN.
    The chain automatically determines which level handles it.
    """
    incident = get_incident_by_id(db, incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Build the chain: Technician → Supervisor → Officer → Admin
    chain = build_escalation_chain()

    request = EscalationRequest(
        incident_id=incident.id,
        incident_title=incident.title,
        priority=incident.priority,
        current_status=incident.status,
        reason=f"Escalated by {current_user.role} ({current_user.name})"
    )

    result = chain.handle(request)

    if result is None:
        raise HTTPException(status_code=400, detail="Escalation could not be processed")

    # Update status to ESCALATED via State Pattern
    try:
        update_incident_status(
            db=db,
            incident=incident,
            new_status="ESCALATED",
            changed_by_id=current_user.id,
            note=f"Chain handled by: {result.handled_by}. Action: {result.action}",
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    return {
        "message": "Incident escalated successfully",
        "handled_by": result.handled_by,
        "action": result.action,
        "escalated_to": result.escalated_to,
        "incident_id": incident_id,
    }