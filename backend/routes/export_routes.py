import csv
from io import StringIO

from flask import Blueprint, Response, make_response

from config import EXPORT_FILENAME
import csv
import json
from io import StringIO, BytesIO

from flask import Blueprint, Response, make_response

from config import EXPORT_FILENAME
from models.database import fetch_all_history

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
except Exception:
    # reportlab is optional — PDF endpoint will raise if not installed
    letter = None

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


@export_bp.route("/export/json", methods=["GET"])
def export_history_json():
    try:
        history = fetch_all_history()
        payload = json.dumps(history, default=str)
        response = make_response(payload)
        response.headers["Content-Disposition"] = "attachment; filename=search_history.json"
        response.headers["Content-Type"] = "application/json"
        return response
    except Exception:
        return Response("Failed to generate JSON export.", status=500, mimetype="text/plain")


@export_bp.route("/export/pdf", methods=["GET"])
def export_history_pdf():
    if letter is None:
        return Response("PDF export requires the 'reportlab' package.", status=500, mimetype="text/plain")

    try:
        history = fetch_all_history()
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)

        data = [["ID", "City", "Temperature", "Condition", "Searched At", "Notes"]]
        for r in history:
            data.append([
                r.get("id"),
                r.get("city"),
                r.get("temperature"),
                r.get("weather_condition"),
                r.get("searched_at"),
                r.get("notes") or "",
            ])

        table = Table(data, repeatRows=1)
        style = TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightblue),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ])
        table.setStyle(style)

        doc.build([table])
        pdf_value = buffer.getvalue()
        buffer.close()

        response = make_response(pdf_value)
        response.headers["Content-Disposition"] = "attachment; filename=search_history.pdf"
        response.headers["Content-Type"] = "application/pdf"
        return response
    except Exception:
        return Response("Failed to generate PDF export.", status=500, mimetype="text/plain")
