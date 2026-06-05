const BACKEND_URL = window.location.origin && window.location.origin !== 'null'
    ? window.location.origin
    : 'http://127.0.0.1:5000';
const endpoints = {
    geocode: `${BACKEND_URL}/geocode`,
    weather: `${BACKEND_URL}/weather`,
    weatherByLocation: `${BACKEND_URL}/weather-by-location`,
    forecast: `${BACKEND_URL}/forecast`,
    forecastByLocation: `${BACKEND_URL}/forecast-by-location`,
    history: `${BACKEND_URL}/history`,
    exportCsv: `${BACKEND_URL}/export/csv`,
    exportJson: `${BACKEND_URL}/export/json`,
    exportPdf: `${BACKEND_URL}/export/pdf`,
    timezone: `${BACKEND_URL}/timezone`,
    map: `${BACKEND_URL}/map`,
};

const dom = {
    searchInput: document.getElementById('searchInput'),
    suggestions: document.getElementById('suggestions'),
    weatherDisplay: document.getElementById('weatherDisplay'),
    errorMessage: document.getElementById('errorMessage'),
    locationButton: document.getElementById('locationButton'),
    historyToggleBtn: document.getElementById('historyToggleBtn'),
    closeHistoryBtn: document.getElementById('closeHistoryBtn'),
    exportButton: document.getElementById('exportButton'),
    refreshHistoryBtn: document.getElementById('refreshHistoryBtn'),
    historyDrawer: document.getElementById('historyDrawer'),
    historyList: document.getElementById('historyList'),
    historyEmpty: document.getElementById('historyEmpty'),
    statusMessage: document.getElementById('statusMessage'),
};

const state = {
    debounceTimer: null,
    currentSuggestions: [],
    isLoading: false,
    history: [],
};

function init() {
    dom.searchInput.addEventListener('input', handleSearchInput);
    dom.searchInput.addEventListener('keydown', handleKeyDown);

    const searchIcon = document.querySelector('.search-icon');
    if (searchIcon) {
        searchIcon.addEventListener('click', handleSearch);
    }

    document.addEventListener('click', (event) => {
        if (!event.target.closest('.search-container')) {
            hideSuggestions();
        }
    });

    dom.locationButton.addEventListener('click', requestCurrentLocation);
    dom.historyToggleBtn.addEventListener('click', () => toggleHistoryDrawer(true));
    dom.closeHistoryBtn.addEventListener('click', () => toggleHistoryDrawer(false));
    dom.exportButton.addEventListener('click', downloadCsv);
    dom.refreshHistoryBtn.addEventListener('click', loadSearchHistory);
    dom.historyList.addEventListener('click', handleHistoryAction);

    loadSearchHistory();
}

function setLoading(isLoading, message = '', disableSearch = true) {
    state.isLoading = isLoading;
    if (disableSearch) {
        dom.searchInput.disabled = isLoading;
    }
    dom.locationButton.disabled = isLoading;
    dom.exportButton.disabled = isLoading;
    dom.refreshHistoryBtn.disabled = isLoading;

    if (isLoading) {
        dom.statusMessage.textContent = message || 'Loading...';
        dom.statusMessage.className = 'status-message visible';
    } else {
        dom.statusMessage.textContent = '';
        dom.statusMessage.className = 'status-message visually-hidden';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
        return dateString;
    }
    return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function getErrorMessage(error) {
    if (!error) return 'Something went wrong. Please try again.';
    if (error.message) return error.message;
    return String(error);
}

async function fetchJson(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    options.signal = controller.signal;
    options.headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    try {
        const response = await fetch(url, options);
        clearTimeout(timeoutId);

        if (!response.ok) {
            const text = await response.text();
            try {
                const data = JSON.parse(text);
                throw new Error(data.error || data.message || response.statusText);
            } catch {
                throw new Error(response.statusText || `Request failed (${response.status})`);
            }
        }

        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out. Please try again.');
        }
        const message = error.message || 'Network request failed.';
        if (message.includes('Failed to fetch') || message.includes('Network request failed')) {
            throw new Error('Unable to reach the backend server. Please make sure the Flask backend is running at http://127.0.0.1:5000.');
        }
        throw new Error(message);
    }
}

