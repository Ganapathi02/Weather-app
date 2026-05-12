# Welcome to the Code Documentation! 👋

Hi there! This file has everything you need to understand the nuts and bolts of our AI Weather App. I've broken down the complete code file by file and added simple, easy-to-read comments so you know exactly what every little piece is doing.

---

## 🏗️ Project Structure Setup

If you're looking to build this project from scratch on your own computer, you're in the right place! Before we write any code, we need to set up our workspace. Here's exactly what your folder structure should look like when we're done:

```text
ai-weather-app/
├── app.py
├── .env
├── templates/
│   └── index.html
└── static/
    ├── css/
    │   └── style.css
    └── js/
        └── main.js
```

### Let's Build This Together! (How to Set It Up)
If you want to build this from scratch on your own computer, don't worry—it's super easy! Just follow along with me:

First, make a brand new folder on your computer and call it `ai-weather-app`. Think of this as the main box that will hold your entire project.

Open up that new folder. Now, let's create two blank files right there: name one `app.py` (this will be our Python backend) and the other `.env` (this is where you can hide secret settings).

Next, we need to organize our frontend pieces so they don't get messy. Create a new folder called `templates` and inside it, make a blank file named `index.html`. This is where our layout will live.

After that, create another folder next to `templates` and call it `static`. Inside this `static` folder, make two smaller folders: one called `css` and one called `js`.
- Hop into the `css` folder and make a blank file named `style.css`.
- Hop into the `js` folder and make a blank file named `main.js`.

And that's it for the setup! Your folder structure should now match the map above exactly. 

All you have to do now is scroll down, copy the code blocks I've written out for you, and paste them right into those blank files you just made. You've got this!

---

## 1. Backend: `app.py`
This is the core Python Flask server. It handles routing and external API requests.

```python
import os
import requests
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# Load environment variables (from .env file if it exists)
load_dotenv()

# Initialize the Flask Application
app = Flask(__name__)

# Route for the Home Page
@app.route('/')
def index():
    # Renders the index.html file from the 'templates' folder
    return render_template('index.html')

# API Route for fetching weather
@app.route('/api/weather', methods=['GET'])
def get_weather():
    # 1. Get the city name from the URL parameter (e.g., ?city=London)
    city = request.args.get('city')
    if not city:
        return jsonify({"error": "City parameter is required"}), 400

    try:
        # 2. Geocoding: Translate City Name to Coordinates
        # We use OpenStreetMap (Nominatim) for excellent global coverage
        geocode_url = f"https://nominatim.openstreetmap.org/search?q={city}&format=json&limit=1"
        
        # Nominatim requires a User-Agent header
        headers = {'User-Agent': 'AIWeatherApp/1.0 (local dev)'}
        geo_res = requests.get(geocode_url, headers=headers).json()
        
        # Handle case where city isn't found
        if not geo_res or len(geo_res) == 0:
            return jsonify({"error": f"City '{city}' not found. Please try a different name."}), 404
            
        location = geo_res[0]
        lat = location['lat']
        lon = location['lon']
        
        # Clean up the display name for the UI
        display_parts = location.get('display_name', '').split(', ')
        city_name = location.get('name', display_parts[0])
        country = display_parts[-1] if len(display_parts) > 1 else ''

        # 3. Fetch Weather Data using coordinates
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto"
        weather_res = requests.get(weather_url).json()
        
        current = weather_res.get('current', {})
        daily = weather_res.get('daily', {})
        
        # Convert the WMO weather code to a readable string
        wmo_code = current.get('weather_code', 0)
        condition = get_condition_from_wmo(wmo_code)

        # 4. Package the data to send back to the frontend
        weather_data = {
            "city": f"{city_name}, {country}",
            "temperature": current.get('temperature_2m'),
            "feels_like": current.get('apparent_temperature'),
            "humidity": current.get('relative_humidity_2m'),
            "wind_speed": current.get('wind_speed_10m'),
            "condition": condition,
            "is_day": current.get('is_day', 1) == 1,
            "wmo_code": wmo_code,
            "daily": []
        }
        
        # Add 5 days of forecast data
        if 'time' in daily:
            for i in range(min(5, len(daily['time']))):
                weather_data["daily"].append({
                    "date": daily['time'][i],
                    "max_temp": daily['temperature_2m_max'][i],
                    "min_temp": daily['temperature_2m_min'][i],
                    "condition": get_condition_from_wmo(daily['weather_code'][i])
                })

        return jsonify({"weather": weather_data})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Helper Function: WMO Code to Text
def get_condition_from_wmo(code):
    """Converts standard meteorological codes into human-readable strings."""
    if code == 0: return "Clear sky"
    if code in [1, 2, 3]: return "Partly cloudy"
    if code in [45, 48]: return "Fog"
    if code in [51, 53, 55, 56, 57]: return "Drizzle"
    if code in [61, 63, 65, 66, 67]: return "Rain"
    if code in [71, 73, 75, 77]: return "Snow"
    if code in [80, 81, 82]: return "Rain showers"
    if code in [85, 86]: return "Snow showers"
    if code in [95, 96, 99]: return "Thunderstorm"
    return "Unknown"

if __name__ == '__main__':
    # Starts the local development server on port 5000
    app.run(debug=True, port=5000)
```

