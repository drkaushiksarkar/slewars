# Slewars EWARS Platform

Modern climate-aware Early Warning, Alert, and Response System with a Sierra Leone–specific Vite + React frontend and a hardened Express backend that aggregates DHIS2 data, runs lightweight ML models, and exposes configurable APIs.

## Architecture

- **Frontend** – React 18, Vite, Tailwind, Radix UI, mapbox-gl for Sierra Leone provincial overlays (ADM1 geoBoundaries). Data access is centralized through `CountryContext` and `DashboardDataContext`, so every widget consumes live API data instead of mock objects.
- **Backend** – TypeScript + Express service under `server/` with structured logging (Pino), configuration validation (Zod), caching, and layered services (`dashboardService`, `dhis2Service`, `mlService`).
- **Configuration** – Country metadata lives in `server/config/country-config.json` and can be overridden via `COUNTRY_CONFIG_PATH`. Secrets and DHIS2 connectivity are managed through `.env`.
- **ML layer** – Custom logistic regression (outbreak risk) plus seasonal anomaly detection feed the dashboard with risk scores, alert recommendations, and model explainability.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Copy environment template**
   ```bash
   cp .env.example .env
   ```
   Fill in DHIS2 connection details if you want live data. Leave them blank to keep the synthetic demo feed.
3. **Run both servers**
   ```bash
   npm run dev:full
   ```
   - Frontend: http://localhost:3000 (Vite proxies `/api` calls to the backend)
   - Backend API: http://localhost:4000
4. **Production builds**
   ```bash
   npm run build:full           # Builds server (TS -> JS) and the SPA
   npm run preview              # Optional: preview the built SPA
   npm run server:start        # Serve compiled backend from server/dist
   ```

## Environment Variables (`.env`)

| Key | Description |
| --- | --- |
| `PORT` | Backend port (default `4000`) |
| `DASHBOARD_DATA_SOURCE` | Default source: `synthetic`, `dhis2`, or `hybrid` |
| `DHIS2_BASE_URL` / `DHIS2_USERNAME` / `DHIS2_PASSWORD` | Credentials for the DHIS2 instance |
| `DHIS2_VERIFY_SSL` | Set to `false` for self-signed certs (not recommended in prod) |
| `COUNTRY_CONFIG_PATH` | Path to the JSON configuration file |

Frontend overrides: optionally set `VITE_API_BASE_URL`, `VITE_DEFAULT_DATA_SOURCE`, or `VITE_MAPBOX_TOKEN` (needed to visualize the Sierra Leone boundaries) when you need non-relative API targets or a different default feed in the UI.

## API Surface

| Method | Path | Description |
| --- | --- | --- |
| `GET /api/config/countries` | Country metadata + DHIS2 mapping |
| `GET /api/data/overview?country=<id>&source=<synthetic|dhis2|hybrid>` | Aggregated dashboard payload (alerts, metrics, time series, ML results) |
| `GET /api/dhis2/analytics` | Signed pass-through to the configured DHIS2 instance |
| `POST /api/ml/predict` | Run the outbreak risk model with custom features |
| `POST /api/ml/anomalies` | Run anomaly detection on an arbitrary time series |

Responses are cached for 2 minutes; use the Dashboard's “Refresh” button to force an early refresh when adjusting configurations.

## Extending Country Configurations

1. Edit `server/config/country-config.json` (currently pinned to Sierra Leone) or point `COUNTRY_CONFIG_PATH` to a different file.
2. Each entry supports `map` settings (center/zoom) and optional `dhis2` metadata (`orgUnit`, `dataElements`, `program`), and the geojson overlay in `server/data/sierra-leone-adm1.geojson` powers the ADM1 shading on the map.
3. Restart the backend after changing the file (or add your own reload endpoint if hot-swapping configs is required).

## Testing & Validation

- `npm run server:build` – Type-checks and emits compiled backend assets.
- `npm run build` – Compiles the SPA with Vite to ensure every component renders with real API calls.
- Recommended: wire the API into your preferred test runner (Jest, Vitest, Postman collections) if you need broader coverage in CI/CD.

## Deployment Notes

- Serve `dist/` via any static host (S3 + CloudFront, Azure Blob, etc.).
- Deploy the backend to any Node 18+ environment (Docker, PM2, serverless) and ensure the SPA’s `/api` proxy points to the deployed host (set `VITE_API_BASE_URL` at build time).
- Keep DHIS2 credentials in your secret manager (Vault, AWS Secrets Manager) and surface them as env vars at runtime.

This setup gives you a configurable, DHIS2-aware EWARS stack with explainable ML, ready for enterprise hardening (observability, auth, CI/CD) as your next steps.
