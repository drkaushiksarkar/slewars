# Unified Development Workflow Guide

## Quick Start - One Command to Rule Them All! 🚀

```bash
# First time setup (only once)
cd server/ml-service
./setup.sh
cd ../..

# Start everything with one command
npm run dev:full
```

That's it! This starts:
- ✅ **Node.js API** on http://localhost:4000 (blue logs)
- ✅ **React Frontend** on http://localhost:3000 (green logs)
- ✅ **Python ML Service** on http://localhost:8000 (yellow logs)

---

## How the Model Persistence Works 🧠

### First Time Setup

1. **Run setup** (creates Python virtual environment):
   ```bash
   cd server/ml-service
   ./setup.sh
   ```

2. **Start services**:
   ```bash
   npm run dev:full
   ```

3. **Train initial models** (via API or UI):
   - Models are trained with historical data
   - Saved to `server/ml-service/models/{disease}/{location_uid}/`
   - Stored as pickle files (SARIMA + XGBoost)

### Daily Usage

#### Option 1: Fast Inference (Recommended) ⚡
- Click **"Get Forecast"** button
- Uses saved models from disk
- **Speed**: ~5-10 seconds
- **When to use**: Regular forecasting, checking predictions

```bash
# Via API
curl -X POST http://localhost:4000/api/forecast/generate \
  -H "Content-Type: application/json" \
  -d '{
    "disease": "Malaria",
    "location_uid": "O6uvpzGd5pu",
    "horizon": 4,
    "force_retrain": false
  }'
```

#### Option 2: Refresh with Latest Data 🔄
- Click **"Refresh & Retrain"** button
- Pulls latest climate data from ERA5 (or generates synthetic)
- Retrains both models
- Saves updated models
- **Speed**: ~2-3 minutes
- **When to use**: Weekly updates, when you want latest data

```bash
# Via API
curl -X POST http://localhost:4000/api/forecast/generate \
  -H "Content-Type: application/json" \
  -d '{
    "disease": "Malaria",
    "location_uid": "O6uvpzGd5pu",
    "horizon": 4,
    "force_retrain": true
  }'
```

---

## Model Storage Structure

```
server/ml-service/models/
├── Malaria/
│   ├── O6uvpzGd5pu/          # Bo District
│   │   ├── sarima_model.pkl
│   │   └── xgboost_model.pkl
│   ├── fdc6uOvgoji/          # Bombali District
│   │   ├── sarima_model.pkl
│   │   └── xgboost_model.pkl
│   └── ...
├── Measles/
│   └── ...
└── ...
```

Models are automatically:
- ✅ Created on first training
- ✅ Loaded from disk on subsequent predictions
- ✅ Updated when "Refresh & Retrain" is clicked
- ✅ Cached in memory for even faster access

---

## Workflow Comparison

### Old Workflow (Manual)
```bash
# Terminal 1
cd server/ml-service
source venv/bin/activate
python main.py

# Terminal 2
npm run server:dev

# Terminal 3
npm run dev

# Every prediction = retrain = slow ❌
```

### New Workflow (Automated)
```bash
# Single terminal
npm run dev:full

# First prediction = train + save ✅
# Subsequent predictions = load from disk = fast ⚡
# Manual refresh = retrain when needed 🔄
```

---

## Available npm Scripts

```json
{
  "dev": "vite --host :: --port 3000",           // Frontend only
  "server:dev": "tsx watch server/src/index.ts", // Backend only
  "ml:start": "cd server/ml-service && ./start.sh", // ML service only
  "dev:full": "concurrently ... all three",      // 🌟 Start everything
  "server:build": "tsc -p server/tsconfig.json", // Build TypeScript
  "build:full": "npm run server:build && npm run build" // Build all
}
```

---

## Understanding the Logs

When you run `npm run dev:full`, you'll see color-coded logs:

```
[API]      🔵 Server listening on port 4000
[FRONTEND] 🟢 VITE ready in 523ms → http://localhost:3000
[ML]       🟡 Starting ML Service on port 8000...
[ML]       🟡 INFO: Uvicorn running on http://0.0.0.0:8000
```

**Reading the logs:**
- 🔵 **API** = Node.js/Express backend
- 🟢 **FRONTEND** = Vite/React development server
- 🟡 **ML** = Python FastAPI ML service

---

## First Time Model Training

### Method 1: Via Frontend UI
1. Open http://localhost:3000
2. Navigate to Forecast Dashboard
3. Select disease and location
4. Click **"Get Forecast"**
5. First time will auto-train and save model (~60s)
6. Subsequent forecasts will be instant (~5s)

### Method 2: Via API
```bash
# Train specific model
curl -X POST http://localhost:4000/api/forecast/train \
  -H "Content-Type: application/json" \
  -d '{
    "disease": "Malaria",
    "location_uid": "O6uvpzGd5pu"
  }'

# Or let auto-train handle it
curl -X POST http://localhost:4000/api/forecast/generate \
  -H "Content-Type: application/json" \
  -d '{
    "disease": "Malaria",
    "location_uid": "O6uvpzGd5pu"
  }'
```