async function fetchLocationSuggestions(query) {
    if (query.length < 2) {
        hideSuggestions();
        return;
    }

    try {
        hideError();
        setLoading(true, 'Finding locations...', false);

        const data = await fetchJson(`${endpoints.geocode}?q=${encodeURIComponent(query)}`);
        const locations = data.suggestions || [];

        if (!locations.length) {
            showError('No locations found. Try another city name.');
            hideSuggestions();
            return;
        }

        state.currentSuggestions = locations;
        renderSuggestions(locations);
    } catch (error) {
        console.error('Location suggestions error:', error);
        showError(getErrorMessage(error));
        hideSuggestions();
    } finally {
        setLoading(false);
    }
}

function handleSearchInput(event) {
    const query = event.target.value.trim();
    clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(() => fetchLocationSuggestions(query), 300);
}

function handleKeyDown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleSearch();
    } else if (event.key === 'Escape') {
        hideSuggestions();
    }
}

function handleSearch() {
    const query = dom.searchInput.value.trim();
    if (query.length < 2) {
        showError('Type at least 2 letters before searching.');
        return;
    }

    hideSuggestions();
    loadWeatherByCity(query);
}

function toggleHistoryDrawer(open = null) {
    const isOpen = dom.historyDrawer.classList.contains('open');
    const shouldOpen = open === null ? !isOpen : open;
    dom.historyDrawer.classList.toggle('open', shouldOpen);
    if (shouldOpen) {
        hideError();
        loadSearchHistory();
    }
}

function renderSuggestions(locations) {
    dom.suggestions.innerHTML = locations
        .map((location, index) => {
            const name = location.name || 'Unknown';
            const subtitle = location.state ? `${location.state}, ${location.country}` : location.country;
            return `
                <div class="suggestion-item" data-index="${index}">
                    <div>
                        <div class="location-name">${name}</div>
                        <div class="location-details">${subtitle}</div>
                    </div>
                </div>
            `;
        })
        .join('');

    dom.suggestions.querySelectorAll('.suggestion-item').forEach((item) => {
        item.addEventListener('click', () => {
            const index = Number(item.getAttribute('data-index'));
            const location = state.currentSuggestions[index];
            if (location) selectLocation(location);
        });
    });

    dom.suggestions.classList.add('show');
}

function hideSuggestions() {
    dom.suggestions.classList.remove('show');
}

function selectLocation(location) {
    const label = `${location.name}${location.state ? ', ' + location.state : ''}, ${location.country}`;
    dom.searchInput.value = label;
    hideSuggestions();
    loadWeatherByCoordinates(location.lat, location.lon, label);
}

async function loadWeatherByCoordinates(lat, lon, label) {
    try {
        hideError();
        setLoading(true, 'Loading weather details...');

        const [weatherData, forecastData] = await Promise.all([
            fetchJson(`${endpoints.weatherByLocation}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`),
            fetchJson(`${endpoints.forecastByLocation}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`),
        ]);

        renderWeather(weatherData, forecastData, label);
        await loadSearchHistory();
    } catch (error) {
        console.error('Weather load error:', error);
        showError(getErrorMessage(error));
    } finally {
        setLoading(false);
    }
}

async function loadWeatherByCity(city) {
    try {
        hideError();
        setLoading(true, 'Loading weather for your city...');

        const [weatherData, forecastData] = await Promise.all([
            fetchJson(`${endpoints.weather}?city=${encodeURIComponent(city)}`),
            fetchJson(`${endpoints.forecast}?city=${encodeURIComponent(city)}`),
        ]);

        renderWeather(weatherData, forecastData, city);
        await loadSearchHistory();
    } catch (error) {
        console.error('City weather error:', error);
        showError(getErrorMessage(error));
    } finally {
        setLoading(false);
    }
}

