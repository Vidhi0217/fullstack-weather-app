import sqlite3
from sqlite3 import Error

from config import DB_PATH


def get_db_connection():
    """Create a database connection and return a row-aware SQLite object."""
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def ensure_column_exists(connection, table, column, column_type):
    cursor = connection.execute(f"PRAGMA table_info({table})")
    existing_columns = [row[1] for row in cursor.fetchall()]
    if column not in existing_columns:
        connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {column_type}")


def init_db():
    """Initialize the database and create the search_history table if needed."""
    try:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        with get_db_connection() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS search_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    city TEXT NOT NULL,
                    temperature REAL NOT NULL,
                    weather_condition TEXT NOT NULL,
                    searched_at TEXT NOT NULL DEFAULT (datetime('now')),
                    notes TEXT
                )
                """
            )
            ensure_column_exists(connection, "search_history", "start_date", "TEXT")
            ensure_column_exists(connection, "search_history", "end_date", "TEXT")
            connection.commit()
    except Error as exc:
        raise RuntimeError(f"Database initialization failed: {exc}") from exc


def save_search_record(city, temperature, weather_condition, notes=None, start_date=None, end_date=None):
    """Save one weather search into the search_history table."""
    try:
        with get_db_connection() as connection:
            cursor = connection.execute(
                "INSERT INTO search_history (city, temperature, weather_condition, notes, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)",
                (city, temperature, weather_condition, notes, start_date, end_date),
            )
            connection.commit()
            return cursor.lastrowid
    except Error as exc:
        raise RuntimeError(f"Failed to save search record: {exc}") from exc


def fetch_all_history():
    """Return all search history records as a list of dictionaries."""
    try:
        with get_db_connection() as connection:
            cursor = connection.execute(
                "SELECT id, city, temperature, weather_condition, searched_at, notes, start_date, end_date FROM search_history ORDER BY searched_at DESC"
            )
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    except Error as exc:
        raise RuntimeError(f"Failed to fetch history: {exc}") from exc


def fetch_history_by_id(record_id):
    """Return a single history record by its id."""
    try:
        with get_db_connection() as connection:
            cursor = connection.execute(
                "SELECT id, city, temperature, weather_condition, searched_at, notes, start_date, end_date FROM search_history WHERE id = ?",
                (record_id,),
            )
            row = cursor.fetchone()
            return dict(row) if row else None
    except Error as exc:
        raise RuntimeError(f"Failed to fetch history item: {exc}") from exc


def update_history_record(record_id, city=None, notes=None, start_date=None, end_date=None):
    """Update a search_history row. Returns the updated row or None if not found."""
    try:
        record = fetch_history_by_id(record_id)
        if not record:
            return None

        updated_city = city if city is not None else record["city"]
        updated_notes = notes if notes is not None else record["notes"]
        updated_start_date = start_date if start_date is not None else record["start_date"]
        updated_end_date = end_date if end_date is not None else record["end_date"]

        with get_db_connection() as connection:
            connection.execute(
                "UPDATE search_history SET city = ?, notes = ?, start_date = ?, end_date = ? WHERE id = ?",
                (updated_city, updated_notes, updated_start_date, updated_end_date, record_id),
            )
            connection.commit()

        return fetch_history_by_id(record_id)
    except Error as exc:
        raise RuntimeError(f"Failed to update history item: {exc}") from exc


def delete_history_record(record_id):
    """Delete a search_history row by id. Return True if deleted."""
    try:
        with get_db_connection() as connection:
            cursor = connection.execute(
                "DELETE FROM search_history WHERE id = ?",
                (record_id,),
            )
            connection.commit()
            return cursor.rowcount > 0
    except Error as exc:
        raise RuntimeError(f"Failed to delete history item: {exc}") from exc
