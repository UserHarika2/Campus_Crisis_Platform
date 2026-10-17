from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_role
from app.auth.security import hash_password
from app.database.connection import get_db
from app.models.user import User
from app.models.department import Department
from app.schemas.admin import (
    UserCreate,
    UserResponse,
    DepartmentCreate,
    DepartmentResponse,
    UserDepartmentUpdate,
)


router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"]
)


# ─── USERS ────────────────────────────────────────────────────

@router.get(
    "/users",
    response_model=list[UserResponse]
)
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "OFFICER"))
):
    return db.query(User).all()


@router.post(
    "/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    if user_data.department_id is not None:
        if user_data.role != "TECHNICIAN":
            raise HTTPException(
                status_code=400,
                detail="Only technicians can be assigned to a department"
            )
        department = db.query(Department).filter(
            Department.id == user_data.department_id
        ).first()
        if department is None:
            raise HTTPException(status_code=400, detail="Department not found")

    user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
        department_id=user_data.department_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get(
    "/users/{user_id}",
    response_model=UserResponse
)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch(
    "/users/{user_id}/department",
    response_model=UserResponse
)
def update_user_department(
    user_id: int,
    department_data: UserDepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != "TECHNICIAN":
        raise HTTPException(
            status_code=400,
            detail="Only technicians can be assigned to a department"
        )
    if department_data.department_id is not None:
        department = db.query(Department).filter(
            Department.id == department_data.department_id
        ).first()
        if department is None:
            raise HTTPException(status_code=400, detail="Department not found")

    user.department_id = department_data.department_id
    db.commit()
    db.refresh(user)
    return user


# ─── DEPARTMENTS ──────────────────────────────────────────────

@router.get(
    "/departments",
    response_model=list[DepartmentResponse]
)
def list_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "OFFICER"))
):
    return db.query(Department).all()


@router.post(
    "/departments",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED
)
def create_department(
    dept_data: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    existing = db.query(Department).filter(Department.name == dept_data.name).first()
    if existing:
        if existing.is_reportable:
            raise HTTPException(status_code=400, detail="Department already exists")
        existing.is_reportable = True
        if dept_data.description is not None:
            existing.description = dept_data.description
        db.commit()
        db.refresh(existing)
        return existing

    dept = Department(
        name=dept_data.name,
        description=dept_data.description,
        is_reportable=True,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept
