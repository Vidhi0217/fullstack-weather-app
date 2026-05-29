import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
DOTENV_PATH = BASE_DIR / ".env"

# Load local environment variables from backend/.env if the file exists.
load_dotenv(DOTENV_PATH)

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
OPENWEATHER_TIMEOUT = 10

DB_PATH = BASE_DIR / "weather.db"

OPENWEATHER_CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather"
OPENWEATHER_FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"
OPENWEATHER_GEOCODING_URL = "https://api.openweathermap.org/geo/1.0/direct"
OPENWEATHER_AIR_QUALITY_URL = "https://api.openweathermap.org/data/2.5/air_pollution"
OPENSTREETMAP_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"

# CSV export file name
EXPORT_FILENAME = "search_history.csv"
