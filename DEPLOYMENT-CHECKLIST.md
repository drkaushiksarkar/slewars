# Deployment Checklist

## Pre-Deployment Requirements

Before deploying on a new laptop, ensure:

- [ ] PostgreSQL is installed and running
- [ ] DHIS2 database is imported as `dhis2SierraLeoneDemo`
- [ ] Node.js 18+ is installed
- [ ] Python 3.12 is installed (or Homebrew for auto-install)
- [ ] Git repository is cloned

## One-Line Deployment

Run this single command:

```bash
./setup.sh && npm run dev:full
```

## Deployment Verification

After running the deployment command, verify:

### 1. Services Status
- [ ] Frontend accessible at http://localhost:3000
- [ ] Backend API accessible at http://localhost:4000
- [ ] ML Service accessible at http://localhost:8000

Quick check:
```bash
curl http://localhost:3000      # Should return HTML
curl http://localhost:4000/api/forecast/health  # Should return {"status":"healthy"}
curl http://localhost:8000/health               # Should return {"status":"healthy"}
```

### 2. ML Models
- [ ] Models exist in `server/ml-service/models/`
- [ ] At least one of these files exists:
  - `improved_unified_model_v3.1.pkl`
  - `improved_unified_model_v3.0.pkl`
  - `unified_model_v2.0.pkl`

Quick check:
```bash
ls -lh server/ml-service/models/*.pkl
```

### 3. Database Connection
- [ ] Backend can connect to PostgreSQL
- [ ] Migrations have been applied
- [ ] Tables exist: `forecasts`, `model_performance`, `climate_data`

Quick check:
```bash
psql -d dhis2SierraLeoneDemo -c "\dt" | grep -E "forecasts|model_performance|climate_data"
```

### 4. Dashboard Functionality
- [ ] Dashboard loads without errors
- [ ] Map displays Sierra Leone districts
- [ ] Disease data loads
- [ ] Forecasts are displayed
- [ ] No console errors in browser

### 5. Expected Behavior on First Run

When running on a new laptop for the first time:

1. **Setup phase (~2-3 minutes)**
   - Checks dependencies
   - Installs Node packages
   - Creates Python virtual environment
   - Installs Python dependencies
   - Runs database migrations

2. **Auto-training phase (~5-10 minutes)**
   - Only if models don't exist
   - Trains unified model with all diseases
   - Shows training progress in console
   - Saves model to `server/ml-service/models/`

3. **Service startup (~10 seconds)**
   - Starts Backend API
   - Starts Frontend dev server
   - Starts ML Service
   - All services running concurrently

## Troubleshooting

### Services not starting
```bash
# Check if ports are in use
lsof -i :3000
lsof -i :4000
lsof -i :8000

# Kill processes if needed
kill -9 <PID>
```

### Models not training
```bash
cd server/ml-service
source venv/bin/activate
python3 train_unified_model.py
```

### Database connection issues
```bash
# Verify database exists
psql -l | grep dhis2SierraLeoneDemo

# Test connection
psql -d dhis2SierraLeoneDemo -c "SELECT version();"
```

### Clean reinstall
```bash
# Remove all generated files
rm -rf node_modules
rm -rf server/ml-service/venv
rm -rf server/ml-service/models/*.pkl
rm -rf dist
rm -rf server/dist

# Run setup again
./setup.sh && npm run dev:full
```

## Performance Expectations

### First-time setup (cold start):
- Setup script: 2-3 minutes
- Model training: 5-10 minutes
- Total: **7-13 minutes**

### Subsequent starts (warm start):
- All services: 10-15 seconds
- Total: **< 30 seconds**

## Success Criteria

✅ Deployment is successful when:
1. All three services are running without errors
2. Dashboard loads at http://localhost:3000
3. Disease forecasts are displayed correctly
4. Map shows Sierra Leone districts with data
5. No errors in browser console or terminal
6. ML models are loaded and responding

## Post-Deployment

After successful deployment:
- [ ] Test a few forecasts for different diseases
- [ ] Verify map interactions work
- [ ] Check simulation features
- [ ] Review console logs for any warnings
- [ ] Bookmark http://localhost:3000 for easy access

## Notes

- Models are shared via Git (committed as .pkl files)
- On a new laptop with models already in repo, training is skipped
- First run will be slower due to dependency installation
- Subsequent runs are much faster
- Use `npm run dev:full` for all development work
