from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    department_id: int | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "STUDENT"
    department_id: int | None = None


class UserDepartmentUpdate(BaseModel):
    department_id: int | None = None


class DepartmentCreate(BaseModel):
    name: str
    description: str | None = None


class DepartmentResponse(BaseModel):
    id: int
    name: str
    description: str | None
    is_reportable: bool = False

    model_config = ConfigDict(from_attributes=True)


class AnalyticsResponse(BaseModel):
    total_incidents: int
    open_incidents: int
    resolved_incidents: int
    closed_incidents: int
    critical_incidents: int
    escalated_incidents: int
    by_category: dict[str, int]
    by_status: dict[str, int]
    by_priority: dict[str, int]
