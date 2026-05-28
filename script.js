// API Configuration
const API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your OpenWeatherMap API key (get it from openweathermap.org)
const GEOCODING_API_URL = 'https://api.openweathermap.org/geo/1.0/direct';
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_API_URL = 'https://api.openweathermap.org/data/2.5/forecast';
const AIR_QUALITY_API_URL = 'https://api.openweathermap.org/data/2.5/air_pollution';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const suggestions = document.getElementById('suggestions');
const weatherDisplay = document.getElementById('weatherDisplay');
const errorMessage = document.getElementById('errorMessage');

// State
let debounceTimer;
let currentSuggestions = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleKeyDown);
    
    // Search icon click
    const searchIcon = document.querySelector('.search-icon');
    if (searchIcon) {
        searchIcon.addEventListener('click', handleSearch);
    }
    
    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            hideSuggestions();
        }
    });
});

// Handle search input with debouncing
function handleSearchInput(e) {
    const query = e.target.value.trim();
    
    clearTimeout(debounceTimer);
    
    if (query.length < 2) {
        hideSuggestions();
        return;
    }
    
    debounceTimer = setTimeout(() => {
        fetchLocationSuggestions(query);
    }, 300);
}

// Handle Enter key
function handleKeyDown(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch();
    } else if (e.key === 'Escape') {
        hideSuggestions();
    }
}

// Handle search button click
function handleSearch() {
    const query = searchInput.value.trim();
    if (query.length >= 2) {
        fetchLocationSuggestions(query);
    }
}

