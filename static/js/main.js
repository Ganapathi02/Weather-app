// Initialize Lucide icons
lucide.createIcons();

document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('search-btn');
    const cityInput = document.getElementById('city-input');
    const dashboard = document.getElementById('weather-dashboard');
    const loading = document.getElementById('loading-spinner');
    const errorMsg = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');

    // UI Elements
    const locName = document.getElementById('location-name');
    const currentTemp = document.getElementById('current-temp');
    const feelsLike = document.getElementById('feels-like');
    const humidity = document.getElementById('humidity');
    const windSpeed = document.getElementById('wind-speed');
    const condition = document.getElementById('weather-condition');
    const mainIcon = document.getElementById('main-weather-icon');
    const forecastContainer = document.getElementById('forecast-container');

    // Default city search
    fetchWeather('London');

    searchBtn.addEventListener('click', () => {
        if (cityInput.value.trim()) {
            fetchWeather(cityInput.value.trim());
        }
    });

    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && cityInput.value.trim()) {
            fetchWeather(cityInput.value.trim());
        }
    });

    async function fetchWeather(city) {
        // Show loading, hide others
        dashboard.classList.add('hidden');
        errorMsg.classList.add('hidden');
        loading.classList.remove('hidden');

        try {
            const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch weather data');
            }

            updateUI(data.weather);
            
            // Re-trigger animations
            dashboard.querySelectorAll('.slide-up').forEach(el => {
                el.style.animation = 'none';
                el.offsetHeight; /* trigger reflow */
                el.style.animation = null; 
            });

        } catch (err) {
            errorText.textContent = err.message;
            errorMsg.classList.remove('hidden');
        } finally {
            loading.classList.add('hidden');
        }
    }

    function updateUI(weather) {
        // Update basic info
        locName.textContent = weather.city;
        currentTemp.textContent = `${Math.round(weather.temperature)}°`;
        feelsLike.textContent = `${Math.round(weather.feels_like)}°`;
        humidity.textContent = `${weather.humidity}%`;
        windSpeed.textContent = `${weather.wind_speed} km/h`;
        condition.textContent = weather.condition;

        // Update Theme and Icon
        updateTheme(weather.wmo_code, weather.is_day);

        // Update Forecast
        forecastContainer.innerHTML = '';
        weather.daily.forEach(day => {
            const date = new Date(day.date);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            
            const forecastItem = document.createElement('div');
            forecastItem.className = 'forecast-item';
            
            const iconName = getIconName(day.condition, true);
            
            forecastItem.innerHTML = `
                <span class="forecast-date">${dayName}</span>
                <i data-lucide="${iconName}"></i>
                <span class="forecast-temp">${Math.round(day.max_temp)}°</span>
            `;
            forecastContainer.appendChild(forecastItem);
        });

        // Re-initialize dynamic icons
        lucide.createIcons();
        
        // Show dashboard
        dashboard.classList.remove('hidden');
    }

    function updateTheme(wmoCode, isDay) {
        const body = document.body;
        body.className = ''; // reset
        
        let iconName = 'sun';

        if (wmoCode === 0) {
            body.classList.add('theme-sunny');
            iconName = isDay ? 'sun' : 'moon';
        } else if (wmoCode >= 1 && wmoCode <= 3) {
            body.classList.add('theme-cloudy');
            iconName = isDay ? 'cloud-sun' : 'cloud-moon';
        } else if (wmoCode >= 51 && wmoCode <= 67) {
            body.classList.add('theme-rainy');
            iconName = 'cloud-rain';
        } else if (wmoCode >= 71 && wmoCode <= 77) {
            body.classList.add('theme-snowy');
            iconName = 'snowflake';
        } else if (wmoCode >= 80 && wmoCode <= 82) {
            body.classList.add('theme-rainy');
            iconName = 'cloud-showers-heavy';
        } else if (wmoCode >= 95) {
            body.classList.add('theme-cloudy');
            iconName = 'cloud-lightning';
        } else {
            body.classList.add('theme-sunny');
        }

        if (!isDay && !body.classList.contains('theme-snowy')) {
            // Darken theme for night
            body.className = ''; 
        }

        // Set main icon
        mainIcon.setAttribute('data-lucide', iconName);
    }
    
    function getIconName(conditionStr, isDay = true) {
        const cond = conditionStr.toLowerCase();
        if (cond.includes('clear')) return isDay ? 'sun' : 'moon';
        if (cond.includes('cloud')) return isDay ? 'cloud-sun' : 'cloud-moon';
        if (cond.includes('rain') || cond.includes('drizzle')) return 'cloud-rain';
        if (cond.includes('snow')) return 'snowflake';
        if (cond.includes('thunder')) return 'cloud-lightning';
        return 'cloud';
    }
});
