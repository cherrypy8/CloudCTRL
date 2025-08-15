import os
import requests
from datetime import datetime
from fastapi import FastAPI, Request, Query, Body
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
import google.generativeai as genai

# Initialize FastAPI
app = FastAPI()

# Mount static and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Load API keys from environment variables
GEMINI_API_KEY = os.getenv(
    "GEMINI_API_KEY", "AIzaSyAKTq_kH95Ye20kucZiw43Y1_V5VgSwCqI")
API_KEY = "240befd73fc032062688bd4e9aae616e"
WEATHERAPI_KEY = "240befd73fc032062688bd4e9aae616e"

# ---------------- Impact Mode ----------------


@app.post("/impact")
async def impact_mode(weather: dict = Body(...)):
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        now = datetime.now()
        date_str = now.strftime("%A, %B %d, %Y")
        time_str = now.strftime("%H:%M")

        prompt = f"""
You are an expert climate economist and weather impact analyst for India.
Your job is to provide **two different short-term monetary impact statements**
based on today's weather:
1. For an average Indian household.
2. For an average Indian local business.

Guidelines:
- Be concise (one sentence each).
- Quantify in percentage change or Indian Rupees (₹).
- Impacts must be realistic and directly linked to today's weather.
- Mention the relevant sector (electricity, agriculture, transportation, etc.).
- Output exactly two bullet points. No extra commentary.

Today's date: {date_str}
Current time: {time_str}
Current weather data: {weather}

Example output:
- Household: Today's heatwave will increase home cooling costs by about 20% (~₹25 extra).
- Business: Higher temperatures may increase refrigeration costs by ~15% (~₹50 more).

Now give two bullet points for the given weather:
"""

        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        impact = getattr(response, "text", None) or getattr(
            response, "result", None)
        if not impact:
            return {"error": "No response from Gemini."}

        lines = [line.lstrip("-• ").strip()
                 for line in impact.strip().split("\n") if line.strip()]

        # Ensure exactly 2 distinct responses
        if len(lines) < 2:
            return {"error": "AI did not return two impacts."}

        return {"impact1": lines[0], "impact2": lines[1]}

    except Exception as e:
        return {"error": str(e)}
# ---------------- Gemini Chat ----------------


@app.post("/gemini")
async def gemini_chat(user_message: str = Body(...), weather: dict = Body(...)):
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        now = datetime.now()
        date_str = now.strftime("%A, %B %d, %Y")
        time_str = now.strftime("%H:%M")

        prompt = f"""
You are INDRA, the god of weather...
Today's date: {date_str}
Current time: {time_str}
Current weather: {weather}
User message: {user_message}
"""
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        answer = getattr(response, "text", None) or getattr(
            response, "result", None)
        if not answer:
            return {"error": "No response from Gemini."}
        return {"answer": answer}
    except Exception as e:
        return {"error": str(e)}

# ---------------- Home ----------------


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# ---------------- Current Weather ----------------


@app.get("/weather/{city}")
async def get_weather(city: str):
    try:
        url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric"
        response = requests.get(url).json()
        if response.get("cod") != 200:
            return JSONResponse(content={"error": response.get("message", "City not found")}, status_code=404)

        return {
            "city": city,
            "temperature": response["main"]["temp"],
            "description": response["weather"][0]["description"],
            "icon": response["weather"][0].get("icon", "")
        }
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

# ---------------- Geo Weather ----------------


@app.get("/weather/geo")
async def get_weather_by_geo(lat: float, lon: float):
    try:
        url = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API_KEY}&units=metric"
        response = requests.get(url).json()
        if response.get("cod") != 200:
            return JSONResponse(content={"error": response.get("message", "Location not found")}, status_code=404)

        return {
            "city": response["name"],
            "temperature": response["main"]["temp"],
            "description": response["weather"][0]["description"],
            "icon": response["weather"][0].get("icon", "")
        }
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

# ---------------- 5 Day Forecast ----------------


@app.get("/weather/forecast")
async def get_5day_forecast(city: str = Query(..., min_length=1)):
    try:
        url = f"http://api.weatherapi.com/v1/forecast.json?key={WEATHERAPI_KEY}&q={city}&days=5&aqi=no&alerts=no"
        data = requests.get(url).json()
        if "error" in data:
            return JSONResponse(content={"error": data["error"]["message"]}, status_code=404)

        filtered = []
        for day in data["forecast"]["forecastday"]:
            for hour in day["hour"]:
                h = int(hour["time"].split(" ")[1].split(":")[0])
                if h in [0, 3, 6, 9, 12, 15, 18, 21]:
                    filtered.append({
                        "city": data["location"]["name"],
                        "date": day["date"],
                        "time": hour["time"].split(" ")[1][:5],
                        "temp_c": hour["temp_c"],
                        "icon": "https:" + hour["condition"]["icon"],
                        "condition": hour["condition"]["text"]
                    })
        return {"forecast": filtered}
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

# ---------------- Run ----------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=port)

