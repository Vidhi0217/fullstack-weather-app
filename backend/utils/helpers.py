from datetime import datetime, timedelta


def error_response(message, status_code=400):
    """Return a standard JSON error response."""
    return {"error": message}, status_code


def validate_city(city):
    """Validate that a city parameter exists and is not empty."""
    if not city or not isinstance(city, str) or not city.strip():
        raise ValueError("City is required and must be a non-empty string.")


def validate_coordinates(lat, lon):
    """Validate latitude and longitude values for coordinate-based weather lookup."""
    if lat is None or lon is None:
        raise ValueError("Latitude and longitude are both required.")

    try:
        float(lat)
        float(lon)
    except (TypeError, ValueError):
        raise ValueError("Latitude and longitude must be valid numeric values.")


def validate_date_string(date_value, field_name):
    if date_value is None or date_value == "":
        return None
    if not isinstance(date_value, str):
        raise ValueError(f"{field_name} must be a string in YYYY-MM-DD format.")

    try:
        return datetime.fromisoformat(date_value).date()
    except ValueError:
        raise ValueError(f"{field_name} must be in YYYY-MM-DD format.")


def validate_date_range(start_date, end_date):
    if (start_date and not end_date) or (end_date and not start_date):
        raise ValueError("Both start_date and end_date must be provided together.")

    if not start_date and not end_date:
        return None, None

    start = validate_date_string(start_date, "start_date")
    end = validate_date_string(end_date, "end_date")

    if end < start:
        raise ValueError("End date must be the same or after start date.")

    today = datetime.utcnow().date()
    max_allowed = today + timedelta(days=5)

    if start < today:
        raise ValueError("Start date cannot be in the past.")
    if end > max_allowed:
        raise ValueError("Date range can only extend up to 5 days from today.")
    if (end - start).days > 5:
        raise ValueError("Date range cannot exceed 5 days.")

    return start, end


def format_local_time(timestamp, tz_offset_seconds):
    try:
        local_time = datetime.utcfromtimestamp(timestamp) + timedelta(seconds=tz_offset_seconds)
        return local_time.strftime("%Y-%m-%d %I:%M %p")
    except Exception:
        return None


def build_recommendations(temperature, precipitation, condition, wind_speed, air_quality=None):
    """Build simple weather recommendations based on returned metrics."""
    recommendations = []
    condition_lower = condition.lower() if condition else ""

    if temperature >= 32:
        recommendations.append("Stay hydrated and take breaks in the shade.")
    elif temperature <= 4:
        recommendations.append("Wear warm layers to stay comfortable.")
    elif 25 <= temperature < 32:
        recommendations.append("The weather is warm—light clothing is a good choice.")

    if precipitation > 0.1 or "rain" in condition_lower or "storm" in condition_lower:
        recommendations.append("Carry an umbrella or rain jacket.")

    if "snow" in condition_lower:
        recommendations.append("Use footwear with traction and stay warm.")

    if wind_speed >= 12:
        recommendations.append("Windy conditions are expected—secure loose items.")

    if air_quality and air_quality.get("aqi") is not None:
        if air_quality["aqi"] >= 4:
            recommendations.append("Air quality is poor—limit outdoor activity.")
        elif air_quality["aqi"] == 3:
            recommendations.append("Air quality is moderate—sensitive groups should be cautious.")

    if not recommendations:
        recommendations.append("Weather looks stable. Enjoy your day!")

    return recommendations


def build_alerts(temperature, precipitation, condition, wind_speed, air_quality=None):
    alerts = []
    condition_lower = condition.lower() if condition else ""

    if "thunder" in condition_lower or "storm" in condition_lower:
        alerts.append("Storm warning: expect thunder or heavy rain.")

    if precipitation >= 10 or "heavy rain" in condition_lower:
        alerts.append("Heavy rainfall alert: carry an umbrella and avoid flood-prone areas.")
    elif precipitation >= 2:
        alerts.append("Rain expected: keep an umbrella or rain jacket handy.")

    if temperature >= 38:
        alerts.append("Heat alert: drink plenty of water and avoid prolonged sun exposure.")
    elif temperature >= 32:
        alerts.append("Hot weather: stay hydrated and take breaks in the shade.")
    elif temperature <= 4:
        alerts.append("Cold alert: wear warm layers and protect exposed skin.")

    if wind_speed >= 14:
        alerts.append("Wind alert: strong gusts expected, secure loose items.")

    if "snow" in condition_lower:
        alerts.append("Snow conditions detected: drive carefully and stay warm.")

    if air_quality and air_quality.get("aqi") is not None:
        aqi = air_quality["aqi"]
        if aqi >= 4:
            alerts.append("Air quality alert: limit outdoor activity.")
        elif aqi == 3:
            alerts.append("Moderate air quality: sensitive groups should be cautious.")

    return alerts


def parse_forecast_response(payload):
    """Convert OpenWeatherMap forecast response into a clean 5-day summary."""
    timeline = payload.get("list", [])
    daily_summary = {}

    for entry in timeline:
        timestamp = entry.get("dt_txt")
        if not timestamp:
            continue

        date_key = timestamp.split(" ")[0]
        if len(daily_summary) >= 5 and date_key in daily_summary:
            continue

        details = {
            "temperature": round(entry.get("main", {}).get("temp", 0), 1),
            "condition": entry.get("weather", [])[0].get("description", "Unknown").title(),
            "icon": entry.get("weather", [])[0].get("icon", "01d"),
            "timestamp": timestamp,
        }

        # Choose the first forecast item for each day, or prefer midday if available.
        if date_key not in daily_summary or "12:00:00" in timestamp:
            daily_summary[date_key] = {
                "date": date_key,
                "temperature": details["temperature"],
                "condition": details["condition"],
                "icon": details["icon"],
            }

    return list(daily_summary.values())[:5]


def parse_iso_date(date_string):
    """Convert an ISO-formatted date string to a readable date."""
    try:
        return datetime.fromisoformat(date_string).strftime("%Y-%m-%d %H:%M:%S")
    except ValueError:
        return date_string
