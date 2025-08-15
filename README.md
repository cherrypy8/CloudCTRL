# Weather App (FastAPI + HTML/CSS/JS)
Hosted Link: https://cloudctrl.onrender.com/
##### Please wait until it loads.. Render takes some time to wake, once it sleeps...!! knock knock..
***

A sleek, responsive weather dashboard powered by **FastAPI** on the backend with a modern **vanilla HTML/CSS/JS** frontend. The design features glassmorphism, a mobile-friendly interface, and a right-sided tabbed panel with internal scrolling.

***

## ✨ Features

- **Modern UI/UX:** Glassmorphism, soft shadows, rounded corners, responsive layout.
- **Left Panel:** Today’s weather preview (location, icon, temperature, description).
- **Right Panel (Tabs):**
    - **Details:** Humidity, wind, pressure, sunrise/sunset, etc.
    - **Impact:** Climate notes based on current conditions.
    - **Chat:** Simple, scrollable chat panel (ready for custom logic).
    - **Settings:** Placeholder for theme/API settings.
- **Full-Day Forecast Only:** Clean grid in right tab, internally scrollable.
- **Overflow-Safe Layout:** No content spills outside the right panel; each tab scrolls internally.
- **Mobile-Friendly:** Stacks neatly on small screens.

***

## 🧱 Tech Stack

- **Backend:** FastAPI (Python)
- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Runtime:** Uvicorn (dev server)
- **Container:** Docker (optional)
- **Styling:** Custom CSS (no frameworks required)

***

## 📁 Project Structure

```
weather-app/
├── app/
│   ├── main.py         # FastAPI backend
│   ├── api.py          # API routes (weather, chat...)
│   ├── utils.py        # Utility functions
│   └── ...
├── static/
│   ├── css/
│   ├── js/
│   └── assets/
├── templates/
│   └── index.html      # Main frontend template
├── .env                # Environment variables
├── requirements.txt    # Python dependencies
├── Dockerfile          # Optional container setup
└── README.md
```

Adjust paths as needed for your setup.

***

## 🔑 Environment Variables

Create a `.env` file in the project root and add your weather API key:

```env
WEATHER_API_KEY=your_api_key_here
API_PROVIDER_URL=https://api.provider.com/
```

(Replace with your provider’s details and preferences.)

The code expects a valid API key to fetch real data; until then, it displays sample data.

***

## ▶️ Run Locally

1. **Install dependencies:**

```bash
pip install -r requirements.txt
```

2. **Configure environment variables:**
Add a `.env` file as shown above.
3. **Start dev server:**

```bash
uvicorn app.main:app --reload
```

4. Open your browser at [http://127.0.0.1:8000](http://127.0.0.1:8000).

***

## 🐳 Run with Docker (Optional)

Build and run the container:

```bash
docker build -t weather-app .
docker run -p 8000:8000 --env-file .env weather-app
```

Access at [http://localhost:8000](http://localhost:8000).

***

## 📞 Contact / Issues

- Found a bug? Open an issue or PR!
- Feedback? Suggestions? Reach out via GitHub Discussions.

***

## 📖 License

This project is MIT licensed. See [LICENSE](LICENSE) for details.

***

Happy coding!

