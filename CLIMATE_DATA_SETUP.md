# Climate Data Setup Guide

## Overview

Your Early Warning System now has **real ERA5 climate data** integrated for disease forecasting and ML modeling.

## ✅ What's Already Done

### 1. **ERA5 Data Downloaded and Stored**
- ✓ **4,758 records** from ERA5 reanalysis
- ✓ **Full year 2024** (Jan 1 - Dec 31)
- ✓ **All 13 Sierra Leone districts** covered
- ✓ Data stored in PostgreSQL `climate_data` table
- ✓ Accessible via REST API and Python

### 2. **Dashboard Integration Complete**
- ✓ Dashboard automatically uses ERA5 data
- ✓ All synthetic data removed from database
- ✓ API endpoints tested and working

### 3. **ML Modeling Infrastructure Ready**
- ✓ Python data loader created (`climate_data_loader.py`)
- ✓ Automatic setup script for new users (`setup_climate_data.py`)
- ✓ Download script with file caching (`download_era5_data.py`)
- ✓ Comprehensive documentation (`README_CLIMATE_DATA.md`)

## 📊 Current Data Status

```
Database Records: 4,758
Date Range: 2024-01-01 to 2024-12-31
Districts: 13/13 (100% coverage)
Source: ERA5 Reanalysis (Copernicus)
```

### Data by District (2024)

| District | Days | Avg Temp | Total Rainfall |
|----------|------|----------|----------------|
| Bo | 366 | 26.96°C | 443mm |
| Bombali | 366 | 27.96°C | 346mm |
| Bonthe | 366 | 27.12°C | 570mm |
| Kailahun | 366 | 26.94°C | 378mm |
| Kambia | 366 | 27.47°C | 432mm |
| Kenema | 366 | 26.63°C | 394mm |
| Koinadugu | 366 | 26.78°C | 326mm |
| Kono | 366 | 26.38°C | 430mm |
| Moyamba | 366 | 26.74°C | 482mm |
| Port Loko | 366 | 27.05°C | 485mm |
| Pujehun | 366 | 26.67°C | 508mm |
| Tonkolili | 366 | 26.69°C | 464mm |
| Western Area | 366 | 27.10°C | 612mm |

## 🚀 For New Users Setting Up

If a new person sets up the dashboard, they should:

### Step 1: Get CDS API Key
1. Sign up at: https://cds.climate.copernicus.eu
2. Get your API key from your profile
3. Accept the ERA5 license: https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels

### Step 2: Configure Environment
Add to `.env` file:
```bash
CDS_API_KEY=your-api-key-here
CDS_API=https://cds.climate.copernicus.eu/api
```

### Step 3: Run Setup Script
```bash
cd server/ml-service
./venv/bin/python setup_climate_data.py
```

This will:
- Check if data exists in database
- Download ERA5 data if needed (2023-2024)
- Store in PostgreSQL
- Cache NetCDF files (~6-8 MB total)

**Time**: ~10-15 minutes for 2 years of data

### Step 4: Verify
```bash
./venv/bin/python setup_climate_data.py --check-only
```

## 💾 Data Files & Storage

### Cached NetCDF Files
Location: `server/ml-service/data/`

Files are automatically named by date range:
```
era5_sierra_leone_20230101_20231231.nc  (~3.2 MB)
era5_sierra_leone_20240101_20241231.nc  (~3.2 MB)
```

**Benefits:**
- ✓ No re-download needed
- ✓ Can work offline
- ✓ Share files with team
- ✓ Small size (~3-4 MB per year)

**Storage Requirements:**
- 1 year: ~3-4 MB
- 3 years: ~10-12 MB
- Very manageable!

### Database Storage
All data stored in `climate_data` table in PostgreSQL.

To check:
```sql
SELECT source, COUNT(*), MIN(date), MAX(date)
FROM climate_data
GROUP BY source;
```

## 🤖 Using in ML Models

### Quick Start

```python
from climate_data_loader import ClimateDataLoader

# Load climate data
with ClimateDataLoader() as loader:
    df = loader.load_climate_data(
        start_date='2024-01-01',
        end_date='2024-12-31'
    )
    print(df.head())
```

