# WeatherCheck

A responsive live weather dashboard built with React, Vite, Recharts, and Lucide.

Weather data comes from Google Weather API using the local `VITE_GOOGLE_API_KEY`. The app requests browser geolocation first, refreshes weather every five minutes, supports city search, and exposes full seven-day details when a forecast card is opened.

## Run locally

```bash
npm install
npm run dev
```

`.env.local` is ignored by git. Enable the Google Weather API for the supplied Google Cloud key and configure its browser/API restrictions before deployment.
