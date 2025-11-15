# Quick Fix Guide - Getting Dashboard Running

## Your Current Situation

✅ **Backend API is running** on port 4000
❌ **Python ML service** has dependency issues (scipy/OpenBLAS)
❓ **Frontend** should work now that backend is up

## Quick Solution (3 Options)

### Option 1: Use Backend Without ML Service (Fastest)

The dashboard will work with all Phase 1-2 features. Forecasting won't work until ML service is fixed.

```bash
# Backend is already running, just start frontend
npm run dev

# Open http://localhost:3000
# You'll have:
# ✅ Overview Dashboard
# ✅ Disease data
# ✅ Location data
# ✅ Analytics
# ❌ Forecasting (needs ML service)
```

### Option 2: Install OpenBLAS for Full ML (Recommended for Mac)

```bash
# Install OpenBLAS via Homebrew
brew install openblas

# Set environment variables
export OPENBLAS="$(brew --prefix openblas)"
export LDFLAGS="-L${OPENBLAS}/lib"
export CPPFLAGS="-I${OPENBLAS}/include"
export PKG_CONFIG_PATH="${OPENBLAS}/lib/pkgconfig"

# Now install Python requirements
cd server/ml-service
source venv/bin/activate
pip install -r requirements.txt

# Start ML service
python main.py
```

### Option 3: Use Minimal ML Service (XGBoost Only)

```bash
cd server/ml-service
source venv/bin/activate

# Install minimal requirements (no SARIMA, just XGBoost)
pip install -r requirements-minimal.txt

# This will work but:
# ✅ XGBoost predictions
# ❌ SARIMA time series (requires scipy)
# ❌ Ensemble model (needs both)
```

## What's Currently Working

### ✅ Backend API (Port 4000)
```bash
# Test it
curl http://localhost:4000/api/health
curl http://localhost:4000/api/diseases
curl http://localhost:4000/api/analytics/overview
```

### Test Frontend
```bash
# In a new terminal
npm run dev

# Open http://localhost:3000
# Dashboard should load now!
```

## Error Explanation

```
ECONNREFUSED → Backend wasn't running
ECONNRESET → Backend crashed/restarted
```

**Now**: Backend is running, so these errors should be gone!

## Recommended Steps Right Now

1. **Test if dashboard works** (backend is running):
   ```bash
   npm run dev
   # Open http://localhost:3000
   ```

2. **If dashboard works**: You have all features except forecasting

3. **To enable forecasting**: Install OpenBLAS (Option 2 above)

## Logs

View what's happening:
```bash
# Backend logs
tail -f logs/backend.log

# Frontend logs (if running)
# Will show in terminal
```

## Stop Everything

```bash
# Kill backend
lsof -ti:4000 | xargs kill

# Kill frontend
lsof -ti:3000 | xargs kill

# Kill ML service (if running)
lsof -ti:8000 | xargs kill
```

## Start Fresh

```bash
# 1. Start backend
npm run server:dev &

# 2. Start frontend
npm run dev &

# 3. (Optional) Start ML service when ready
cd server/ml-service
source venv/bin/activate
python main.py &
```

## What You Should See

### Frontend Working ✅
- Overview dashboard loads
- Disease data displays
- Maps render
- Analytics show

### Frontend with Errors ❌
- Blank page
- "Failed to fetch" errors
- Proxy errors

If you still see errors, share the frontend output!

## Next: Install OpenBLAS (For Full Forecasting)

```bash
# macOS
brew install openblas

# Ubuntu/Debian
sudo apt-get install libopenblas-dev

# Then retry:
cd server/ml-service
source venv/bin/activate
pip install -r requirements.txt
```

## Summary

**Current State**:
- ✅ Backend running (port 4000)
- ✅ Database connected
- ❌ ML service not running (dependency issue)

**Action**:
1. Start frontend: `npm run dev`
2. Test dashboard: http://localhost:3000
3. Fix ML later with OpenBLAS if needed
