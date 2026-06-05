import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend import config
from models import database as db


def test_database_crud(tmp_path):
    temp_db = tmp_path / "test_weather.db"
    # point config to temp path
    config.DB_PATH = temp_db

    # initialize
    db.init_db()

    # create
    rid = db.save_search_record("Test City", 25.5, "Clear", notes="note1")
    assert isinstance(rid, int)

    all_rows = db.fetch_all_history()
    assert len(all_rows) == 1
    assert all_rows[0]["city"] == "Test City"

    # update
    updated = db.update_history_record(rid, city="New City", notes="updated")
    assert updated["city"] == "New City"

    # fetch by id
    item = db.fetch_history_by_id(rid)
    assert item["city"] == "New City"

    # delete
    deleted = db.delete_history_record(rid)
    assert deleted is True

    rows_after = db.fetch_all_history()
    assert len(rows_after) == 0
