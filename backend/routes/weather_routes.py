from flask import Blueprint, jsonify, request

from models.database import save_search_record
from services.weather_service import (
    fetch_current_weather,
    fetch_forecast,
    fetch_forecast_raw,
    fetch_location_suggestions,
    fetch_weather_by_range,
)
from services.weather_service import fetch_location_suggestions_fuzzy, fetch_timezone_by_coords
from utils.helpers import error_response, validate_date_range

weather_bp = Blueprint("weather", __name__)


@weather_bp.route("/weather", methods=["GET"])
def get_current_weather():
    city = request.args.get("city", "" ).strip()
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    if not city:
        return error_response("The city query parameter is required.", 400)

    try:
        range_start, range_end = validate_date_range(start_date, end_date)
        if range_start is not None and range_end is not None:
            payload = fetch_weather_by_range(city=city, start_date=start_date, end_date=end_date)
        else:
            payload = fetch_current_weather(city=city)

        save_search_record(
            city=payload["city"],
            temperature=payload["temperature"],
            weather_condition=payload["condition"],
            start_date=start_date,
            end_date=end_date,
        )
        return jsonify(payload)

    except ValueError as exc:
        return error_response(str(exc), 404)
    except RuntimeError as exc:
        return error_response(str(exc), 502)
    except Exception:
        return error_response("Unexpected error fetching current weather.", 500)


@weather_bp.route("/forecast", methods=["GET"])
def get_forecast():
    city = request.args.get("city", "" ).strip()
    if not city:
        return error_response("The city query parameter is required.", 400)

    try:
        payload = fetch_forecast(city=city)
        return jsonify(payload)

    except ValueError as exc:
        return error_response(str(exc), 404)
    except RuntimeError as exc:
        return error_response(str(exc), 502)
    except Exception:
        return error_response("Unexpected error fetching forecast.", 500)


@weather_bp.route("/weather-by-location", methods=["GET"])
def get_weather_by_location():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    if lat is None or lon is None:
        return error_response("Latitude and longitude query parameters are required.", 400)

    try:
        range_start, range_end = validate_date_range(start_date, end_date)
        if range_start is not None and range_end is not None:
            payload = fetch_weather_by_range(lat=lat, lon=lon, start_date=start_date, end_date=end_date)
        else:
            payload = fetch_current_weather(lat=lat, lon=lon)

        save_search_record(
            city=payload["city"],
            temperature=payload["temperature"],
            weather_condition=payload["condition"],
            start_date=start_date,
            end_date=end_date,
        )
        return jsonify(payload)

    except ValueError as exc:
        return error_response(str(exc), 400)
    except RuntimeError as exc:
        return error_response(str(exc), 502)
    except Exception:
        return error_response("Unexpected error fetching weather by location.", 500)


@weather_bp.route("/forecast-by-location", methods=["GET"])
def get_forecast_by_location():
    lat = request.args.get("lat")
    lon = request.args.get("lon")

    if lat is None or lon is None:
        return error_response("Latitude and longitude query parameters are required.", 400)

    try:
        payload = fetch_forecast_raw(lat=lat, lon=lon)
        return jsonify(payload)

    except ValueError as exc:
        return error_response(str(exc), 400)
    except RuntimeError as exc:
        return error_response(str(exc), 502)
    except Exception:
        return error_response("Unexpected error fetching forecast by location.", 500)


@weather_bp.route("/geocode", methods=["GET"])
def get_geocode():
    query = request.args.get("q", "").strip()
    if not query:
        return error_response("The q query parameter is required.", 400)

    fuzzy_flag = request.args.get("fuzzy", "0")
    use_fuzzy = fuzzy_flag in ("1", "true", "yes")

    try:
        if use_fuzzy:
            payload = fetch_location_suggestions_fuzzy(query)
        else:
            payload = fetch_location_suggestions(query)
        return jsonify({"suggestions": payload})

    except ValueError as exc:
        return error_response(str(exc), 400)
    except RuntimeError as exc:
        return error_response(str(exc), 502)
    except Exception:
        return error_response("Unexpected error fetching location suggestions.", 500)



@weather_bp.route("/timezone", methods=["GET"])
def get_timezone():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    if lat is None or lon is None:
        return error_response("Latitude and longitude query parameters are required.", 400)

    try:
        payload = fetch_timezone_by_coords(lat, lon)
        return jsonify(payload)
    except ValueError as exc:
        return error_response(str(exc), 400)
    except RuntimeError as exc:
        return error_response(str(exc), 502)
    except Exception:
        return error_response("Unexpected error fetching timezone.", 500)


@weather_bp.route("/map", methods=["GET"])
def get_map_links():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    if lat is None or lon is None:
        return error_response("Latitude and longitude query parameters are required.", 400)

    try:
        google = f"https://www.google.com/maps/search/?api=1&query={lat},{lon}"
        osm = f"https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=10/{lat}/{lon}"
        return jsonify({"google_maps": google, "openstreetmap": osm})
    except Exception:
        return error_response("Unexpected error building map links.", 500)
