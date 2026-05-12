import os
import requests
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/weather', methods=['GET'])
def get_weather():
    city = request.args.get('city')
    if not city:
        return jsonify({"error": "City parameter is required"}), 400

    try:
        # 1. Geocode the city using Nominatim (OpenStreetMap) for better global coverage
        geocode_url = f"https://nominatim.openstreetmap.org/search?q={city}&format=json&limit=1"
        headers = {'User-Agent': 'AIWeatherApp/1.0 (local dev)'}
        geo_res = requests.get(geocode_url, headers=headers).json()
        
        if not geo_res or len(geo_res) == 0:
            return jsonify({"error": f"City '{city}' not found. Please try a different name."}), 404
            
        location = geo_res[0]
        lat = location['lat']
        lon = location['lon']
        
        # Nominatim provides a full display_name (e.g., "Vadalur, Cuddalore, Tamil Nadu, India")
        display_parts = location.get('display_name', '').split(', ')
        city_name = location.get('name', display_parts[0])
        country = display_parts[-1] if len(display_parts) > 1 else ''

        # 2. Get Weather Data from Open-Meteo
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto"
        weather_res = requests.get(weather_url).json()
        
        current = weather_res.get('current', {})
        daily = weather_res.get('daily', {})
        
        # Determine simple condition string based on WMO code (weather_code)
        wmo_code = current.get('weather_code', 0)
        condition = get_condition_from_wmo(wmo_code)

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
        
        # Package a few days of forecast
        if 'time' in daily:
            for i in range(min(5, len(daily['time']))):
                weather_data["daily"].append({
                    "date": daily['time'][i],
                    "max_temp": daily['temperature_2m_max'][i],
                    "min_temp": daily['temperature_2m_min'][i],
                    "condition": get_condition_from_wmo(daily['weather_code'][i])
                })

        return jsonify({
            "weather": weather_data
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def get_condition_from_wmo(code):
    # WMO Weather interpretation codes
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
    app.run(debug=True, port=5000)