function renderWeather(weatherData, forecastData, locationLabel) {
    const temp = Math.round(weatherData.temperature);
    const description = weatherData.condition;
    const icon = getWeatherIcon(weatherData.condition, weatherData.icon);
    const humidity = weatherData.humidity;
    const pressure = weatherData.pressure;
    const visibility = weatherData.visibility;
    const uvIndex = weatherData.uv_index;
    const sunrise = weatherData.sunrise || 'N/A';
    const sunset = weatherData.sunset || 'N/A';
    const windSpeed = weatherData.wind_speed;
    const precipitation = Number(weatherData.precipitation).toFixed(1);
    const airQuality = weatherData.air_quality ? getAirQualityText(weatherData.air_quality.aqi) : 'N/A';
    const recommendations = weatherData.recommendations || [];
    const alerts = weatherData.alerts || [];

    const today = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateString = `${days[today.getDay()]}, ${today.getDate()} ${months[today.getMonth()]}`;

    const forecast = processForecastData(forecastData);
    const hourlyForecast = processHourlyForecast(forecastData);

    dom.weatherDisplay.innerHTML = `
        <div class="weather-card">
            <div class="location-date">
                <span class="location-pin">📍</span>
                <span class="location-name">${locationLabel}</span>
                <span class="date">${dateString}</span>
                <div class="location-extra">
                    <span id="timezoneInfo" class="timezone-info"></span>
                    <a id="mapLink" class="map-link" target="_blank" rel="noopener noreferrer">View Map</a>
                </div>
            </div>

            <div class="current-weather">
                <div class="weather-icon-large">${icon}</div>
                <div class="temp-section">
                    <div class="temperature">${temp} °C</div>
                    <div class="weather-condition">${description.charAt(0).toUpperCase() + description.slice(1)}</div>
                </div>
            </div>

            <div class="weather-metrics">
                <div class="metric-item">
                    <span class="metric-icon">💧</span>
                    <div class="metric-info">
                        <div class="metric-label">Humidity</div>
                        <div class="metric-value">${humidity}%</div>
                    </div>
                </div>
                <div class="metric-item">
                    <span class="metric-icon">💨</span>
                    <div class="metric-info">
                        <div class="metric-label">Wind Speed</div>
                        <div class="metric-value">${windSpeed.toFixed(1)} M/s</div>
                    </div>
                </div>
                <div class="metric-item">
                    <span class="metric-icon">🌧️</span>
                    <div class="metric-info">
                        <div class="metric-label">Precipitation</div>
                        <div class="metric-value">${precipitation} mm</div>
                    </div>
                </div>
                <div class="metric-item">
                    <span class="metric-icon">🧭</span>
                    <div class="metric-info">
                        <div class="metric-label">Visibility</div>
                        <div class="metric-value">${visibility ? (visibility / 1000).toFixed(1) + ' km' : 'N/A'}</div>
                    </div>
                </div>
                <div class="metric-item">
                    <span class="metric-icon">🌡️</span>
                    <div class="metric-info">
                        <div class="metric-label">Pressure</div>
                        <div class="metric-value">${pressure ? pressure + ' hPa' : 'N/A'}</div>
                    </div>
                </div>
                <div class="metric-item">
                    <span class="metric-icon">☀️</span>
                    <div class="metric-info">
                        <div class="metric-label">Sunrise</div>
                        <div class="metric-value">${sunrise}</div>
                    </div>
                </div>
                <div class="metric-item">
                    <span class="metric-icon">🌙</span>
                    <div class="metric-info">
                        <div class="metric-label">Sunset</div>
                        <div class="metric-value">${sunset}</div>
                    </div>
                </div>
                <div class="metric-item">
                    <span class="metric-icon">☀️</span>
                    <div class="metric-info">
                        <div class="metric-label">UV Index</div>
                        <div class="metric-value">${uvIndex != null ? uvIndex : 'N/A'}</div>
                    </div>
                </div>
                <div class="metric-item">
                    <span class="metric-icon">🌬️</span>
                    <div class="metric-info">
                        <div class="metric-label">Air Quality</div>
                        <div class="metric-value">${airQuality}</div>
                    </div>
                </div>
            </div>

            ${alerts.length ? `
                <div class="alert-banner">
                    <div class="alert-title">Weather Alerts</div>
                    <ul>${alerts.map((alert) => `<li>${alert}</li>`).join('')}</ul>
                </div>
            ` : ''}

            <div class="recommendations">
                <div class="recommendations-title">Recommendations</div>
                <ul>${recommendations.map((item) => `<li>${item}</li>`).join('')}</ul>
            </div>

            <div class="hourly-forecast-container">
                <div class="hourly-title">Hourly Forecast (Next 2 Days)</div>
                <div class="hourly-scroll">
                    ${hourlyForecast.map((hour, index) => {
                        const showDate = index === 0 || (index > 0 && new Date(hour.timestamp).getDate() !== new Date(hourlyForecast[index - 1].timestamp).getDate());
                        return `
                            <div class="hourly-item">
                                ${showDate ? `<div class="hourly-date">${hour.date}</div>` : '<div class="hourly-date-spacer"></div>'}
                                <div class="hourly-time">${hour.time}</div>
                                <div class="hourly-icon">${hour.icon}</div>
                                <div class="hourly-temp">${hour.temp}°</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <div class="forecast-container">
                <div class="forecast-title">5-Day Forecast</div>
                <div class="forecast-scroll">
                    ${forecast.map((day) => `
                        <div class="forecast-item">
                            <div class="forecast-date">${day.date}</div>
                            <div class="forecast-icon">${day.icon}</div>
                            <div class="forecast-temp">${day.temp} °C</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    // Populate timezone information and map link when coordinates are available.
    (function populateExtras() {
        try {
            const lat = weatherData.lat;
            const lon = weatherData.lon;
            const tzEl = dom.weatherDisplay.querySelector('#timezoneInfo');
            const mapEl = dom.weatherDisplay.querySelector('#mapLink');

            if (mapEl && lat != null && lon != null) {
                mapEl.href = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
            }

            if (tzEl && lat != null && lon != null) {
                fetchJson(`${endpoints.timezone}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`)
                    .then((data) => {
                        if (data && data.timeZone) {
                            tzEl.textContent = `${data.timeZone} • ${data.dateTime}`;
                        }
                    })
                    .catch(() => {
                        // ignore timezone failures
                    });
            }
        } catch (e) {
            // ignore UI extras errors
        }
    })();

    // Set background based on day/night (using location's timezone)
    (function updateBackground() {
        try {
            const sunriseStr = weatherData.sunrise;
            const sunsetStr = weatherData.sunset;
            
            if (!sunriseStr || !sunsetStr) {
                return;
            }

            const sunrise = Math.floor(new Date(sunriseStr).getTime() / 1000);
            const sunset = Math.floor(new Date(sunsetStr).getTime() / 1000);
            
            // Fetch timezone to get location's local time
            const lat = weatherData.lat;
            const lon = weatherData.lon;
            
            if (lat == null || lon == null) {
                return;
            }

            fetchJson(`${endpoints.timezone}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`)
                .then((data) => {
                    if (data && data.offset != null) {
                        // offset is in minutes from UTC
                        const offsetSeconds = data.offset * 60;
                        const nowUTC = Math.floor(Date.now() / 1000);
                        const nowLocal = nowUTC + offsetSeconds;
                        
                        const isDaytime = nowLocal >= sunrise && nowLocal < sunset;
                        const bgEl = document.querySelector('.background');
                        
                        if (bgEl) {
                            const dayBg = "url('sunrise_mountain.jpg')";
                            const nightBg = "url('night_sky.jpg')";
                            bgEl.style.backgroundImage = isDaytime ? dayBg : nightBg;
                        }
                    }
                })
                .catch(() => {
                    // ignore timezone failures - keep current background
                });
        } catch (e) {
            // ignore background update errors
        }
    })();
}

function getAirQualityText(index) {
    const qualityMap = {
        1: 'Good',
        2: 'Fair',
        3: 'Moderate',
        4: 'Poor',
        5: 'Very Poor',
    };
    return qualityMap[index] || 'N/A';
}

function processHourlyForecast(forecastData) {
    const hourly = [];
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    forecastData.list.forEach((item) => {
        const date = new Date(item.dt * 1000);
        if (date > twoDaysFromNow) return;

        let hour = date.getHours();
        let timeString = '';
        if (hour === 0) {
            timeString = '12 AM';
        } else if (hour < 12) {
            timeString = `${hour} AM`;
        } else if (hour === 12) {
            timeString = '12 PM';
        } else {
            timeString = `${hour - 12} PM`;
        }

        const month = date.getMonth() + 1;
        const day = date.getDate();

        hourly.push({
            time: timeString,
            date: `${month}/${day}`,
            temp: Math.round(item.main.temp),
            icon: getWeatherIcon(item.weather[0].main, item.weather[0].icon),
            timestamp: item.dt * 1000,
        });
    });

    return hourly;
}

function processForecastData(forecastData) {
    const forecast = [];
    const processedDates = new Set();

    forecastData.list.forEach((item) => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toDateString();
        if (processedDates.has(dateKey) || forecast.length >= 5) return;

        const hour = date.getHours();
        if (hour >= 10 && hour <= 14) {
            processedDates.add(dateKey);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            forecast.push({
                date: `${months[date.getMonth()]} ${date.getDate()}`,
                temp: Math.round(item.main.temp),
                icon: getWeatherIcon(item.weather[0].main, item.weather[0].icon),
            });
        }
    });

    if (forecast.length < 5) {
        forecastData.list.forEach((item) => {
            if (forecast.length >= 5) return;
            const date = new Date(item.dt * 1000);
            const dateKey = date.toDateString();
            if (!processedDates.has(dateKey)) {
                processedDates.add(dateKey);
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                forecast.push({
                    date: `${months[date.getMonth()]} ${date.getDate()}`,
                    temp: Math.round(item.main.temp),
                    icon: getWeatherIcon(item.weather[0].main, item.weather[0].icon),
                });
            }
        });
    }

    return forecast.slice(0, 5);
}

function getWeatherIcon(main, iconCode) {
    const isNight = iconCode && iconCode.endsWith('n');
    const iconMap = {
        Clear: isNight ? '🌙' : '☀️',
        Clouds: isNight ? '☁️' : '⛅',
        Rain: '🌧️',
        Drizzle: '🌦️',
        Thunderstorm: '⛈️',
        Snow: '❄️',
        Mist: '🌫️',
        Fog: '🌫️',
        Haze: '🌫️',
    };
    return iconMap[main] || (isNight ? '🌙' : '🌤️');
}

function showError(message) {
    dom.errorMessage.textContent = message;
    dom.errorMessage.classList.add('show');
}

function hideError() {
    dom.errorMessage.textContent = '';
    dom.errorMessage.classList.remove('show');
}

async function requestCurrentLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser.');
        return;
    }

    try {
        hideError();
        setLoading(true, 'Waiting for location permission...');
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 10000,
                maximumAge: 60000,
            });
        });

        setLoading(true, 'Loading weather for your location...');
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        loadWeatherByCoordinates(lat, lon, 'Current location');
    } catch (error) {
        const message = error.code === 1
            ? 'Location permission denied. Please allow location access to use this feature.'
            : error.code === 2
                ? 'Unable to determine location. Try again or use a city search.'
                : 'Location request failed. Please try again.';
        showError(message);
        setLoading(false);
    }
}

async function downloadCsv() {
    try {
        hideError();
        setLoading(true, 'Preparing CSV export...');
        const response = await fetch(endpoints.exportCsv);
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || 'CSV export failed.');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'search_history.csv';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('CSV export error:', error);
        showError(getErrorMessage(error));
    } finally {
        setLoading(false);
    }
}

async function loadSearchHistory() {
    try {
        const data = await fetchJson(endpoints.history);
        state.history = Array.isArray(data.history) ? data.history : [];
        renderHistory();
    } catch (error) {
        console.error('History load error:', error);
        showError('Unable to load search history at this time.');
    }
}

function renderHistory() {
    if (!state.history.length) {
        dom.historyList.innerHTML = '';
        dom.historyEmpty.style.display = 'block';
        return;
    }

    dom.historyEmpty.style.display = 'none';
    dom.historyList.innerHTML = state.history
        .map((record) => `
            <div class="history-card" data-id="${record.id}">
                <div class="history-card-top">
                    <div class="history-city">${record.city}</div>
                    <div class="history-temp">${record.temperature}°C</div>
                </div>
                <div class="history-meta">${record.weather_condition} • ${formatDate(record.searched_at)}</div>
                <div class="history-notes">
                    <span class="history-note-label">Notes:</span>
                    <span class="note-text">${record.notes || 'No notes yet.'}</span>
                </div>
                <div class="history-actions">
                    <button class="history-button history-edit" type="button">Edit</button>
                    <button class="history-button history-delete" type="button">Delete</button>
                </div>
                <div class="note-editor visually-hidden">
                    <textarea class="note-input" rows="2">${record.notes || ''}</textarea>
                    <div class="note-editor-actions">
                        <button class="history-button note-save" type="button">Save</button>
                        <button class="history-button note-cancel" type="button">Cancel</button>
                    </div>
                </div>
            </div>
        `)
        .join('');
}

function handleHistoryAction(event) {
    const card = event.target.closest('.history-card');
    if (!card) return;

    const id = card.dataset.id;
    if (event.target.classList.contains('history-delete')) {
        deleteHistoryItem(id);
        return;
    }

    if (event.target.classList.contains('history-edit')) {
        toggleNoteEditor(card, true);
        return;
    }

    if (event.target.classList.contains('note-save')) {
        const textarea = card.querySelector('.note-input');
        if (textarea) {
            updateHistoryNote(id, textarea.value.trim());
        }
        return;
    }

    if (event.target.classList.contains('note-cancel')) {
        toggleNoteEditor(card, false);
        return;
    }

    if (!event.target.closest('button')) {
        const city = card.querySelector('.history-city')?.textContent?.trim();
        if (city) {
            toggleHistoryDrawer(false);
            loadWeatherByCity(city);
        }
    }
}

function toggleNoteEditor(card, opening) {
    const editor = card.querySelector('.note-editor');
    const notes = card.querySelector('.history-notes');
    if (!editor || !notes) return;
    editor.classList.toggle('visually-hidden', !opening);
    notes.classList.toggle('visually-hidden', opening);
}

async function deleteHistoryItem(id) {
    if (!confirm('Delete this search record?')) return;

    try {
        await fetchJson(`${endpoints.history}/${id}`, { method: 'DELETE' });
        state.history = state.history.filter((record) => String(record.id) !== String(id));
        renderHistory();
    } catch (error) {
        console.error('Delete history error:', error);
        showError('Unable to delete history entry. Please try again.');
    }
}

async function updateHistoryNote(id, notes) {
    try {
        await fetchJson(`${endpoints.history}/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ notes }),
        });
        await loadSearchHistory();
    } catch (error) {
        console.error('Update note error:', error);
        showError('Unable to update notes. Please try again.');
    }
}

init();

