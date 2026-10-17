from sqlalchemy import inspect, text
from app.database.connection import Base, engine, SessionLocal
from app.database.schema_migrations import ensure_department_columns
from app.auth.security import hash_password

# Import all models to register with Base
from app.models.user import User
from app.models.department import Department
from app.models.incident import Incident
from app.models.incident_history import IncidentHistory
from app.models.notification import Notification

def seed():
    print("1. Creating missing database tables via SQLAlchemy...")
    Base.metadata.create_all(bind=engine)
    ensure_department_columns()
    print("Tables initialized!")

    db = SessionLocal()
    try:
        # Add the column only for databases created before it was part of the model.
        print("2. Ensuring assigned_to_id column exists on incidents table...")
        incident_columns = {
            column["name"] for column in inspect(engine).get_columns("incidents")
        }
        if "assigned_to_id" not in incident_columns:
            db.execute(text(
                "ALTER TABLE incidents "
                "ADD COLUMN assigned_to_id INTEGER REFERENCES users(id)"
            ))
            db.commit()

        # Seed Departments
        print("3. Seeding departments...")
        departments_data = [
            {
                "name": "Hostel",
                "description": "Hostel maintenance, room repairs, and student residence issues."
            },
            {
                "name": "Tech",
                "description": "Campus technology, network, and computer support."
            },
        ]

        departments_by_name = {}
        for dept_info in departments_data:
            existing_dept = db.query(Department).filter(Department.name == dept_info["name"]).first()
            if not existing_dept:
                dept = Department(
                    name=dept_info["name"],
                    description=dept_info["description"],
                    is_reportable=True,
                )
                db.add(dept)
                db.flush()
            else:
                existing_dept.description = dept_info["description"]
                existing_dept.is_reportable = True
                dept = existing_dept
            departments_by_name[dept_info["name"]] = dept
        db.commit()

        # Seed Demo Users
        print("4. Seeding demo users...")
        users_data = [
            {"name": "System Administrator", "email": "admin@test.com", "password": "admin123", "role": "ADMIN"},
            {"name": "Crisis Officer", "email": "officer@test.com", "password": "officer123", "role": "OFFICER"},
            {"name": "Lead Technician", "email": "tech@test.com", "password": "tech123", "role": "TECHNICIAN"},
            {"name": "Hostel Specialist", "email": "hostel.tech@test.com", "password": "tech123", "role": "TECHNICIAN", "department": "Hostel"},
            {"name": "Tech Specialist", "email": "it.tech@test.com", "password": "tech123", "role": "TECHNICIAN", "department": "Tech"},
            {"name": "Chief Security Officer", "email": "security@test.com", "password": "security123", "role": "SECURITY"},
            {"name": "John Student", "email": "student@test.com", "password": "student123", "role": "STUDENT"},
            {"name": "Sarah Student", "email": "sarah@test.com", "password": "student123", "role": "STUDENT"},
            {"name": "Maya Nair", "email": "maya.student@test.com", "password": "maya123", "role": "STUDENT"},
            {"name": "Arjun Kumar", "email": "arjun.student@test.com", "password": "arjun123", "role": "STUDENT"},
            {"name": "Priya Sharma", "email": "priya.student@test.com", "password": "priya123", "role": "STUDENT"},
        ]

        for user_info in users_data:
            existing_user = db.query(User).filter(User.email == user_info["email"]).first()
            if not existing_user:
                hashed = hash_password(user_info["password"])
                user = User(
                    name=user_info["name"],
                    email=user_info["email"],
                    password_hash=hashed,
                    role=user_info["role"],
                    department_id=(
                        departments_by_name[user_info["department"]].id
                        if user_info.get("department")
                        else None
                    ),
                )
                db.add(user)
                print(f"   + Added user {user_info['email']} ({user_info['role']})")
            elif user_info.get("department"):
                existing_user.department_id = departments_by_name[user_info["department"]].id
                existing_user.name = user_info["name"]
        db.commit()

        print("Database seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
