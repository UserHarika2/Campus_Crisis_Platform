from sqlalchemy import inspect, text

from app.database.connection import engine


def ensure_department_columns() -> None:
    """Add department fields to databases created before department routing."""
    inspector = inspect(engine)

    department_columns = {
        column["name"] for column in inspector.get_columns("departments")
    }
    user_columns = {column["name"] for column in inspector.get_columns("users")}

    with engine.begin() as connection:
        if "is_reportable" not in department_columns:
            connection.execute(text(
                "ALTER TABLE departments "
                "ADD COLUMN is_reportable BOOLEAN NOT NULL DEFAULT FALSE"
            ))
        if "department_id" not in user_columns:
            connection.execute(text(
                "ALTER TABLE users "
                "ADD COLUMN department_id INTEGER REFERENCES departments(id)"
            ))
