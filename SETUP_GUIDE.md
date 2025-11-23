# DHIS2 Disease Forecast Dashboard - Setup Guide

This guide will help you set up the dashboard after cloning the repository.

## Prerequisites

Before starting, ensure you have:

1. **PostgreSQL** installed and running
2. **Node.js** (v18 or higher)
3. **Python 3.12** or higher
4. **DHIS2 Database**: Import your DHIS2 database dump as `dhis2SierraLeoneDemo`
5. **macOS**: The setup script is optimized for macOS (uses Homebrew for dependencies)

## Quick Setup (Recommended)

For a fresh clone of the repository, follow these three simple steps:

### Step 1: Clone and Configure

```bash
# Clone the repository
git clone <repository-url>
cd slewars

# Copy and configure environment variables
cp .env.example .env
# Edit .env and add your database credentials:
# - POSTGRES_USER
# - POSTGRES_PASSWORD
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all Node.js dependencies. After installation completes, you'll see a message to run the setup script.

### Step 3: Run Setup Script

```bash
npm run setup
```

This comprehensive setup script will:
- ✓ Check PostgreSQL database connection
- ✓ Verify Python and Node.js installations
- ✓ Install Python ML dependencies in a virtual environment
- ✓ Load climate data from ZIP files (if available in `server/ml-service/data/`)
- ✓ Train ML models (one-time, takes 5-10 minutes)
- ✓ Run database migrations
- ✓ Build server TypeScript files

### Step 4: Start the Application

```bash
npm run dev:full
```

This will start all three services:
- Frontend (React): http://localhost:3000
- Backend API: http://localhost:4000
- ML Service: http://localhost:8000

## What Happens During Setup?

### Climate Data Loading

The setup script automatically checks for climate data ZIP files in `server/ml-service/data/`:
- If ZIP files (2022.zip, 2023.zip, etc.) are found, they are automatically processed and loaded into the database
- If no ZIP files are found, the system will download climate data from ERA5 when needed
- Climate data is required for accurate ML forecasting

### ML Model Training

The setup script checks for trained models:
- If models exist, setup continues immediately
- If no models are found, they are trained automatically using:
  - Historical disease data from DHIS2
  - Climate data from the database
  - Advanced feature engineering
- Training takes 5-10 minutes on first setup
- Models are saved and reused on subsequent runs

## Manual Setup (Alternative)

If you prefer to run steps manually:

```bash
# 1. Install Node dependencies
npm install

# 2. Setup Python ML service
cd server/ml-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Load climate data (if you have ZIP files)
python3 auto_load_climate_data.py

# 4. Train ML models
python3 train_unified_model.py

# 5. Return to root and build server
cd ../..
npm run server:build

# 6. Start the application
npm run dev:full
```

## Troubleshooting

### Database Connection Issues

If setup fails with database connection errors:

1. Verify PostgreSQL is running:
   ```bash
   psql -l
   ```

2. Check database exists:
   ```bash
   psql -l | grep dhis2SierraLeoneDemo
   ```

3. Verify credentials in `.env` file:
   ```
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_DB=dhis2SierraLeoneDemo
   POSTGRES_USER=<your-username>
   POSTGRES_PASSWORD=<your-password>
   ```

### Python Dependencies Issues

If Python package installation fails:

1. Install system dependencies (macOS):
   ```bash
   brew install libomp  # Required for LightGBM
   ```

2. Ensure Python 3.12+:
   ```bash
   python3 --version
   ```

### Climate Data Issues

If climate data is not loading:

1. Check if ZIP files exist:
   ```bash
   ls -la server/ml-service/data/*.zip
   ```

2. Manually run the loader:
   ```bash
   cd server/ml-service
   source venv/bin/activate
   python3 auto_load_climate_data.py
   ```

### ML Model Training Issues

If model training fails:

1. Ensure climate data is in the database:
   ```bash
   psql dhis2SierraLeoneDemo -c "SELECT COUNT(*) FROM climate_data WHERE source='ERA5';"
   ```

2. Check Python dependencies are installed:
   ```bash
   cd server/ml-service
   source venv/bin/activate
   pip list | grep -E "lightgbm|xarray|scikit"
   ```

3. Manually train models:
   ```bash
   cd server/ml-service
   source venv/bin/activate
   python3 train_unified_model.py
   ```

## Project Structure

```
slewars/
├── .env                          # Environment configuration
├── setup.sh                      # Automated setup script
├── package.json                  # Node.js dependencies and scripts
├── src/                          # Frontend React application
├── server/
│   ├── src/                      # Backend TypeScript API
│   └── ml-service/               # Python ML service
│       ├── venv/                 # Python virtual environment
│       ├── requirements.txt      # Python dependencies
│       ├── data/                 # Climate data (ZIP files)
│       ├── models/               # Trained ML models
│       ├── auto_load_climate_data.py  # Auto climate loader
│       ├── train_unified_model.py     # Model training
│       └── main.py               # FastAPI application
```

## Development Workflow

### After Initial Setup

Once setup is complete, you only need:

```bash
npm run dev:full
```

This starts all services in watch mode with hot reload.

### Individual Services

You can also run services separately:

```bash
# Frontend only
npm run dev

# Backend API only
npm run server-dev

# ML Service only
npm run ml:start
```

### Updating Models

To retrain ML models with latest data:

```bash
cd server/ml-service
source venv/bin/activate
python3 train_unified_model.py
```

### Updating Climate Data

To refresh climate data:

```bash
cd server/ml-service
source venv/bin/activate
python3 setup_climate_data.py --force
```

## Production Build

To build for production:

```bash
npm run build:full
```

This creates optimized builds:
- Frontend: `dist/`
- Backend: `server/dist/`

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review logs in the console output
3. Check individual service logs:
   - Frontend: Browser console
   - Backend: Terminal running `server-dev`
   - ML Service: Terminal running `ml:start`

## Next Steps

After successful setup:
1. Access the dashboard at http://localhost:3000
2. Configure DHIS2 connection settings in the UI
3. Generate forecasts for your diseases of interest
4. Explore anomaly detection and correlation analysis features
