import csv
from io import StringIO

from flask import Blueprint, Response, make_response

from config import EXPORT_FILENAME
from models.database import fetch_all_history

export_bp = Blueprint("export", __name__)


@export_bp.route("/export/csv", methods=["GET"])
def export_history_csv():
    try:
        history = fetch_all_history()
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["id", "city", "temperature", "weather_condition", "searched_at", "notes"])

        for record in history:
            writer.writerow(
                [
                    record.get("id"),
                    record.get("city"),
                    record.get("temperature"),
                    record.get("weather_condition"),
                    record.get("searched_at"),
                    record.get("notes") or "",
                ]
            )

        response = make_response(output.getvalue())
        response.headers["Content-Disposition"] = f"attachment; filename={EXPORT_FILENAME}"
        response.headers["Content-Type"] = "text/csv"
        return response

    except Exception:
        return Response(
            "Failed to generate CSV export.",
            status=500,
            mimetype="text/plain",
        )