### Method 3: Batch Train All Districts
```bash
curl -X POST http://localhost:4000/api/forecast/batch \
  -H "Content-Type: application/json" \
  -d '{
    "disease": "Malaria",
    "horizon": 4
  }'
```

This trains models for all 13 districts (~10-15 minutes).

---

## When to Retrain Models

### Auto-Train (First Time)
- ✅ Model doesn't exist
- ✅ Happens automatically on first forecast
- ✅ Saves model for future use

### Manual Retrain (Refresh Button)
Retrain when:
- 📅 Weekly/monthly updates needed
- 🌡️ New climate data available
- 📊 Significant data changes
- 🔄 Model performance degradation

**Recommendation**:
- Daily forecasts: Use saved models (fast)
- Weekly updates: Click "Refresh & Retrain"
- Production: Schedule weekly retraining

---

## Troubleshooting

### Issue: ML Service Won't Start

```bash
# Check Python setup
cd server/ml-service
source venv/bin/activate
python --version  # Should be 3.9+

# Reinstall dependencies
pip install -r requirements.txt

# Test manually
python main.py
```

### Issue: "Model not found" Error

```bash
# Check if models directory exists
ls -la server/ml-service/models/

# Train a model
curl -X POST http://localhost:4000/api/forecast/train \
  -H "Content-Type: application/json" \
  -d '{"disease": "Malaria", "location_uid": "O6uvpzGd5pu"}'
```

### Issue: Port Already in Use

```bash
# Kill processes on ports
lsof -ti:3000 | xargs kill  # Frontend
lsof -ti:4000 | xargs kill  # API
lsof -ti:8000 | xargs kill  # ML Service

# Then restart
npm run dev:full
```

### Issue: Forecast Taking Too Long

- Check if using `force_retrain: true` (slow)
- Use saved models for faster inference
- First time training takes 1-2 minutes
- Subsequent predictions should be ~5 seconds

---

## Performance Optimization

### For Development
```bash
# Use saved models (default behavior)
npm run dev:full
# Then use "Get Forecast" button
```

### For Production
```bash
# Pre-train all models
curl -X POST http://localhost:4000/api/forecast/batch \
  -d '{"disease": "Malaria", "horizon": 4}'

# Then use saved models in production
# Schedule weekly retraining via cron
```

### Cron Job Example
```bash
# Retrain all models every Sunday at 2 AM
0 2 * * 0 curl -X POST http://localhost:4000/api/forecast/batch \
  -H "Content-Type: application/json" \
  -d '{"disease": "Malaria", "horizon": 4}'
```

---

## Development Tips

### Quick Commands
```bash
# Start everything
npm run dev:full

# Stop everything
Ctrl+C (kills all processes)

# Build for production
npm run build:full

# Check ML service health
curl http://localhost:8000/health

# List cached models
curl http://localhost:8000/models
```

### Hot Reload
- ✅ Frontend: Auto-reloads on file changes
- ✅ Node.js API: Auto-reloads with tsx watch
- ⚠️ ML Service: Manual restart needed for code changes

To reload ML service:
```bash
# Ctrl+C to stop
npm run dev:full  # Restart
```

---

## Architecture Flow

```
User clicks "Get Forecast" (fast inference)
    ↓
React Frontend → Node.js API → Python ML Service
                                    ↓
                            Check if model exists
                                    ↓
                            Load from disk (fast!)
                                    ↓
                            Generate predictions
                                    ↓
                            Return forecast

User clicks "Refresh & Retrain" (full retrain)
    ↓
React Frontend → Node.js API → Python ML Service
                                    ↓
                            Fetch latest ERA5 data
                                    ↓
                            Retrain SARIMA + XGBoost
                                    ↓
                            Save models to disk
                                    ↓
                            Generate predictions
                                    ↓
                            Return forecast
```

---

## Best Practices

1. **First Time Setup**
   ```bash
   cd server/ml-service && ./setup.sh
   npm run dev:full
   ```

2. **Daily Development**
   ```bash
   npm run dev:full  # One command
   ```

3. **Testing Forecasts**
   - Use "Get Forecast" for speed
   - Use "Refresh & Retrain" weekly

4. **Production Deployment**
   - Pre-train all models
   - Schedule weekly retraining
   - Use saved models for inference

5. **Model Updates**
   - Monitor performance metrics
   - Retrain when MAE > 30 or RMSE > 60
   - Weekly retraining recommended

---

## Summary

✅ **One command to start**: `npm run dev:full`

✅ **Fast inference**: Models load from disk (~5s)

✅ **Smart retraining**: Only when you click "Refresh"

✅ **Model persistence**: Saved locally, cached in memory

✅ **Production ready**: Pre-train, schedule updates

✅ **Developer friendly**: Color-coded logs, auto-reload

---

## What's Next?

1. Run `npm run dev:full`
2. Open http://localhost:3000
3. Go to Forecast Dashboard
4. Select disease and location
5. Click "Get Forecast"
6. First time trains and saves model
7. Subsequent forecasts are instant!

**Happy Forecasting! 🎉**
