# APEX — F1 Race Intelligence

<img width="1877" height="1038" alt="image" src="https://github.com/user-attachments/assets/9f14e569-71be-488d-a56c-a4add4b60ec0" />


A Formula 1-themed race analytics dashboard built with React and Vite. It combines race timing, driver and circuit views, telemetry, strategy analysis, and an explainable short-term pace forecast.

## Features

- **Race overview:** session leaderboard, driver comparison, and circuit layout.
- **Race analysis:** lap pace, sector benchmarks, position changes, and consistency metrics.
- **Pace forecast:** projects the next three lap times from recent clean laps, shows an uncertainty range and rolling backtest, and supports CSV export.
- **Telemetry lab:** speed, throttle, brake, and RPM traces when available; GPS lap replay with play, pause, scrubbing, and playback speed controls when location samples are available.
- **Tyre strategy:** stint and compound details.
- **Track conditions:** session weather readings.
- **Driver focus:** compare drivers and view driver profiles.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Run locally

1. Install the JavaScript dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open the URL printed by Vite, usually [http://localhost:5173](http://localhost:5173).

The development server proxies `/openf1` requests to the OpenF1 API to avoid browser cross-origin request issues.

## Production build

Build the static app:

```bash
npm run build
```

To serve and preview the production build locally:

```bash
npm run preview
```

## Data and forecast notes

The dashboard retrieves race data from [OpenF1](https://openf1.org/). Historical data from 2023 onward is generally available without authentication. Real-time data during an active session may require an OpenF1 subscription. If a feed is unavailable, some charts and GPS replay controls will show an availability message; available lap timing and circuit schematics may still be displayed.

The pace forecast is a lightweight, explainable lap-time projection—not a trained machine-learning model or a race-result prediction. It uses recent valid laps from the driver's latest tyre stint, requires at least five laps, and does not model traffic, fuel load, weather changes, incidents, or pit stops. Forecast uncertainty is an estimate based on recent lap-time residuals and is not a calibrated probability interval.

## Project structure

```text
.
├── public/
│   └── f1-logo.png       # Sidebar logo and browser favicon
├── src/
│   ├── analysis.js       # Pace forecast calculations
│   ├── api.js            # OpenF1 request client
│   ├── App.jsx           # Dashboard and views
│   ├── main.jsx          # React entry point
│   └── styles.css        # Dashboard styling
├── index.html
├── vite.config.js        # Development/preview API proxy
└── package.json
```
