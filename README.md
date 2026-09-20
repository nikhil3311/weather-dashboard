# 🌤️ WeatherCheck

A modern, responsive weather dashboard built with **React + Vite** that provides real-time weather information, city search, browser-based geolocation, and detailed 7-day forecasts.

## ✨ Features

* 🌡️ **Real-time Weather** — View current temperature and weather conditions.
* 📍 **Geolocation Support** — Automatically detect weather based on your current location.
* 🔎 **City Search** — Search weather information for any supported city.
* 📅 **7-Day Forecast** — View upcoming weather conditions and temperatures.
* 📊 **Interactive Charts** — Visualize forecast data using Recharts.
* 🔄 **Automatic Updates** — Weather data refreshes periodically.
* 📱 **Responsive Design** — Works smoothly across desktop, tablet, and mobile devices.
* 🎨 **Modern UI** — Clean interface with Lucide icons and responsive components.

## 🛠️ Tech Stack

* **React**
* **Vite**
* **JavaScript**
* **Google Weather API**
* **Recharts**
* **Lucide React**
* **CSS**
* **Browser Geolocation API**

## 📸 Preview

Add a screenshot or GIF of your application here:

```md
![WeatherCheck Preview](./screenshots/preview.png)
```

## 🚀 Getting Started

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

### 4. Configure the API

Create a `.env` file in the root directory and add your Google Weather API configuration.

```env
VITE_GOOGLE_WEATHER_API_KEY=your_api_key_here
```

> **Note:** Never commit your API key or `.env` file to GitHub.

### 5. Start the development server

```bash
npm run dev
```

The application will be available at the local URL shown in your terminal.

## 📦 Build for Production

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## 📁 Project Structure

```text
weather-dashboard/
├── public/
├── src/
│   ├── components/
│   ├── assets/
│   ├── App.jsx
│   └── main.jsx
├── .env
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## 🔑 API

Weather data is powered by the **Google Weather API**.

You will need a valid API key with the required weather services enabled.

## 🔒 Environment Variables

Keep sensitive credentials in environment variables rather than committing them to the repository.

```env
VITE_GOOGLE_WEATHER_API_KEY=your_api_key_here
```

Make sure `.env` is included in `.gitignore`:

```text
.env
.env.local
```

## 🎯 Future Improvements

* 🌧️ Hourly weather forecast
* 🌍 More detailed location information
* 🌙 Dark/light theme
* ⭐ Favorite cities
* 📈 Additional weather analytics
* 🌐 Multi-language support
* 📲 Progressive Web App support

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository.
2. Create a new branch:

```bash
git checkout -b feature/your-feature
```

3. Make your changes.
4. Commit your changes:

```bash
git commit -m "Add your feature"
```

5. Push the branch:

```bash
git push origin feature/your-feature
```

6. Open a Pull Request.

## 📄 License

This project is available under the **MIT License**.

---

⭐ If you find this project useful, consider giving it a star!

**Built with ❤️ using React and Vite.**
