import requests
from datetime import datetime, timedelta

from config import (
    OPENWEATHER_API_KEY,
    OPENWEATHER_AIR_QUALITY_URL,
    OPENWEATHER_CURRENT_URL,
    OPENWEATHER_FORECAST_URL,
    OPENWEATHER_GEOCODING_URL,
    OPENWEATHER_TIMEOUT,
    OPENSTREETMAP_REVERSE_URL,
)
from utils.helpers import (
    build_alerts,
    build_recommendations,
    format_local_time,
    parse_forecast_response,
    validate_coordinates,
    validate_city,
)


class WeatherService:
    @staticmethod
    def _get_api_params():
        if not OPENWEATHER_API_KEY:
            raise RuntimeError("OpenWeatherMap API key is missing. Set OPENWEATHER_API_KEY in backend/.env.")

        return {
            "appid": OPENWEATHER_API_KEY,
            "units": "metric",
        }

    @staticmethod
    def _fetch_json(url, params, headers=None):
        try:
            response = requests.get(url, params=params, headers=headers, timeout=OPENWEATHER_TIMEOUT)
        except requests.RequestException as exc:
            raise RuntimeError(f"Weather service request failed: {exc}") from exc

        if response.status_code == 404:
            raise ValueError("City not found. Please check the city name and try again.")

        if response.status_code != 200:
            raise RuntimeError(
                f"Weather API returned {response.status_code}: {response.text}"
            )

        return response.json()

    @staticmethod
    def _build_map_url(lat, lon):
        return f"https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=10/{lat}/{lon}"

    @staticmethod
    def _fetch_location_info(lat, lon):
        try:
            response = requests.get(
                OPENSTREETMAP_REVERSE_URL,
                params={
                    "format": "json",
                    "lat": lat,
                    "lon": lon,
                    "zoom": 10,
                    "addressdetails": 0,
                },
                headers={"User-Agent": "WeatherApp/1.0"},
                timeout=OPENWEATHER_TIMEOUT,
            )
            if response.status_code != 200:
                return None

            data = response.json()
            display_name = data.get("display_name")
            if not display_name:
                return None

            return {
                "display_name": display_name,
                "map_url": WeatherService._build_map_url(lat, lon),
            }
        except requests.RequestException:
            return None

    @staticmethod
    def _summarize_forecast_range(payload, start_date, end_date):
        if not payload or "list" not in payload:
            return []

        timezone_offset = payload.get("city", {}).get("timezone", 0)
        summaries = {}

        for item in payload.get("list", []):
            timestamp = item.get("dt")
            if timestamp is None:
                continue

            local_dt = datetime.utcfromtimestamp(timestamp) + timedelta(seconds=timezone_offset)
            local_date = local_dt.date()
            if local_date < start_date or local_date > end_date:
                continue

            key = local_date.isoformat()
            temp = item.get("main", {}).get("temp", 0)
            condition = item.get("weather", [])[0].get("description", "Unknown").title()
            icon = item.get("weather", [])[0].get("icon", "01d")

            if key not in summaries:
                summaries[key] = {
                    "date": key,
                    "temperatures": [temp],
                    "condition": condition,
                    "icon": icon,
                    "primary_timestamp": timestamp,
                }
            else:
                summaries[key]["temperatures"].append(temp)
                if abs(local_dt.hour - 12) < abs(datetime.utcfromtimestamp(summaries[key]["primary_timestamp"]).hour - 12):
                    summaries[key]["condition"] = condition
                    summaries[key]["icon"] = icon
                    summaries[key]["primary_timestamp"] = timestamp

        result = []
        for date_key in sorted(summaries.keys()):
            entry = summaries[date_key]
            average_temp = round(sum(entry["temperatures"]) / len(entry["temperatures"]), 1)
            result.append({
                "date": entry["date"],
                "temp": average_temp,
                "condition": entry["condition"],
                "icon": entry["icon"],
            })

        return result

    @classmethod
    def fetch_weather_by_range(cls, city=None, lat=None, lon=None, start_date=None, end_date=None):
        current_data = cls.fetch_current_weather(city=city, lat=lat, lon=lon)
        forecast_payload = cls.fetch_forecast_raw(city=city, lat=lat, lon=lon)
        date_range = {
            "start_date": start_date,
            "end_date": end_date,
        }
        current_data["date_range"] = date_range
        current_data["forecast_range"] = cls._summarize_forecast_range(
            forecast_payload,
            datetime.fromisoformat(start_date).date(),
            datetime.fromisoformat(end_date).date(),
        )
        return current_data

    @classmethod
    def fetch_current_weather(cls, city=None, lat=None, lon=None):
        if city:
            validate_city(city)
            params = cls._get_api_params()
            params["q"] = city
        else:
            validate_coordinates(lat, lon)
            params = cls._get_api_params()
            params["lat"] = lat
            params["lon"] = lon

        payload = cls._fetch_json(OPENWEATHER_CURRENT_URL, params)

        weather_data = {
            "city": f"{payload.get('name', '')}, {payload.get('sys', {}).get('country', '')}".strip(', '),
            "temperature": round(payload.get("main", {}).get("temp", 0), 1),
            "humidity": payload.get("main", {}).get("humidity", 0),
            "wind_speed": round(payload.get("wind", {}).get("speed", 0), 1),
            "condition": payload.get("weather", [])[0].get("description", "Unknown").title(),
            "icon": payload.get("weather", [])[0].get("icon", "01d"),
            "precipitation": round(
                payload.get("rain", {}).get("1h", 0)
                or payload.get("snow", {}).get("1h", 0)
                or 0,
                1,
            ),
        }

        lat = payload.get("coord", {}).get("lat")
        lon = payload.get("coord", {}).get("lon")
        timezone_offset = payload.get("timezone", 0)
        dt = payload.get("dt", 0)

        weather_data["lat"] = lat
        weather_data["lon"] = lon
        weather_data["local_time"] = format_local_time(dt, timezone_offset)
        weather_data["location_info"] = cls._fetch_location_info(lat, lon) if lat is not None and lon is not None else None

        air_quality = cls._fetch_air_quality(lat, lon) if lat is not None and lon is not None else None

        weather_data["air_quality"] = air_quality
        weather_data["recommendations"] = build_recommendations(
            weather_data["temperature"],
            weather_data["precipitation"],
            weather_data["condition"],
            weather_data["wind_speed"],
            air_quality,
        )
        weather_data["alerts"] = build_alerts(
            weather_data["temperature"],
            weather_data["precipitation"],
            weather_data["condition"],
            weather_data["wind_speed"],
            air_quality,
        )

        return weather_data

    @classmethod
    def fetch_forecast(cls, city):
        validate_city(city)
        params = cls._get_api_params()
        params["q"] = city

        payload = cls._fetch_json(OPENWEATHER_FORECAST_URL, params)
        forecast = parse_forecast_response(payload)

        return {
            "city": payload.get("city", {}).get("name", city),
            "country": payload.get("city", {}).get("country", ""),
            "forecast": forecast,
        }

    @classmethod
    def fetch_forecast_raw(cls, city=None, lat=None, lon=None):
        if city:
            validate_city(city)
            params = cls._get_api_params()
            params["q"] = city
        else:
            validate_coordinates(lat, lon)
            params = cls._get_api_params()
            params["lat"] = lat
            params["lon"] = lon

        return cls._fetch_json(OPENWEATHER_FORECAST_URL, params)

    @classmethod
    def fetch_location_suggestions(cls, query, limit=5):
        if not query or not isinstance(query, str) or not query.strip():
            raise ValueError("Location query is required and must be a non-empty string.")

        params = cls._get_api_params()
        params["q"] = query
        params["limit"] = limit

        payload = cls._fetch_json(OPENWEATHER_GEOCODING_URL, params)

        return [
            {
                "name": item.get("name", ""),
                "lat": item.get("lat"),
                "lon": item.get("lon"),
                "state": item.get("state", ""),
                "country": item.get("country", ""),
            }
            for item in payload
        ]

    @staticmethod
    def _fetch_air_quality(lat, lon):
        if lat is None or lon is None:
            return None

        params = {
            "lat": lat,
            "lon": lon,
            "appid": OPENWEATHER_API_KEY,
        }
        try:
            response = requests.get(OPENWEATHER_AIR_QUALITY_URL, params=params, timeout=OPENWEATHER_TIMEOUT)
            if response.status_code != 200:
                return None
            data = response.json()
            air_index = data.get("list", [])[0].get("main", {}).get("aqi")
            return {
                "aqi": air_index,
                "description": WeatherService._translate_aqi(air_index),
            }
        except requests.RequestException:
            return None

    @staticmethod
    def _translate_aqi(aqi):
        mapping = {
            1: "Good",
            2: "Fair",
            3: "Moderate",
            4: "Poor",
            5: "Very Poor",
        }
        return mapping.get(aqi, "Unknown")


def fetch_current_weather(city=None, lat=None, lon=None):
    return WeatherService.fetch_current_weather(city=city, lat=lat, lon=lon)


def fetch_forecast(city):
    return WeatherService.fetch_forecast(city)


def fetch_forecast_raw(city=None, lat=None, lon=None):
    return WeatherService.fetch_forecast_raw(city=city, lat=lat, lon=lon)


def fetch_weather_by_range(city=None, lat=None, lon=None, start_date=None, end_date=None):
    return WeatherService.fetch_weather_by_range(
        city=city,
        lat=lat,
        lon=lon,
        start_date=start_date,
        end_date=end_date,
    )


def fetch_location_suggestions(query, limit=5):
    return WeatherService.fetch_location_suggestions(query, limit=limit)
