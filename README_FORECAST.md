# Disease Forecasting System - Quick Reference

## 🚀 TL;DR - Get Started in 30 Seconds

```bash
# One-time setup
cd server/ml-service && ./setup.sh && cd ../..

# Start everything
npm run dev:full

# Open http://localhost:3000 → Forecast Dashboard
# Click "Get Forecast" (fast) or "Refresh & Retrain" (latest data)
```

---

## 📚 Documentation Index

Choose your adventure:

### 🎯 Quick Start
- **[UNIFIED_DEV_GUIDE.md](./UNIFIED_DEV_GUIDE.md)** - Complete workflow guide
- **[IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md)** - What was built

### 📖 Detailed Setup
- **[PHASE6_SETUP.md](./PHASE6_SETUP.md)** - Original Phase 6 setup guide
- **[PHASE6_SUMMARY.md](./PHASE6_SUMMARY.md)** - Implementation details

### 🔬 Technical
- **[server/ml-service/README.md](./server/ml-service/README.md)** - ML service docs
- **[DASHBOARD_IMPLEMENTATION_PLAN.md](./DASHBOARD_IMPLEMENTATION_PLAN.md)** - Full project plan

---

## 🎯 Two-Minute Quick Start

### 1. First Time Setup
```bash
cd server/ml-service
./setup.sh  # Creates Python venv, installs dependencies
cd ../..
```

### 2. Start All Services
```bash
npm run dev:full
```