---

## 2. Frontend Logic: `static/js/main.js`
This file handles the interactivity. It listens for button clicks, fetches data from the Python backend, and manipulates the HTML DOM.

```javascript
// Initialize Lucide icons on page load
lucide.createIcons();

document.addEventListener('DOMContentLoaded', () => {
    // 1. Grab all the HTML elements we need to update
    const searchBtn = document.getElementById('search-btn');
    const cityInput = document.getElementById('city-input');
    const dashboard = document.getElementById('weather-dashboard');
    const loading = document.getElementById('loading-spinner');
    
    const locName = document.getElementById('location-name');
    const currentTemp = document.getElementById('current-temp');
    // ... (other element references)

    // 2. Search Event Listeners
    searchBtn.addEventListener('click', () => {
        if (cityInput.value.trim()) fetchWeather(cityInput.value.trim());
    });

    // 3. The Main Data Fetch Function
    async function fetchWeather(city) {
        // Show loading spinner
        dashboard.classList.add('hidden');
        loading.classList.remove('hidden');

        try {
            // Call the Python backend API
            const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
            const data = await response.json();

            if (!response.ok) throw new Error(data.error);

            // Trigger UI update
            updateUI(data.weather);
        } catch (err) {
            // Handle Errors
            alert(err.message);
        } finally {
            // Hide loading spinner
            loading.classList.add('hidden');
        }
    }

    // 4. Update the Screen
    function updateUI(weather) {
        // Insert data into HTML elements
        locName.textContent = weather.city;
        currentTemp.textContent = `${Math.round(weather.temperature)}°`;
        // ... (update other elements)

        // Change the background color theme based on weather
        updateTheme(weather.wmo_code, weather.is_day);
        
        // Show dashboard
        dashboard.classList.remove('hidden');
    }

    // 5. Dynamic Theming
    function updateTheme(wmoCode, isDay) {
        const body = document.body;
        body.className = ''; // reset existing themes
        
        // Apply CSS classes based on weather codes
        if (wmoCode === 0) body.classList.add('theme-sunny');
        else if (wmoCode <= 3) body.classList.add('theme-cloudy');
        else if (wmoCode <= 67) body.classList.add('theme-rainy');
        else if (wmoCode <= 77) body.classList.add('theme-snowy');
        else body.classList.add('theme-sunny'); // default
    }
});
```

---

## 3. Frontend Style: `static/css/style.css`
This file defines the dynamic themes and layout using CSS grid/flexbox and CSS variables.

```css
/* Define base colors using variables */
:root {
    --text-primary: #ffffff;
    --text-secondary: rgba(255, 255, 255, 0.7);
    --glass-bg: rgba(255, 255, 255, 0.1);
    
    /* Default Gradient */
    --bg-gradient-start: #0f2027;
    --bg-gradient-mid: #203a43;
    --bg-gradient-end: #2c5364;
}

/* Dynamic Weather Themes controlled by JavaScript */
body.theme-sunny {
    --bg-gradient-start: #ff7e5f;
    --bg-gradient-mid: #feb47b;
    --bg-gradient-end: #ffc371;
}

body.theme-rainy {
    --bg-gradient-start: #2c3e50;
    --bg-gradient-mid: #3498db;
    --bg-gradient-end: #2980b9;
}

/* Glassmorphism Panel Styling */
.glass-panel {
    background: var(--glass-bg);
    backdrop-filter: blur(12px);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
}
```

---

## 4. Frontend Structure: `templates/index.html`
This is the skeleton of the application, injected with data via JavaScript.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>AI Weather</title>
    <link rel="stylesheet" href="{{ url_for('static', filename='css/style.css') }}">
</head>
<body>
    <div class="app-container">
        
        <!-- Search Bar -->
        <header>
            <div class="search-bar-container glass-panel">
                <input type="text" id="city-input" placeholder="Search for a city...">
                <button id="search-btn">Search</button>
            </div>
        </header>

        <!-- Weather Display Dashboard (Hidden by default) -->
        <main class="weather-dashboard hidden" id="weather-dashboard">
            
            <!-- Current Weather Information -->
            <section class="current-weather glass-panel">
                <h1 id="location-name">City, Country</h1>
                <h2 id="current-temp">--°</h2>
                <p id="weather-condition">Condition</p>
            </section>

            <!-- 5-Day Forecast -->
            <section class="forecast glass-panel">
                <h3>5-Day Forecast</h3>
                <div id="forecast-container">
                    <!-- Javascript injects forecast items here -->
                </div>
            </section>
            
        </main>
    </div>
    <script src="{{ url_for('static', filename='js/main.js') }}"></script>
</body>
</html>
```
