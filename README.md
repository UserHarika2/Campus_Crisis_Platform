# 🏫 Campus Crisis & Resource Coordination Platform

A full-stack, enterprise-grade emergency management and incident response system designed as a practical implementation of **7 Gang of Four (GoF) Design Patterns**.

---

## 📌 Project Overview

The **Campus Crisis & Resource Coordination Platform** enables students, staff, security officers, technicians, and administrators to report, classify, assign, escalate, and resolve campus emergencies (medical crises, fire/security alerts, hostel maintenance issues, IT outages, and infrastructure breakdowns).

### Key Features
- **Multi-Role Access Control**: 5 distinct roles (`STUDENT`, `OFFICER`, `TECHNICIAN`, `SECURITY`, `ADMIN`).
- **Real-Time Incident Reporting**: Auto-classification and priority assignment based on category.
- **Dynamic Technician Assignment**: Algorithm-driven workload distribution.
- **Multi-Tier Escalation**: Hierarchical issue handling chain.
- **Audit Logging & Timeline**: Immutable history tracking every status change.
- **Notification Subsystems**: Observer-driven internal notifications and external dispatch adapter.
- **Analytics Dashboard**: Graphical breakdown of incidents by priority, status, and category.

---

## 🏛️ System Architecture

```
                               ┌─────────────────────────┐
                               │  Vite + React + TS UI   │
                               │  (Tailwind CSS Frontend)│
                               └────────────┬────────────┘
                                            │ HTTP / Axios REST
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   FastAPI Backend                                      │
│                                                                                        │
│  ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐               │
│  │   Auth / JWT      │    │  Incidents Router │    │  Admin Router     │               │
│  └─────────┬─────────┘    └─────────┬─────────┘    └─────────┬─────────┘               │
│            │                        │                        │                         │
│            ▼                        ▼                        ▼                         │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                            DESIGN PATTERN ENGINE                                 │  │
│  │                                                                                  │  │
│  │  1. Facade Pattern          ── Orchestrates reporting pipeline                   │  │
│  │  2. Factory Method Pattern   ── Instantiates category incident rules             │  │
│  │  3. Strategy Pattern         ── Workload balancing algorithms                     │  │
│  │  4. State Pattern            ── Lifecycle state transitions                      │  │
│  │  5. Chain of Responsibility  ── Multi-tier escalation                            │  │
│  │  6. Observer Pattern        ── Event-driven notification dispatch               │  │
│  │  7. Adapter Pattern          ── External email/SMS bridge                        │  │
│  └──────────────────────────────────┬───────────────────────────────────────────────┘  │
│                                     │ SQLAlchemy ORM                                   │
│                                     ▼                                                  │
│                          ┌─────────────────────┐                                       │
│                          │  PostgreSQL Database│                                       │
│                          └─────────────────────┘                                       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Design Patterns Implementation Details

| # | Design Pattern | Code File | Purpose & Presentation Notes |
|---|----------------|-----------|------------------------------|
| 1 | **Factory Method** | [app/factories/incident_factory.py](file:///d:/Thoery/Campus_Crisis_Platform/backend/app/factories/incident_factory.py) | Defines abstract `IncidentFactory` and 7 concrete factories (`Medical`, `Security`, `Hostel`, `IT`, `Infrastructure`, `Transport`, `Other`). Encapsulates category defaults (e.g. Medical auto-escalates priority to `CRITICAL`). |
| 2 | **Strategy** | [app/strategies/assignment_strategy.py](file:///d:/Thoery/Campus_Crisis_Platform/backend/app/strategies/assignment_strategy.py) | Encapsulates technician assignment algorithms: `LeastBusyStrategy` (minimizes active count), `SpecializedStrategy` (matches skill category), and `PriorityBasedStrategy` (reserves top techs for critical issues). |
| 3 | **Chain of Responsibility** | [app/chains/escalation_chain.py](file:///d:/Thoery/Campus_Crisis_Platform/backend/app/chains/escalation_chain.py) | Builds an escalation chain (`TechnicianHandler` → `SupervisorHandler` → `OfficerHandler` → `AdminHandler`). Each handler either resolves the request or passes it up the hierarchy. |
| 4 | **State** | [app/states/incident_state.py](file:///d:/Thoery/Campus_Crisis_Platform/backend/app/states/incident_state.py) | Represents incident states (`Reported`, `Assigned`, `InProgress`, `Resolved`, `Closed`, `Escalated`, `Reopened`) as objects. Prevents illegal transitions (e.g. `REPORTED` directly to `CLOSED`). |
| 5 | **Observer** | [app/observers/notification_observer.py](file:///d:/Thoery/Campus_Crisis_Platform/backend/app/observers/notification_observer.py) | Implements pub-sub notification dispatch. `IncidentNotifier` (Subject) notifies `ReporterObserver`, `TechnicianObserver`, and `AdminObserver` automatically on status changes. |
| 6 | **Facade** | [app/facades/incident_facade.py](file:///d:/Thoery/Campus_Crisis_Platform/backend/app/facades/incident_facade.py) | Hides subsystem complexity behind a single `report_incident()` interface that coordinates Factory creation, DB saving, Department lookup, Observer notifications, Audit logging, and Adapter dispatch. |
| 7 | **Adapter** | [app/adapters/notification_adapter.py](file:///d:/Thoery/Campus_Crisis_Platform/backend/app/adapters/notification_adapter.py) | Wraps third-party incompatible messaging services (`MockEmailProvider`, `MockSMSProvider`) to implement our internal `NotificationService` interface. |

---

## 📁 Repository Directory Structure

```text
Campus_Crisis_Platform/
├── backend/
│   ├── app/
│   │   ├── adapters/        # Adapter Pattern (Email & SMS bridges)
│   │   ├── auth/            # JWT authentication & security dependencies
│   │   ├── chains/          # Chain of Responsibility Pattern (Escalation)
│   │   ├── crud/            # Database queries & domain operations
│   │   ├── database/        # Connection pool & DB initialization
│   │   ├── facades/         # Facade Pattern (Incident creation subsystem)
│   │   ├── factories/       # Factory Method Pattern (7 Incident Factories)
│   │   ├── models/          # SQLAlchemy ORM Models (User, Incident, History, Notification, Dept)
│   │   ├── observers/       # Observer Pattern (Event notification dispatchers)
│   │   ├── routers/         # FastAPI endpoints (/auth, /incidents, /notifications, /admin)
│   │   ├── schemas/         # Pydantic validation schemas
│   │   ├── states/          # State Pattern (Incident lifecycle transition rules)
│   │   ├── strategies/      # Strategy Pattern (Technician assignment algorithms)
│   │   └── main.py          # FastAPI application entrypoint & CORS configuration
│   ├── seed_db.py           # Auto DB table setup & demo accounts seed script
│   ├── test_all_patterns.py # Automated test suite for all 7 design patterns
│   └── test_states.py       # Standalone state pattern test script
└── frontend/
    ├── src/
    │   ├── components/      # Badges, Navigation Sidebar, Header Layout
    │   ├── context/         # AuthContext (JWT state & user persistent session)
    │   ├── lib/             # Axios API client & TypeScript interfaces
    │   ├── pages/           # 8 pages: Login, Dashboard, Report, Incidents, Detail, Notifications, Users, Departments, Analytics
    │   ├── App.tsx          # Role-protected routing configuration
    │   └── main.tsx         # React root entry
    ├── index.html           # Single Page Application HTML entry
    ├── tailwind.config.js   # Custom dark theme color tokens & micro-animations
    └── vite.config.ts       # Vite build setup with backend proxy rules