This starts:
- 🔵 Node.js API (http://localhost:4000)
- 🟢 React Frontend (http://localhost:3000)
- 🟡 Python ML Service (http://localhost:8000)

### 3. Generate Your First Forecast

**Option A - Via UI:**
1. Open http://localhost:3000
2. Go to Forecast Dashboard
3. Select disease and location
4. Click **"Get Forecast"**

**Option B - Via API:**
```bash
curl -X POST http://localhost:4000/api/forecast/generate \
  -H "Content-Type: application/json" \
  -d '{
    "disease": "Malaria",
    "location_uid": "O6uvpzGd5pu",
    "horizon": 4
  }'
```

---

## 💡 Understanding the Buttons

### "Get Forecast" Button ⚡
- Uses saved models from disk
- **Fast**: ~5 seconds
- **Use for**: Daily predictions, testing, quick checks

### "Refresh & Retrain" Button 🔄
- Pulls latest climate data
- Retrains both models
- Saves updated models
- **Slower**: ~2-3 minutes
- **Use for**: Weekly updates, when accuracy matters

---

## 📊 Architecture Overview

```
User Interface (React)
        ↓
Node.js API (Express) ← Your entry point
        ↓
Python ML Service (FastAPI)
    ├── SARIMA Model (time series)
    ├── XGBoost Model (ML features)
    └── Ensemble (60% + 40%)
        ↓
PostgreSQL Database
    ├── Disease data (DHIS2)
    ├── Climate data (ERA5)
    └── Forecasts + Performance
```

---

## 🧠 How Model Persistence Works

### First Time (Auto-Training)
```
User clicks "Get Forecast"
    ↓
No model found? → Train model (~60s)
    ↓
Save to disk: server/ml-service/models/{disease}/{location}/
    ↓
Return forecast
```

### Subsequent Times (Fast)
```
User clicks "Get Forecast"
    ↓
Model exists? → Load from disk (~1s)
    ↓
Generate forecast (~5s)
    ↓
Return forecast
```

### Manual Refresh
```
User clicks "Refresh & Retrain"
    ↓
Fetch latest ERA5 climate data
    ↓
Retrain models (~2 min)
    ↓
Save updated models
    ↓
Return forecast
```

---

## 📁 Project Structure

```
server/
├── ml-service/               # Python ML Service
│   ├── main.py              # FastAPI app
│   ├── models.py            # SARIMA + XGBoost
│   ├── forecast_service.py  # High-level service
│   ├── feature_engineering.py
│   ├── start.sh             # Startup script
│   ├── setup.sh             # One-time setup
│   └── models/              # Saved models (created at runtime)
│       └── {disease}/
│           └── {location}/
│               ├── sarima_model.pkl
│               └── xgboost_model.pkl
│
├── src/
│   ├── services/
│   │   └── forecastService.ts    # Node.js forecast service
│   └── routes/
│       └── forecastRoutes.ts     # API endpoints
│
└── migrations/
    └── 001_create_forecast_tables.sql

src/
├── hooks/
│   └── useForecast.js             # React forecast hooks
└── components/
    └── forecast/
        ├── ForecastDashboard.jsx  # Main dashboard
        └── ForecastChart.jsx      # Visualization
```

---

## 🔌 API Endpoints

### Node.js API (Port 4000)
```
POST   /api/forecast/generate           Generate forecast
POST   /api/forecast/train              Train model
GET    /api/forecast/:disease/:location Get latest forecast
GET    /api/forecast/performance/:disease/:location
POST   /api/forecast/batch              Batch forecast all districts
GET    /api/forecast/health             Check ML service
```

### Python ML Service (Port 8000)
```
GET    /health                          Health check
POST   /train                           Train model
POST   /forecast                        Generate forecast
GET    /forecast/{disease}/{location}?force_retrain=true
GET    /performance/{disease}/{location}
GET    /models                          List cached models
GET    /config                          Service config
```

---

## 🧪 Testing the System

### 1. Check All Services Running
```bash
# After running npm run dev:full
curl http://localhost:4000/api/health    # Node.js
curl http://localhost:3000               # Frontend
curl http://localhost:8000/health        # ML Service
```

### 2. Test Fast Inference
```bash
# First call (trains model)
time curl -X POST http://localhost:4000/api/forecast/generate \
  -H "Content-Type: application/json" \
  -d '{"disease": "Malaria", "location_uid": "O6uvpzGd5pu"}'
# Takes ~60 seconds

# Second call (uses saved model)
time curl -X POST http://localhost:4000/api/forecast/generate \
  -H "Content-Type: application/json" \
  -d '{"disease": "Malaria", "location_uid": "O6uvpzGd5pu"}'
# Takes ~5 seconds ⚡
```

### 3. Verify Model Saved
```bash
ls -lah server/ml-service/models/Malaria/O6uvpzGd5pu/
# Should see: sarima_model.pkl, xgboost_model.pkl
```

---

## 🐛 Troubleshooting

### ML Service Won't Start
```bash
cd server/ml-service
source venv/bin/activate
python --version  # Should be 3.9+
pip install -r requirements.txt
python main.py
```

### Port Already in Use
```bash
lsof -ti:3000 | xargs kill  # Frontend
lsof -ti:4000 | xargs kill  # API
lsof -ti:8000 | xargs kill  # ML
npm run dev:full
```

### Model Not Found
```bash
# Train manually
curl -X POST http://localhost:4000/api/forecast/train \
  -H "Content-Type: application/json" \
  -d '{"disease": "Malaria", "location_uid": "O6uvpzGd5pu"}'
```

### Predictions Too Slow
- ✅ Use "Get Forecast" (not "Refresh & Retrain")
- ✅ First prediction trains model (60s), then fast
- ✅ Check models exist in `server/ml-service/models/`

---

## 📈 Performance Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| MAE | < 20 | Mean Absolute Error (cases/week) |
| RMSE | < 50 | Root Mean Squared Error |
| MAPE | < 25% | Mean Absolute Percentage Error |
| R² | > 0.70 | Coefficient of determination |

View metrics at:
```bash
curl http://localhost:4000/api/forecast/performance/Malaria/O6uvpzGd5pu
```

---

## 🎯 Best Practices

### Development
```bash
# Always start with one command
npm run dev:full

# Use fast inference for testing
# Use retrain for weekly updates
```

### Production
```bash
# Pre-train all models (one-time)
curl -X POST http://localhost:4000/api/forecast/batch \
  -d '{"disease": "Malaria", "horizon": 4}'

# Schedule weekly retraining (cron)
0 2 * * 0 curl -X POST http://localhost:4000/api/forecast/batch \
  -d '{"disease": "Malaria", "force_retrain": true}'
```

### Model Updates
- ✅ Use saved models for daily forecasts
- ✅ Retrain weekly with "Refresh" button
- ✅ Monitor MAE/RMSE metrics
- ✅ Retrain if MAE > 30 or RMSE > 60

---

## 🔄 Typical Workflows

### Daily Forecast Workflow
```
1. npm run dev:full (if not already running)
2. Open http://localhost:3000
3. Select disease and location
4. Click "Get Forecast" (5 seconds)
5. View predictions and risk levels
```

### Weekly Refresh Workflow
```
1. Open Forecast Dashboard
2. Select disease and location
3. Click "Refresh & Retrain" (2-3 minutes)
4. Latest data fetched and model updated
5. New forecast with improved accuracy
```

### Batch Training Workflow
```bash
# Train models for all 13 districts
curl -X POST http://localhost:4000/api/forecast/batch \
  -H "Content-Type: application/json" \
  -d '{"disease": "Malaria", "horizon": 4}'

# Takes ~10-15 minutes
# All models saved to disk
# Future forecasts are instant
```

---

## 📚 Key Concepts

### Model Types
- **SARIMA**: Seasonal ARIMA for time series patterns
- **XGBoost**: Gradient boosting for feature-based prediction
- **Ensemble**: Weighted combination (60% SARIMA + 40% XGBoost)

### Features Used
- Lagged cases (1, 2, 4, 8 weeks)
- Rolling statistics (moving avg, std dev)
- Temporal features (month, season, week)
- Climate data (temp, rainfall, humidity)
- Interaction terms (temp × rainfall)

### Risk Levels
- **LOW**: Risk score < 1.0
- **MEDIUM**: Risk score 1.0 - 1.5
- **HIGH**: Risk score > 1.5

---

## 🎓 Learning Resources

### For Users
- [UNIFIED_DEV_GUIDE.md](./UNIFIED_DEV_GUIDE.md) - Complete guide

### For Developers
- [PHASE6_SUMMARY.md](./PHASE6_SUMMARY.md) - Technical details
- [server/ml-service/README.md](./server/ml-service/README.md) - ML docs

### For Data Scientists
- `models.py` - Model implementations
- `feature_engineering.py` - Feature pipeline
- `forecast_service.py` - Training logic

---

## ✅ Checklist for Success

- [ ] Run `cd server/ml-service && ./setup.sh`
- [ ] Start services with `npm run dev:full`
- [ ] Open http://localhost:3000
- [ ] Generate first forecast
- [ ] Verify model saved in `models/` directory
- [ ] Test fast inference (5 seconds)
- [ ] Test manual refresh (2-3 minutes)
- [ ] Check performance metrics

---

## 🆘 Getting Help

### Check Health
```bash
curl http://localhost:4000/api/forecast/health
```

### View Logs
- 🔵 Blue = Node.js API logs
- 🟢 Green = Frontend logs
- 🟡 Yellow = ML Service logs

### Common Issues
1. **ML service won't start** → Run `./setup.sh` again
2. **Models not found** → Train with `/forecast/train` endpoint
3. **Slow predictions** → Use "Get Forecast" not "Refresh"
4. **Port in use** → Kill processes and restart

---

## 🎉 Success!

If you can:
- ✅ Run `npm run dev:full`
- ✅ See all three services start
- ✅ Generate a forecast in ~5 seconds
- ✅ See models saved in `models/` directory

**You're all set!** 🚀

---

## 📞 Support

- **Documentation**: See files listed at top
- **Issues**: Check troubleshooting section
- **API Docs**: `http://localhost:8000/docs` (FastAPI auto-docs)

---

**Built with:** Python, FastAPI, SARIMA, XGBoost, Node.js, React, PostgreSQL

**License:** MIT

**Last Updated:** November 15, 2025
