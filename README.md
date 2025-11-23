# Slewars EWARS Platform

Modern climate-aware Early Warning, Alert, and Response System with a Sierra Leone–specific Vite + React frontend and a hardened Express backend that aggregates DHIS2 data, runs lightweight ML models, and exposes configurable APIs.

## Architecture

- **Frontend** – React 18, Vite, Tailwind, Radix UI, mapbox-gl for Sierra Leone provincial overlays (ADM1 geoBoundaries). Data access is centralized through `CountryContext` and `DashboardDataContext`, so every widget consumes live API data instead of mock objects.
- **Backend** – TypeScript + Express service under `server/` with structured logging (Pino), configuration validation (Zod), caching, and layered services (`dashboardService`, `dhis2Service`, `mlService`).
- **Configuration** – Country metadata lives in `server/config/country-config.json` and can be overridden via `COUNTRY_CONFIG_PATH`. Secrets and DHIS2 connectivity are managed through `.env`.
- **ML layer** – Custom logistic regression (outbreak risk) plus seasonal anomaly detection feed the dashboard with risk scores, alert recommendations, and model explainability.

## Getting Started

### Quick Start (One-Line Deployment)

For the fastest setup on a new machine with DHIS2 database already imported:

```bash
./setup.sh && npm run dev:full
```

This single command will:
1. ✓ Check all prerequisites (PostgreSQL, Node.js, Python)
2. ✓ Install all Node.js dependencies
3. ✓ Set up Python virtual environment for ML service
4. ✓ Install ML dependencies
5. ✓ Train ML models automatically (if not present)
6. ✓ Run database migrations
7. ✓ Start all three services

**Services started:**
- Frontend: http://localhost:3000 (Vite proxies `/api` calls to the backend)
- Backend API: http://localhost:4000
- ML Service: http://localhost:8000

### Manual Setup (Alternative)

If you prefer step-by-step control:

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables** (Optional)
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and configure:
   - `PORT` - Backend server port (default: 4000)
   - `POSTGRES_USER` and `POSTGRES_PASSWORD` - Your PostgreSQL credentials
   - API keys for OpenWeather, Mapbox, ERA5 (if needed)
   - DHIS2 credentials (if using DHIS2 as data source)

3. **Set up ML service**
   ```bash
   cd server/ml-service && ./setup.sh
   cd ../..
   ```

4. **Train models** (First time only - or use auto-training)
   ```bash
   cd server/ml-service
   source venv/bin/activate
   python3 train_unified_model.py
   cd ../..
   ```

5. **Run the application**
   ```bash
   npm run dev:full
   ```

### Auto-Training Feature

The ML service automatically trains models on first run if they don't exist. This happens transparently when you run `npm run dev:full`, so you don't need to manually train unless you want to retrain with new data.

**Note:** First-time model training takes 5-10 minutes depending on your database size.

### Production Builds

```bash
npm run build:full           # Builds server (TS -> JS) and the SPA
npm run preview              # Optional: preview the built SPA
npm run server:start        # Serve compiled backend from server/dist
```

### Important Notes

- **NEVER commit** `node_modules/`, `dist/`, or `.env` files to git
- Always use `.env.example` as a template when setting up on a new machine
- Ensure the backend server is running before starting the frontend
- The PORT in `.env` must match the proxy configuration in `vite.config.js`

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
- Deploy the backend to any Node 18+ environment (Docker, PM2, serverless) and ensure the SPA's `/api` proxy points to the deployed host (set `VITE_API_BASE_URL` at build time).
- Keep DHIS2 credentials in your secret manager (Vault, AWS Secrets Manager) and surface them as env vars at runtime.

This setup gives you a configurable, DHIS2-aware EWARS stack with explainable ML, ready for enterprise hardening (observability, auth, CI/CD) as your next steps.

## Troubleshooting

### HTTP Proxy Error at `/api/config/countries`

If you encounter proxy errors when running on a different machine:

1. **Ensure the backend is running**
   ```bash
   # Check if the backend is running on port 4000 (or your configured PORT)
   lsof -i :4000
   ```

2. **Verify environment variables**
   - Make sure you've created `.env` from `.env.example`
   - Confirm `PORT` matches in both `.env` and the backend process

3. **Clean install dependencies**
   ```bash
   # Remove old dependencies and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Rebuild the backend**
   ```bash
   npm run server:build
   ```

5. **Check proxy configuration**
   - The vite dev server proxies `/api/*` to `http://localhost:${PORT}`
   - Ensure the PORT environment variable is set correctly

### Common Issues

- **Port already in use**: Change the `PORT` in `.env` or kill the process using that port
- **Database connection errors**: Verify PostgreSQL is running and credentials in `.env` are correct
- **ML service errors**: Run `cd server/ml-service && ./setup.sh` to ensure Python dependencies are installed
- **Build errors**: Delete `server/dist/` and `dist/` directories, then run `npm run build:full`

### Setup on a New Machine

When cloning this repository on a new machine:

**Quick way (recommended):**
```bash
./setup.sh && npm run dev:full
```

**Manual way:**
1. Install Node.js 18+ and PostgreSQL
2. Import DHIS2 database as `dhis2SierraLeoneDemo`
3. Run `npm install` to install dependencies
4. (Optional) Copy `.env.example` to `.env` and configure variables
5. Set up the ML service: `cd server/ml-service && ./setup.sh`
6. Run the application: `npm run dev:full` (auto-trains models on first run)

**IMPORTANT**:
- Never pull `node_modules/`, `dist/`, or `.env` from git. Always install fresh on each machine.
- The setup script will handle model training automatically if models don't exist
- See `HOW-TO.md` for more detailed setup instructions
