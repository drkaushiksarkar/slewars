# Phase 6: Forecasting Model Implementation - Setup Guide

This guide walks you through setting up and testing the disease forecasting system.

## Overview

Phase 6 implements:
- Python ML service with SARIMA + XGBoost ensemble models
- Feature engineering pipeline with climate data integration
- FastAPI REST API for forecasting
- Node.js forecast endpoints
- React forecast visualization components
- Database tables for forecasts and model performance

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  - ForecastDashboard.jsx                                 │
│  - ForecastChart.jsx                                     │
│  - useForecast.js hook                                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTP
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Node.js Express API (Port 4000)             │
│  - forecastService.ts                                    │
│  - /api/forecast/* endpoints                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTP (proxy)
                     ▼
┌─────────────────────────────────────────────────────────┐
│        Python FastAPI ML Service (Port 8000)             │
│  - SARIMA model                                          │
│  - XGBoost model                                         │
│  - Feature engineering                                   │
│  - Ensemble forecasting                                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ SQL
                     ▼
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL Database                         │
│  - forecasts table                                       │
│  - model_performance table                               │
│  - climate_data table (from Phase 5)                     │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

- Node.js 18+
- Python 3.9+
- PostgreSQL 14+
- pip and virtualenv
- npm

## Step-by-Step Setup

### 1. Database Migration

The database tables should already be created. Verify:

```bash
psql -h localhost -d dhis2SierraLeoneDemo -c "\dt forecasts"
psql -h localhost -d dhis2SierraLeoneDemo -c "\dt model_performance"
psql -h localhost -d dhis2SierraLeoneDemo -c "\dt climate_data"
```

If not, run the migration:

```bash
psql -h localhost -d dhis2SierraLeoneDemo -f server/migrations/001_create_forecast_tables.sql
```

### 2. Python ML Service Setup

```bash
cd server/ml-service

# Run setup script
chmod +x setup.sh
./setup.sh

# Or manually:
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
nano .env  # Update PostgreSQL credentials

# Test the service
python main.py
```

The ML service should start on http://localhost:8000

Test it:
```bash
curl http://localhost:8000/health
```

### 3. Node.js Backend Setup

```bash
# From project root
npm install axios  # Should already be installed

# Add ML service URL to .env
echo "ML_SERVICE_URL=http://localhost:8000" >> .env

# Compile TypeScript
npm run server:build

# Start the Node.js server
npm run server:dev
```

The Node.js API should be running on http://localhost:4000

Test it:
```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/forecast/health
```

### 4. Frontend Setup

The frontend components are already created. Just start the dev server:

```bash
npm run dev
```

Visit http://localhost:5173 and navigate to the Forecast Dashboard.

## Testing the System

### 1. Generate Climate Data (if needed)

First, ensure you have climate data:

```bash
# Sync climate data for all districts
curl -X POST http://localhost:4000/api/climate/sync \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-01-01",
    "endDate": "2025-11-15"
  }'

# Check climate data status
curl http://localhost:4000/api/climate/cache/status
```

### 2. Train a Model

Train a model for Malaria in Bo District:

```bash
curl -X POST http://localhost:8000/train \
  -H "Content-Type: application/json" \
  -d '{
    "disease": "Malaria",
    "location_uid": "O6uvpzGd5pu",
    "start_date": "2024-01-01",
    "end_date": "2025-11-15"
  }'
```

This will:
- Fetch historical disease data
- Fetch climate data
- Engineer features
- Train SARIMA and XGBoost models
- Evaluate performance
- Save models to disk
- Store performance metrics in database

Expected output:
```json
{
  "success": true,
  "disease": "Malaria",
  "location_uid": "O6uvpzGd5pu",
  "training_samples": 80,
  "test_samples": 20,
  "performance": {
    "mae": 18.5,
    "rmse": 42.3,
    "mape": 15.2,
    "r_squared": 0.78
  }
}
```

### 3. Generate Forecast

Generate a 4-week forecast:

```bash
# Via Node.js API
curl -X POST http://localhost:4000/api/forecast/generate \
  -H "Content-Type: application/json" \
  -d '{
    "disease": "Malaria",
    "location_uid": "O6uvpzGd5pu",
    "horizon": 4,
    "auto_train": true
  }'

# Or directly via Python ML service
curl http://localhost:8000/forecast/Malaria/O6uvpzGd5pu?horizon=4
```

Expected output:
```json
{
  "success": true,
  "disease": "Malaria",
  "location_uid": "O6uvpzGd5pu",
  "forecast_date": "2025-11-15",
  "horizon": 4,
  "predictions": [
    {
      "date": "2025-11-22",
      "week": "2025-W47",
      "predicted_cases": 234,
      "lower_bound": 187,
      "upper_bound": 298,
      "confidence": 0.95,
      "risk_level": "MEDIUM",
      "risk_score": 0.65
    },
    // ... more weeks
  ]
}
```

### 4. Get Model Performance

```bash
curl http://localhost:4000/api/forecast/performance/Malaria/O6uvpzGd5pu
```

### 5. Batch Forecast All Districts

Generate forecasts for all districts:

```bash
curl -X POST http://localhost:4000/api/forecast/batch \
  -H "Content-Type: application/json" \
  -d '{
    "disease": "Malaria",
    "horizon": 4
  }'
```

This will train models and generate forecasts for all 13 districts.

### 6. Risk Analysis

Get risk analysis across all districts:

```bash
curl http://localhost:4000/api/forecast/risk-analysis/Malaria
```

## Using the Frontend

1. Navigate to http://localhost:5173
2. Go to the Forecast Dashboard (add route in App.jsx if needed)
3. Select disease and location
4. Click "Generate Forecast"
5. View:
   - Forecast chart with confidence intervals
   - Risk levels by week
   - Contributing factors
   - Model performance metrics

## Troubleshooting

### Issue: ML Service Not Starting

```bash
# Check Python version
python3 --version  # Should be 3.9+

# Check dependencies
source server/ml-service/venv/bin/activate
pip list | grep -E 'statsmodels|xgboost|fastapi'

# Check for errors
python server/ml-service/main.py
```

### Issue: Database Connection Error

```bash
# Verify PostgreSQL is running
psql -h localhost -d dhis2SierraLeoneDemo

# Check credentials in both .env files:
cat .env | grep POSTGRES
cat server/ml-service/.env | grep POSTGRES
```

### Issue: Insufficient Training Data

The model requires at least 52 weeks (1 year) of data. Check available data:

```bash
psql -h localhost -d dhis2SierraLeoneDemo -c "
  SELECT
    de.name,
    COUNT(*) as data_points,
    MIN(p.startdate) as earliest,
    MAX(p.enddate) as latest
  FROM datavalue dv
  JOIN dataelement de ON dv.dataelementid = de.dataelementid
  JOIN period p ON dv.periodid = p.periodid
  WHERE de.uid IN ('vq2qO3eTrNi', 'YazgqXbizv1')
  GROUP BY de.name;
"
```

### Issue: Node.js Can't Reach ML Service

```bash
# Check if ML service is running
curl http://localhost:8000/health

# Check firewall
netstat -an | grep 8000

# Check ML_SERVICE_URL in .env
cat .env | grep ML_SERVICE_URL
```

### Issue: Forecast Generation Times Out

Increase timeout in forecastService.ts (already set to 60 seconds). For batch operations:

```typescript
timeout: 600000 // 10 minutes for batch
```

## Performance Targets

The model aims for:
- **MAE**: < 20 cases per week
- **RMSE**: < 50 cases per week
- **MAPE**: < 25%
- **R²**: > 0.70

## Production Deployment

### Using Docker

```bash
# Build ML service image
cd server/ml-service
docker build -t ml-service:latest .

# Run
docker run -p 8000:8000 --env-file .env ml-service:latest
```

### Using PM2

```bash
# Start ML service
cd server/ml-service
source venv/bin/activate
pm2 start main.py --name ml-service --interpreter python3

# Start Node.js API
pm2 start server/dist/index.js --name api

# Save configuration
pm2 save
pm2 startup
```

## API Endpoints Reference

### Python ML Service (Port 8000)

- `GET /health` - Health check
- `POST /train` - Train model
- `POST /forecast` - Generate forecast
- `GET /forecast/{disease}/{location_uid}` - Get forecast
- `POST /forecast/batch` - Batch forecast
- `GET /performance/{disease}/{location_uid}` - Model performance
- `GET /models` - List cached models
- `GET /config` - Service configuration

### Node.js API (Port 4000)

- `POST /api/forecast/generate` - Generate forecast
- `GET /api/forecast/:disease/:locationUid` - Get latest forecast
- `POST /api/forecast/train` - Train model
- `GET /api/forecast/performance/:disease/:locationUid` - Performance
- `POST /api/forecast/batch` - Batch forecast
- `GET /api/forecast/districts` - Districts with forecasts
- `GET /api/forecast/risk-analysis/:disease` - Risk analysis
- `GET /api/forecast/health` - ML service health check

## Next Steps

1. **Phase 7**: Advanced features
   - Alert system integration
   - Intervention tracking
   - Real-time updates
   - Report generation

2. **Phase 8**: Testing & deployment
   - Unit tests
   - Integration tests
   - Production deployment
   - Monitoring setup

## Support

For issues or questions:
- Check logs: `server/ml-service/logs/`
- Review model performance in database
- Check API responses for error details

## Files Created in Phase 6

### Python ML Service
- `server/ml-service/main.py` - FastAPI application
- `server/ml-service/config.py` - Configuration
- `server/ml-service/database.py` - Database utilities
- `server/ml-service/feature_engineering.py` - Feature engineering
- `server/ml-service/models.py` - SARIMA & XGBoost models
- `server/ml-service/forecast_service.py` - Forecasting service
- `server/ml-service/requirements.txt` - Python dependencies
- `server/ml-service/.env` - Environment configuration
- `server/ml-service/README.md` - Documentation
- `server/ml-service/setup.sh` - Setup script

### Node.js Backend
- `server/src/services/forecastService.ts` - Forecast service
- `server/src/routes/forecastRoutes.ts` - Forecast routes
- Updated `server/src/routes/index.ts` - Added forecast routes

### Frontend
- `src/hooks/useForecast.js` - Forecast data hooks
- `src/components/forecast/ForecastChart.jsx` - Forecast chart
- `src/components/forecast/ForecastDashboard.jsx` - Main dashboard

### Database
- `server/migrations/001_create_forecast_tables.sql` - Database schema

## Completion Status

✅ Database schema for forecasts and model performance
✅ Python ML service with FastAPI
✅ Feature engineering pipeline
✅ SARIMA model implementation
✅ XGBoost model implementation
✅ Ensemble forecasting
✅ Model evaluation and performance tracking
✅ Node.js forecast API endpoints
✅ React visualization components
✅ Model persistence and caching
✅ Documentation and setup guides

Phase 6 is complete!
