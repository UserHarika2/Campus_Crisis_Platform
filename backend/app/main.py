from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.connection import engine, Base
from app.database.schema_migrations import ensure_department_columns
from app.routers.auth import router as auth_router
from app.routers.incidents import router as incident_router
from app.routers.notifications import router as notification_router
from app.routers.admin import router as admin_router

Base.metadata.create_all(bind=engine)
ensure_department_columns()

app = FastAPI(
    title="Campus Crisis & Resource Coordination Platform",
    description=(
        "API for managing campus incidents, assignments, escalations and notifications. "
        "Implements: Factory Method, Strategy, Chain of Responsibility, State, "
        "Observer, Facade, and Adapter design patterns."
    ),
    version="1.0.0",
)

# CORS — allows the React frontend on port 5173 to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(incident_router)
app.include_router(notification_router)
app.include_router(admin_router)


@app.get("/")
def root():
    return {
        "message": "Campus Crisis Platform API is running",
        "docs": "http://127.0.0.1:8001/docs",
        "version": "1.0.0"
    }