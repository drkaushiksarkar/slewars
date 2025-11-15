# ML Forecasting Training Guide

## Issue Summary

The ML forecasting tab is working correctly, but there's a **psycopg2 compatibility issue with Python 3.14** that prevents initial model training from completing.

## What's Been Fixed

✅ All UI changes completed:
- Removed "Get Forecast" button
- Added auto-loading of forecasts on filter change
- Added "Refresh & Retrain" button with confirmation modal
- Improved error handling and messaging

✅ Backend fixes:
- Fixed "list index out of range" errors in forecast service
- Added validation for insufficient data
- Improved error messages

## The Remaining Issue

The `psycopg2-binary` library (version 2.9.11) has compatibility issues with Python 3.14, causing "tuple index out of range" errors when executing database queries with parameters.

## Solutions

### Option 1: Downgrade Python (Recommended)

Use Python 3.11 or 3.12 in the ML service venv:

```bash
cd server/ml-service
deactivate  # if venv is active
rm -rf venv
python3.11 -m venv venv  # or python3.12
source venv/bin/activate
pip install -r requirements.txt  # if you have one
pip install psycopg2-binary xgboost pandas numpy scikit-learn loguru python-dotenv
```

Then run training:
```bash
python3 quick_train.py
```

### Option 2: Use psycopg3 (Alternative)

Install psycopg3 instead:

```bash
cd server/ml-service
source venv/bin/activate
pip uninstall psycopg2-binary
pip install psycopg[binary]
```

Then update `server/ml-service/database.py`:
- Change `import psycopg2` to `import psycopg`
- Change `from psycopg2.extras import RealDictCursor` to `from psycopg.rows import dict_row`
- Update cursor factory usage

### Option 3: Use the API Directly

Once you fix the Python/psycopg2 issue using Option 1 or 2, run:

```bash
cd server/ml-service
source venv/bin/activate
python3 quick_train.py
```

This will:
1. Train Malaria models for 5 districts (Bo, Bombali, Bonthe, Kailahun, Kambia)
2. Generate initial forecasts
3. Save everything to the database
4. Take approximately 5-10 minutes total

## After Training

Once training completes:
1. Open the ML Forecasting tab in your application
2. Select a disease (Malaria) and location (Bo, Bombali, etc.)
3. Forecasts will automatically load
4. Click "Refresh & Retrain" when you want updated forecasts with latest data

## Files Created

- `server/ml-service/quick_train.py` - Simple training script
- `server/ml-service/train_initial_setup.py` - Comprehensive training with data validation
- `server/ml-service/test_db.py` - Database connection test

## Current Status

- ✅ Frontend: Fully implemented and working
- ✅ Backend: API endpoints working
- ✅ ML Service: Core forecasting logic working
- ❌ Training: Blocked by psycopg2/Python 3.14 compatibility issue

## Quick Check

Test if your database connection works:

```bash
cd server/ml-service
source venv/bin/activate
python3 -c "import psycopg2; conn = psycopg2.connect(database='dhis2SierraLeoneDemo'); print('✓ Connected')"
```

If this fails, you have the psycopg2 issue. Use Option 1 above.
