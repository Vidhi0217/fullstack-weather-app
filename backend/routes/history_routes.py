from flask import Blueprint, jsonify, request

from models.database import (
    delete_history_record,
    fetch_all_history,
    fetch_history_by_id,
    update_history_record,
)
from utils.helpers import error_response, validate_date_range

history_bp = Blueprint("history", __name__)


@history_bp.route("/history", methods=["GET"])
def get_history():
    try:
        records = fetch_all_history()
        return jsonify({"history": records})
    except RuntimeError as exc:
        return error_response(str(exc), 500)
    except Exception:
        return error_response("Unexpected error reading history.", 500)


@history_bp.route("/history/<int:record_id>", methods=["PUT"])
def update_history(record_id):
    payload = request.get_json(silent=True) or {}
    city = payload.get("city")
    notes = payload.get("notes")

    if city is None and notes is None:
        return error_response("Provide at least one field to update: city or notes.", 400)

    try:
        updated_record = update_history_record(record_id, city=city, notes=notes)
        if not updated_record:
            return error_response("History record not found.", 404)
        return jsonify(updated_record)

    except RuntimeError as exc:
        return error_response(str(exc), 500)
    except Exception:
        return error_response("Unexpected error updating history.", 500)


@history_bp.route("/history/<int:record_id>", methods=["DELETE"])
def delete_history(record_id):
    try:
        deleted = delete_history_record(record_id)
        if not deleted:
            return error_response("History record not found.", 404)
        return jsonify({"message": "History record deleted successfully."})

    except RuntimeError as exc:
        return error_response(str(exc), 500)
    except Exception:
        return error_response("Unexpected error deleting history.", 500)
