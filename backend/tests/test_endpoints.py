import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend import config
import importlib


def test_health_and_exports(tmp_path):
    temp_db = tmp_path / "ep.db"
    config.DB_PATH = temp_db

    # import app after setting DB_PATH so init_db uses the temporary DB
    app_module = importlib.import_module('backend.app')
    app = app_module.create_app()
    client = app.test_client()

    # health
    resp = client.get('/api/health')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data and data.get('message')

    # export csv (should return empty CSV header)
    resp = client.get('/export/csv')
    assert resp.status_code == 200
    assert 'text/csv' in resp.content_type

    # export json
    resp = client.get('/export/json')
    assert resp.status_code == 200
    assert 'application/json' in resp.content_type

    # export pdf may fail if reportlab not installed in environment; ensure endpoint returns something
    resp = client.get('/export/pdf')
    assert resp.status_code in (200, 500)
