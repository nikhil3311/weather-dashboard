# 🌤️ WeatherCheck

A modern, responsive **live weather dashboard** built with **React and Vite**, providing real-time weather information, location-based forecasts, city search, and detailed 7-day weather data.

WeatherCheck uses the **Google Weather API** to deliver weather information based on the user's current location or a searched city.

---

## ✨ Features

* 🌍 **Current Location Weather** — Automatically detects the user's location using browser geolocation.
* 🔎 **City Search** — Search and view weather information for different cities.
* 🌡️ **Real-Time Weather Data** — Displays current weather conditions and atmospheric information.
* 📅 **7-Day Forecast** — View detailed weather forecasts for the upcoming seven days.
* 📊 **Interactive Charts** — Weather trends are visualized using Recharts.
* 🔄 **Automatic Refresh** — Weather data refreshes automatically every 5 minutes.
* 📱 **Responsive Design** — Optimized for desktop, tablet, and mobile devices.
* 🎨 **Modern UI** — Clean interface with Lucide icons and responsive components.
* ⚡ **Fast Development** — Built with Vite for a fast development and build experience.

---

## 🛠️ Tech Stack

* **React**
* **Vite**
* **JavaScript**
* **Google Weather API**
* **Recharts**
* **Lucide React**
* **Browser Geolocation API**
* **CSS**

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

* [Node.js](https://nodejs.org/)
* npm

### 1. Clone the repository

```bash
git clone https://github.com/nikhil3311/weather-dashboard.git
```

### 2. Navigate to the project

```bash
cd weather-dashboard
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure the API key

Create a `.env.local` file in the root directory:

```env
VITE_GOOGLE_API_KEY=your_google_weather_api_key
```

Make sure your Google Cloud API key has the required Weather API access and appropriate browser/API restrictions.

### 5. Start the development server

```bash
npm run dev
```

`.env.local` is ignored by git. Enable the Google Weather API for the supplied Google Cloud key and configure its browser/API restrictions before deployment.