// Fetch location suggestions from Geocoding API
async function fetchLocationSuggestions(query) {
    try {
        hideError();
        showLoading();
        
        const url = `${GEOCODING_API_URL}?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.length === 0) {
            showError('No locations found. Please try a different search term.');
            hideSuggestions();
            return;
        }
        
        currentSuggestions = data;
        displaySuggestions(data);
        
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        showError('Failed to fetch location suggestions. Please check your API key and try again.');
        hideSuggestions();
    }
}

// Display location suggestions
function displaySuggestions(locations) {
    suggestions.innerHTML = '';
    
    locations.forEach((location, index) => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.setAttribute('data-index', index);
        
        const locationName = `${location.name}${location.state ? ', ' + location.state : ''}`;
        const locationDetails = `${location.country}${location.state ? ' • ' + location.state : ''}`;
        
        item.innerHTML = `
            <span class="location-name">${locationName}</span>
            <span class="location-details">${locationDetails}</span>
        `;
        
        item.addEventListener('click', () => selectLocation(location));
        
        suggestions.appendChild(item);
    });
    
    suggestions.classList.add('show');
}

// Hide suggestions dropdown
function hideSuggestions() {
    suggestions.classList.remove('show');
}

// Select a location and fetch weather
function selectLocation(location) {
    searchInput.value = `${location.name}${location.state ? ', ' + location.state : ''}, ${location.country}`;
    hideSuggestions();
    fetchWeatherData(location.lat, location.lon, location);
}

// Fetch weather data
async function fetchWeatherData(lat, lon, locationInfo) {
    try {
        hideError();
        showLoading();
        
        // Fetch current weather, forecast, and air quality in parallel
        const [weatherResponse, forecastResponse, airQualityResponse] = await Promise.all([
            fetch(`${WEATHER_API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
            fetch(`${FORECAST_API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
            fetch(`${AIR_QUALITY_API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}`)
        ]);
        
        if (!weatherResponse.ok) {
            if (weatherResponse.status === 401) {
                throw new Error('Invalid API key. Please check your API key.');
            }
            throw new Error(`HTTP error! status: ${weatherResponse.status}`);
        }
        
        if (!forecastResponse.ok) {
            throw new Error(`HTTP error! status: ${forecastResponse.status}`);
        }
        
        const weatherData = await weatherResponse.json();
        const forecastData = await forecastResponse.json();
        
        // Air quality might fail for some API keys (requires paid plan), so handle gracefully
        let airQualityData = null;
        if (airQualityResponse.ok) {
            airQualityData = await airQualityResponse.json();
        }
        
        displayWeather(weatherData, forecastData, airQualityData, locationInfo);
        
    } catch (error) {
        console.error('Error fetching weather:', error);
        showError(error.message || 'Failed to fetch weather data. Please try again.');
    }
}

// Display weather information
function displayWeather(weatherData, forecastData, airQualityData, locationInfo) {
    const locationName = locationInfo.name;
    const temp = Math.round(weatherData.main.temp);
    const description = weatherData.weather[0].description;
    const icon = getWeatherIcon(weatherData.weather[0].main, weatherData.weather[0].icon);
    const humidity = weatherData.main.humidity;
    const windSpeed = weatherData.wind.speed;
    
    // Precipitation (rain or snow)
    const precipitation = (weatherData.rain?.['1h'] || weatherData.snow?.['1h'] || 0).toFixed(1);
    
    // Air Quality
    let airQuality = 'N/A';
    let airQualityIndex = null;
    if (airQualityData && airQualityData.list && airQualityData.list.length > 0) {
        airQualityIndex = airQualityData.list[0].main.aqi;
        airQuality = getAirQualityText(airQualityIndex);
    }
    
    // Format date
    const date = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const dateString = `${dayName}, ${day} ${month}`;
    
    // Process forecast data for next 3 days
    const forecast = processForecastData(forecastData);
    
    // Process hourly forecast (next 24 hours)
    const hourlyForecast = processHourlyForecast(forecastData);
    
    weatherDisplay.innerHTML = `
        <div class="weather-card">
            <div class="location-date">
                <span class="location-pin">📍</span>
                <span class="location-name">${locationName}</span>
                <span class="date">${dateString}</span>
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
                        <div class="metric-value">${windSpeed.toFixed(2)} M/s</div>
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
                    <span class="metric-icon">🌬️</span>
                    <div class="metric-info">
                        <div class="metric-label">Air Quality</div>
                        <div class="metric-value">${airQuality}</div>
                    </div>
                </div>
            </div>
            
            <div class="hourly-forecast-container">
                <div class="hourly-title">Hourly Forecast (Next 2 Days)</div>
                <div class="hourly-scroll">
                    ${hourlyForecast.map((hour, index) => {
                        // Show date label for first item of each day
                        const showDate = index === 0 || 
                            (index > 0 && new Date(hour.timestamp).getDate() !== new Date(hourlyForecast[index - 1].timestamp).getDate());
                        
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
                    ${forecast.map(day => `
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
}

// Get air quality text from index
function getAirQualityText(index) {
    const qualityMap = {
        1: 'Good',
        2: 'Fair',
        3: 'Moderate',
        4: 'Poor',
        5: 'Very Poor'
    };
    return qualityMap[index] || 'N/A';
}

// Process hourly forecast data (next 2 days only)
function processHourlyForecast(forecastData) {
    const hourly = [];
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000)); // 2 days from now
    
    // Get forecasts for the next 2 days only (OpenWeatherMap provides 3-hour intervals)
    // This gives us approximately 16 data points (2 days * 8 per day)
    forecastData.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        
        // Only include forecasts within the next 2 days
        if (date > twoDaysFromNow) {
            return;
        }
        
        const hours = date.getHours();
        
        // Format time (e.g., "2 PM", "10 AM")
        let timeString = '';
        if (hours === 0) {
            timeString = '12 AM';
        } else if (hours < 12) {
            timeString = `${hours} AM`;
        } else if (hours === 12) {
            timeString = '12 PM';
        } else {
            timeString = `${hours - 12} PM`;
        }
        
        // Format date for display (show date if it's a new day)
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const dateStr = `${month}/${day}`;
        
        hourly.push({
            time: timeString,
            date: dateStr,
            temp: Math.round(item.main.temp),
            icon: getWeatherIcon(item.weather[0].main, item.weather[0].icon),
            description: item.weather[0].description,
            timestamp: item.dt * 1000
        });
    });
    
    // Return hourly forecasts for next 2 days (approximately 16 items)
    return hourly;
}

// Process forecast data to get next 5 days
function processForecastData(forecastData) {
    const forecast = [];
    const processedDates = new Set();
    
    // Group forecasts by date and get one per day
    forecastData.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toDateString();
        
        // Skip if we already have this date and we have 5 days
        if (processedDates.has(dateKey) || forecast.length >= 5) {
            return;
        }
        
        // Get forecast for around noon (12:00) or closest available
        const hour = date.getHours();
        if (hour >= 10 && hour <= 14) {
            processedDates.add(dateKey);
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            
            forecast.push({
                date: `${months[date.getMonth()]} ${date.getDate()}`,
                temp: Math.round(item.main.temp),
                icon: getWeatherIcon(item.weather[0].main, item.weather[0].icon)
            });
        }
    });
    
    // If we don't have 5 days yet, fill with available data
    if (forecast.length < 5) {
        forecastData.list.forEach(item => {
            if (forecast.length >= 5) return;
            
            const date = new Date(item.dt * 1000);
            const dateKey = date.toDateString();
            
            if (!processedDates.has(dateKey)) {
                processedDates.add(dateKey);
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                
                forecast.push({
                    date: `${months[date.getMonth()]} ${date.getDate()}`,
                    temp: Math.round(item.main.temp),
                    icon: getWeatherIcon(item.weather[0].main, item.weather[0].icon)
                });
            }
        });
    }
    
    return forecast.slice(0, 5);
}

// Get weather icon emoji based on weather condition
function getWeatherIcon(main, iconCode) {
    const iconMap = {
        'Clear': '☀️',
        'Clouds': iconCode.includes('d') ? '⛅' : '☁️',
        'Rain': '🌧️',
        'Drizzle': '🌦️',
        'Thunderstorm': '⛈️',
        'Snow': '❄️',
        'Mist': '🌫️',
        'Fog': '🌫️',
        'Haze': '🌫️'
    };
    
    return iconMap[main] || '🌤️';
}

// Show loading state
function showLoading() {
    weatherDisplay.innerHTML = '<div class="loading">Loading weather data</div>';
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    weatherDisplay.innerHTML = '<div class="welcome-message"><p>👆 Search for a location to see weather details</p></div>';
}

// Hide error message
function hideError() {
    errorMessage.classList.remove('show');
}

