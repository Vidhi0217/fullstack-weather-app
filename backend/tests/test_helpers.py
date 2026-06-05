import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from utils.helpers import validate_date_range
from datetime import datetime, timedelta
import pytest


def test_validate_date_range_valid():
    today = datetime.utcnow().date()
    start = today.isoformat()
    end = (today + timedelta(days=2)).isoformat()
    s, e = validate_date_range(start, end)
    assert s.isoformat() == start
    assert e.isoformat() == end


def test_validate_date_range_invalid_order():
    today = datetime.utcnow().date()
    start = (today + timedelta(days=3)).isoformat()
    end = (today + timedelta(days=1)).isoformat()
    with pytest.raises(ValueError):
        validate_date_range(start, end)


def test_validate_date_range_past_start():
    today = datetime.utcnow().date()
    start = (today - timedelta(days=1)).isoformat()
    end = today.isoformat()
    with pytest.raises(ValueError):
        validate_date_range(start, end)