### Merge with Disease Data

```python
with ClimateDataLoader() as loader:
    # Merge climate + disease data with 14-day lag
    df = loader.merge_climate_disease_data(
        disease_name='Malaria',
        start_date='2024-01-01',
        end_date='2024-12-31',
        lag_days=14
    )
```

### Create Time Series Features

```python
with ClimateDataLoader() as loader:
    df = loader.load_climate_data(
        start_date='2024-01-01',
        end_date='2024-12-31'
    )

    # Add rolling averages (7, 14, 30 days)
    df = loader.create_time_series_features(df)
```

Full examples in: `server/ml-service/README_CLIMATE_DATA.md`

## 📡 API Endpoints

Climate data available via REST API:

```bash
# Get climate data for Bo district
curl "http://localhost:4000/api/climate/O6uvpzGd5pu?startDate=2024-01-01&endDate=2024-12-31"

# Get climate statistics
curl "http://localhost:4000/api/climate/O6uvpzGd5pu/statistics"

# Check data coverage
curl "http://localhost:4000/api/climate/cache/status"
```

## 📥 Downloading More Data

### For Specific Years

```bash
cd server/ml-service

# Download 2023 data and keep file
./venv/bin/python download_era5_data.py 2023-01-01 2023-12-31 --keep-files

# Download 2022 data
./venv/bin/python download_era5_data.py 2022-01-01 2022-12-31 --keep-files
```

### Historical Data Available

ERA5 reanalysis covers **1940 to present**. You can download any range:

```bash
# Get data from 2020-2024 (5 years)
./venv/bin/python download_era5_data.py 2020-01-01 2020-12-31 --keep-files
./venv/bin/python download_era5_data.py 2021-01-01 2021-12-31 --keep-files
./venv/bin/python download_era5_data.py 2022-01-01 2022-12-31 --keep-files
```

**Tip**: Download year-by-year or in 6-month chunks to avoid server timeouts.

## 🔧 Troubleshooting

### CDS Server Timeout
If download fails with "MARS error" or timeout:
- Wait 5-10 minutes and retry
- Download smaller date ranges (6 months)
- Check CDS status: https://cds.climate.copernicus.eu

### Missing Data
If setup says "No data found":
1. Check `.env` has `CDS_API_KEY`
2. Verify license accepted on CDS website
3. Check PostgreSQL connection in `.env`
4. Try manual download for testing

### File Already Exists
If you see "Found existing file":
- Script automatically skips re-download
- Delete file from `data/` folder to force re-download
- Or use different date range

## 📝 Important Files

```
server/ml-service/
├── download_era5_data.py           # Download ERA5 data
├── setup_climate_data.py           # Auto-setup for new users
├── climate_data_loader.py          # ML data loader
├── README_CLIMATE_DATA.md          # Full documentation
└── data/                           # Cached NetCDF files
    ├── era5_sierra_leone_*.nc     # Climate data files
    └── extracted/                 # Temp files (auto-cleaned)
```

## 🎯 Next Steps

### For Dashboard Users
Everything is ready! The dashboard automatically uses ERA5 data.

### For ML Modelers
1. Review `server/ml-service/README_CLIMATE_DATA.md`
2. Test the data loader: `python climate_data_loader.py`
3. Start building models with real climate data!

### For New Team Members
1. Get CDS API key
2. Run `setup_climate_data.py`
3. Wait ~10-15 minutes for download
4. Start using the data

## 📊 Data Quality

ERA5 is:
- ✓ **High quality**: Validated by ECMWF
- ✓ **Complete**: No missing values
- ✓ **Consistent**: Same methodology across years
- ✓ **Resolution**: ~28km grid (0.25° × 0.25°)
- ✓ **Temporal**: 4 times daily (00:00, 06:00, 12:00, 18:00 UTC)

More info: https://www.ecmwf.int/en/forecasts/dataset/ecmwf-reanalysis-v5

---

**Setup Date**: 2024-11-22
**Data Source**: ERA5 Reanalysis (Copernicus Climate Data Store)
**Coverage**: 2024 (ready to expand to 2020-2024 or beyond)
