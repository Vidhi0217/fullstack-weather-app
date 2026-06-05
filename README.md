# Full Stack Weather App (Flask + SQLite)

A modern, full-stack weather application with Flask backend, SQLite database, and an interactive frontend. Get real-time weather information, search history, and export capabilities.

## 📋 Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Usage Guide](#usage-guide)
- [Troubleshooting](#troubleshooting)

## ✨ Features

- 🌍 **Current Weather**: Get real-time weather for any city
- 📅 **5-Day Forecast**: View detailed weather forecast
- 📍 **Geolocation Support**: Fetch weather for your current location
- 📚 **Search History**: Automatically saves your weather searches
- 📥 **Export Options**: Export search history as CSV, JSON, or PDF
- 🎨 **Interactive UI**: Beautiful, responsive weather interface
- 🌐 **CORS Support**: Full cross-origin request support
- 💾 **Persistent Database**: SQLite database for history tracking

## 📁 Project Structure

```
weather-app/
├── backend/
│   ├── app.py                    # Flask application entry point
│   ├── config.py                 # Configuration and environment variables
│   ├── requirements.txt          # Python dependencies
│   ├── .env.example              # Environment variables template
│   ├── weather.db                # SQLite database (created automatically)
│   │
│   ├── routes/
│   │   ├── weather_routes.py     # Weather API endpoints
│   │   ├── history_routes.py     # Search history endpoints
│   │   └── export_routes.py      # Data export endpoints (CSV, JSON, PDF)
│   │
│   ├── models/
│   │   └── database.py           # Database connection and operations
│   │
│   ├── services/
│   │   └── weather_service.py    # OpenWeatherMap API integration
│   │
│   ├── utils/
│   │   └── helpers.py            # Utility functions and helpers
│   │
│   └── tests/
│       ├── test_database.py      # Database tests
│       ├── test_endpoints.py     # API endpoint tests
│       └── test_helpers.py       # Utility function tests
│
└── frontend/
    ├── index.html                # Main HTML page
    ├── script.js                 # JavaScript logic
    └── styles.css                # Styling and CSS
```

## 📦 Prerequisites

Before you begin, ensure you have:

- **Python 3.8+** installed on your system
- **pip** (Python package manager) - usually included with Python
- **OpenWeatherMap API key** (free tier available at https://openweathermap.org/api)
- **Git** (optional, for cloning the repository)
- Windows PowerShell or Command Prompt

### Check Prerequisites

```powershell
# Check Python version
python --version

# Check pip version
pip --version
```

## 🚀 Installation & Setup

### Step 1: Download the Project

**Option A: Download ZIP**
1. Download the project as a ZIP file
2. Extract it to your desired location (e.g., `C:\Users\YourUsername\Desktop\weather_app`)

**Option B: Clone with Git**
```powershell
git clone <repository-url>
cd weather_app
```

### Step 2: Get Your OpenWeatherMap API Key

1. Visit [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free account
3. Navigate to API keys section
4. Copy your API key (usually a 32-character string)

### Step 3: Set Up Python Virtual Environment (Recommended)

```powershell
# Navigate to the project directory
cd C:\path\to\weather_app

# Create virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# If you get an execution policy error, run:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
# Then run the Activate command again
```

### Step 4: Configure Environment Variables

```powershell
# Navigate to backend folder
cd backend

# Copy the example environment file
copy .env.example .env
```

Now open the `.env` file (located in `backend/.env`) with any text editor and add your API key:

```text
OPENWEATHER_API_KEY=your_actual_api_key_here
```

Replace `your_actual_api_key_here` with the API key you got from OpenWeatherMap.

### Step 5: Install Python Dependencies

```powershell
# From the backend directory (still there from Step 4)
pip install -r requirements.txt
```

Required packages:
- Flask 2.3.3
- Flask-Cors 4.0.0
- python-dotenv 1.0.0
- requests 2.31.0
- reportlab 4.0.0 (for PDF export)
- pytest 7.4.0 (for testing)

## ▶️ Running the Application

### Start the Backend Server

```powershell
# Make sure you're in the backend directory
cd C:\path\to\weather_app\backend

# Activate virtual environment (if not already activated)
.\.venv\Scripts\Activate.ps1

# Run the Flask app
python app.py
```

You should see output similar to:
```
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5000
 * Running on http://10.x.x.x:5000
 * Debugger is active!
```

### Access the Frontend

1. Open your web browser
2. Navigate to: `http://localhost:5000`
3. The application is now ready to use!

### Stop the Server

Press `CTRL+C` in the terminal where the Flask app is running.

## 🔌 API Endpoints

### Weather Information

#### Get Current Weather
```
GET /weather?city=London
```
**Parameters:**
- `city` (required): City name
- `start_date` (optional): YYYY-MM-DD format for historical data
- `end_date` (optional): YYYY-MM-DD format for historical data

**Response:**
```json
{
  "city": "London",
  "temperature": 15.2,
  "humidity": 65,
  "wind_speed": 12.5,
  "condition": "Partly cloudy",
  "icon": "02d",
  "precipitation": 0,
  "air_quality": "Good"
}
```

#### Get 5-Day Forecast
```
GET /forecast?city=London
```

**Response:**
```json
{
  "city": "London",
  "forecast": [
    {
      "date": "2026-06-06",
      "temperature": 16,
      "condition": "Rainy",
      "icon": "09d"
    }
  ]
}
```

#### Get Weather by Coordinates
```
GET /weather-by-location?lat=51.5074&lon=-0.1278
```

#### Get Forecast by Coordinates
```
GET /forecast-by-location?lat=51.5074&lon=-0.1278
```

### Search History

#### Get All Search History
```
GET /history
```

**Response:**
```json
{
  "history": [
    {
      "id": 1,
      "city": "London",
      "temperature": 15.2,
      "weather_condition": "Partly cloudy",
      "searched_at": "2026-06-05 10:30:00",
      "notes": null
    }
  ]
}
```

#### Update History Record
```
PUT /history/<id>
```

**Request Body:**
```json
{
  "city": "Updated City",
  "notes": "My notes about this search"
}
```

#### Delete History Record
```
DELETE /history/<id>
```

### Data Export

#### Export as CSV
```
GET /export/csv
```
Downloads `search_history.csv` with all search records

#### Export as JSON
```
GET /export/json
```
Downloads `search_history.json` with all search records

#### Export as PDF
```
GET /export/pdf
```
Downloads `search_history.pdf` with formatted table

### Health Check

#### API Health
```
GET /api/health
```

**Response:**
```json
{
  "message": "Weather API is running."
}
```

## 📖 Usage Guide

### Searching for Weather

1. Open `http://localhost:5000` in your browser
2. Type a city name in the search box
3. Press Enter or click the search icon
4. View the current weather and forecast

### Using Current Location

1. Click the **📍 Current location** button
2. Allow the browser to access your location
3. Weather for your location will be displayed

### Viewing Search History

1. Click the **📚 History** button
2. View all your previous searches
3. Click on any entry to view details
4. Add notes to searches for reference

### Exporting Data

1. Click the **⬇️ Export CSV** button
2. Choose your preferred format:
   - **CSV**: Spreadsheet format (Excel-compatible)
   - **JSON**: Machine-readable format
   - **PDF**: Formatted document
3. File will download to your Downloads folder

## 🔧 Troubleshooting

### Issue: "API key is missing" error

**Solution:**
1. Verify you have created the `.env` file in the backend folder
2. Check that `OPENWEATHER_API_KEY` is set correctly
3. The API key should be a 32-character string
4. Restart the Flask app after updating the API key

### Issue: "Port 5000 is already in use"

**Solution:**
```powershell
# Find what's using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or run on a different port
$env:FLASK_ENV="development"; flask run --port 5001
```

### Issue: Virtual environment not activating

**Solution:**
```powershell
# If .venv\Scripts\Activate.ps1 doesn't work, try:
.\.venv\Scripts\Activate

# If still having issues, reinstall venv
python -m venv --clear .venv
.\.venv\Scripts\Activate.ps1
```

### Issue: "City not found" error

**Solution:**
1. Check spelling of city name
2. Use English city names
3. Try alternative city names (e.g., "Mumbai" instead of "Bombay")

### Issue: Dependencies not installing

**Solution:**
```powershell
# Upgrade pip
python -m pip install --upgrade pip

# Install requirements
pip install -r requirements.txt --no-cache-dir
```

### Issue: Database errors

**Solution:**
```powershell
# The database will be automatically created on first run
# If you want to reset it, delete weather.db
# Restart the app and a new database will be created
```

## 📝 Environment Variables

The application uses environment variables from the `.env` file:

```text
# OpenWeatherMap API Configuration
OPENWEATHER_API_KEY=your_api_key_here    # Required: Your OpenWeatherMap API key
```

## 🧪 Running Tests

```powershell
# From the backend directory
pytest

# With verbose output
pytest -v

# Run specific test file
pytest tests/test_endpoints.py
```

## 🎯 Next Steps

- Customize the frontend styling in `frontend/styles.css`
- Add additional weather features in `backend/services/weather_service.py`
- Extend the database schema in `backend/models/database.py`
- Deploy to a production server using Gunicorn or similar

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Support

If you encounter any issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Verify all prerequisites are installed
3. Ensure the API key is valid and has available requests
4. Check that the backend directory contains all required files

### Weather by Location

`GET /weather-by-location?lat=12.97&lon=77.59`

Returns current weather using latitude and longitude.

### Search History

`GET /history`

Returns all saved weather search records.

### Update History

`PUT /history/<id>`

Request body example:

```json
{
  "city": "Bangalore, IN",
  "notes": "Great weather for a walk"
}
```

### Delete History

`DELETE /history/<id>`

Deletes a search history record.

### Export CSV

`GET /export/csv`

Returns the search history as a downloadable CSV file.

## Frontend Connection Example

Your frontend should call backend endpoints using `fetch()`.

Example for current weather:

```js
fetch("http://localhost:5000/weather?city=Bangalore")
  .then((response) => response.json())
  .then((data) => {
    console.log(data);
  })
  .catch((error) => {
    console.error("Weather request failed", error);
  });
```

Example for forecast:

```js
fetch("http://localhost:5000/forecast?city=Bangalore")
  .then((response) => response.json())
  .then((data) => {
    console.log(data.forecast);
  });
```

### Notes

- The backend enables CORS so your frontend can run from a local file or a different port.
- Keep your API key in `backend/.env`; do not commit it to Git.
- The SQLite database file is `backend/weather.db` and it is created automatically when the backend starts.

## Additional Endpoints

`GET /export/json`  - Download search history as `search_history.json`.

`GET /export/pdf`   - Download search history as a simple PDF (requires `reportlab`).

`GET /timezone?lat=<lat>&lon=<lon>` - Returns local date/time and timezone info using a public timezone API.

The app also includes location map helpers (OpenStreetMap links) in the `location_info` field returned by the weather endpoints; you can open these links or construct a Google Maps link like `https://www.google.com/maps/search/?api=1&query=<lat>,<lon>` for embedding.

`GET /geocode?q=<query>&fuzzy=1` - Enables fuzzy matching to return the best guesses for ambiguous or partial location input.

## Running Tests

Install the backend test/dev dependencies:

```powershell
cd backend
pip install -r requirements.txt
```

Run tests from the `backend` folder:

```powershell
pytest -q
```

The test suite contains unit tests for date validation and basic database CRUD, and simple endpoint smoke tests.
