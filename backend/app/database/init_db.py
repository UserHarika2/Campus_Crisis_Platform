from app.database.connection import Base, engine
from app.database.schema_migrations import ensure_department_columns

# Import ALL models so SQLAlchemy discovers every table
from app.models.user import User
from app.models.department import Department
from app.models.incident import Incident
from app.models.incident_history import IncidentHistory
from app.models.notification import Notification


def initialize_database():
    Base.metadata.create_all(bind=engine)
    ensure_department_columns()
    print("All database tables created/updated successfully!")


if __name__ == "__main__":
    initialize_database()