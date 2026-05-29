# Full Stack Weather App (Flask + SQLite)

This project converts your existing frontend weather application into a full-stack app with a Flask backend and SQLite database.

## Backend Structure

```
weather-app/
│
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── weather.db
│   │
│   ├── routes/
│   │   ├── weather_routes.py
│   │   ├── history_routes.py
│   │   └── export_routes.py
│   │
│   ├── models/
│   │   └── database.py
│   │
│   ├── services/
│   │   └── weather_service.py
│   │
│   └── utils/
│       └── helpers.py
│
└── frontend/
```

## Setup Instructions

1. Navigate to the backend folder:

   ```powershell
   cd c:\Users\vidhi\OneDrive\Desktop\weather_app\backend
   ```

2. Create and populate the environment file:

   ```powershell
   copy .env.example .env
   ```

   Then open `backend/.env` and add your OpenWeatherMap API key:

   ```text
   OPENWEATHER_API_KEY=your_real_api_key_here
   ```

3. Install backend dependencies:

   ```powershell
   pip install -r requirements.txt
   ```

4. Run the Flask backend:

   ```powershell
   python app.py
   ```

5. Open the frontend from the backend server:

   ```text
   http://localhost:5000
   ```

   This ensures the frontend and backend run from the same origin and avoids local file access issues.

## API Endpoints

### Current Weather

`GET /weather?city=Bangalore`

Returns current weather data including:

- temperature
- humidity
- wind speed
- weather condition
- weather icon
- precipitation
- air quality
- recommendations

### 5-Day Forecast

`GET /forecast?city=Bangalore`

Returns a clean 5-day forecast with:

- date
- temperature
- condition
- icon

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
