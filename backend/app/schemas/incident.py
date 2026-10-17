from datetime import datetime
from pydantic import BaseModel, ConfigDict


class IncidentCreate(BaseModel):
    title: str
    description: str
    category: str
    priority: str = "MEDIUM"
    location: str
    department_id: int | None = None


class IncidentResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    priority: str
    status: str
    location: str
    reporter_id: int
    department_id: int | None
    assigned_to_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IncidentStatusUpdate(BaseModel):
    status: str
    note: str | None = None


class IncidentAssign(BaseModel):
    technician_id: int | None = None
    strategy: str = "least_busy"  # least_busy | specialized | priority


class IncidentHistoryResponse(BaseModel):
    id: int
    incident_id: int
    changed_by_id: int
    old_status: str
    new_status: str
    note: str | None
    changed_at: datetime

    model_config = ConfigDict(from_attributes=True)