```

---

## ⚡ Quick Start Guide

### 1. Database Setup & Seeding
From the `backend/` directory with python virtual environment active:
```bash
.\venv\Scripts\Activate.ps1
python seed_db.py
```
*Creates missing tables, seeds campus departments, and adds any missing demo accounts. Run it again after updating the project if needed.*

### 2. Verify Design Patterns (Automated Tests)
```bash
python test_all_patterns.py
```
*Executes unit tests verifying all 7 design patterns with 100% assertions passed.*

### 3. Run FastAPI Backend
```bash
uvicorn app.main:app --reload --port 8001
```
*API interactive documentation will be live at `http://127.0.0.1:8001/docs`.*

### 4. Run React Frontend
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*Access the web application at `http://localhost:5173`.*

---

## 🔑 Demo Login Accounts

| Role | Email | Password | Allowed Capabilities |
|------|-------|----------|----------------------|
| **System Admin** | `admin@test.com` | `admin123` | Full system access, user creation, departments, analytics |
| **Crisis Officer** | `officer@test.com` | `officer123` | View all incidents, assign technicians, escalate issues |
| **Technician** | `tech@test.com` | `tech123` | View assigned tasks, transition to `IN_PROGRESS` and `RESOLVED` |
| **Hostel Technician** | `hostel.tech@test.com` | `tech123` | Handle Hostel department incidents |
| **Tech Technician** | `it.tech@test.com` | `tech123` | Handle Tech department incidents |
| **Student** | `student@test.com` | `student123` | Report new incidents, view personal incident status |
| **Student** | `sarah@test.com` | `student123` | Report new incidents, view personal incident status |
| **Student** | `maya.student@test.com` | `maya123` | Report new incidents, view personal incident status |
| **Student** | `arjun.student@test.com` | `arjun123` | Report new incidents, view personal incident status |
| **Student** | `priya.student@test.com` | `priya123` | Report new incidents, view personal incident status |

The initial reportable departments (Hostel and Tech) and their technicians are provisioned from [backend/seed_db.py](./backend/seed_db.py). Run `python seed_db.py` from the `backend` directory to create or update those demo records in an existing database. Admin-created departments are enabled for student reports automatically, and can be assigned to technicians from User Administration. The login page is sign-in only; accounts must already exist in the database. Students can only list, open, and view the history of incidents they reported.

---

## 🎓 Academic Presentation Summary

When presenting this project:
1. **Show the Architectural Diagram**: Highlight how frontend components talk to FastAPI routers, which delegate business logic to design pattern objects.
2. **Demonstrate Factory Method**: Report a `Medical` incident and show how its priority automatically becomes `CRITICAL` without manual selection.
3. **Demonstrate Strategy Pattern**: Click **⚡ Auto-Assign** on an incident detail page to show how `LeastBusyStrategy` selects the technician with the lowest workload.
4. **Demonstrate Chain of Responsibility**: Click **Escalate Incident** to show how the request moves through Technician → Supervisor → Officer → Admin until handled.
5. **Demonstrate State Pattern**: Attempt an invalid status change (e.g., trying to close a newly reported incident) and show how `IncidentState` blocks it.
6. **Demonstrate Facade & Observer**: Show how creating one incident triggers audit history records and notification alerts for all subscribed observers.
7. **Demonstrate Adapter**: Point out how `MockEmailProvider` and `MockSMSProvider` are wrapped by `EmailNotificationAdapter` without altering internal logic.
