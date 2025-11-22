# Climate Data Setup for ML Modeling

This guide explains how to set up ERA5 climate data for disease forecasting ML models.

## Overview

The system uses **ERA5 reanalysis climate data** from Copernicus Climate Data Store (CDS) for historical climate information. Data includes:

- **Temperature** (mean, min, max) in Celsius
- **Precipitation** in millimeters
- **Humidity** as percentage (0-100)
- **Wind Speed** in meters per second

## Prerequisites

1. **CDS API Key**: Sign up at https://cds.climate.copernicus.eu and get your API key
2. **Accept ERA5 License**: Visit https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels and accept the terms of use
3. **PostgreSQL Database**: Running DHIS2 database with `climate_data` table

## Quick Start for New Users

### 1. Configure API Key

Add your CDS API key to the `.env` file in the project root:

```bash
CDS_API_KEY=your-api-key-here
CDS_API=https://cds.climate.copernicus.eu/api
```

### 2. Run Setup Script

The setup script will automatically:
- Check if climate data exists in the database
- Download ERA5 data if needed (2023-2024)
- Store data in PostgreSQL
- Cache NetCDF files for reuse

```bash
cd server/ml-service
./venv/bin/python setup_climate_data.py
```

**Options:**
```bash
# Check status only (no download)
./venv/bin/python setup_climate_data.py --check-only

# Force re-download even if data exists
./venv/bin/python setup_climate_data.py --force
```

### 3. Verify Data

Check that data was loaded successfully:

```bash
./venv/bin/python setup_climate_data.py --check-only
```

Expected output:
```
Climate Data Status
============================================================
Database Records: 9516
Date Range: 2023-01-01 to 2024-12-31
Districts: 13/13

Cached Files: 2
  - era5_sierra_leone_20230101_20231231.nc (3.2 MB)
  - era5_sierra_leone_20240101_20241231.nc (3.2 MB)
============================================================
```

## Manual Data Download

If you need to download specific date ranges:

```bash
cd server/ml-service

# Download and keep files for reuse
./venv/bin/python download_era5_data.py 2022-01-01 2022-12-31 --keep-files

# Download without keeping files (saves disk space)
./venv/bin/python download_era5_data.py 2022-01-01 2022-12-31
```

**Note:** Files are automatically skipped if they already exist, so you won't download the same data twice.

## Using Climate Data in ML Models

### Basic Loading

```python
from climate_data_loader import ClimateDataLoader

# Load all climate data
with ClimateDataLoader() as loader:
    climate_df = loader.load_climate_data(
        start_date='2024-01-01',
        end_date='2024-12-31'
    )

    print(climate_df.head())
```

### Loading for Specific Districts

```python
# Load data for Bo and Bonthe districts only
bo_uid = 'O6uvpzGd5pu'
bonthe_uid = 'lc3eMKXaEfw'

with ClimateDataLoader() as loader:
    climate_df = loader.load_climate_data(
        start_date='2024-01-01',
        end_date='2024-12-31',
        location_uids=[bo_uid, bonthe_uid]
    )
```

### Merging Climate and Disease Data

```python
with ClimateDataLoader() as loader:
    # Merge climate data with malaria cases
    # lag_days=14 means climate data from 14 days before the disease case
    merged_df = loader.merge_climate_disease_data(
        disease_name='Malaria',
        start_date='2024-01-01',
        end_date='2024-12-31',
        lag_days=14  # 2-week lag for predictive modeling
    )

    # Now merged_df has both climate features and disease cases
    print(merged_df.head())
```

### Creating Time Series Features

```python
with ClimateDataLoader() as loader:
    climate_df = loader.load_climate_data(
        start_date='2024-01-01',
        end_date='2024-12-31'
    )

    # Add rolling window features (7, 14, 30 day averages)
    features_df = loader.create_time_series_features(
        climate_df,
        window_sizes=[7, 14, 30]
    )

    # Now you have features like:
    # - temp_mean_7d, temp_mean_14d, temp_mean_30d
    # - precip_sum_7d, precip_sum_14d, precip_sum_30d
    # - humidity_mean_7d, humidity_mean_14d, humidity_mean_30d
```

### Exporting to CSV

```python
with ClimateDataLoader() as loader:
    climate_df = loader.load_climate_data(
        start_date='2024-01-01',
        end_date='2024-12-31'
    )

    # Export for use in other tools
    loader.export_to_csv(climate_df, 'climate_data_2024.csv')
```

## Data Storage

### Database Storage

Climate data is stored in the `climate_data` table in PostgreSQL:

```sql
SELECT * FROM climate_data
WHERE source = 'ERA5'
ORDER BY date, location_uid
LIMIT 10;
```

### Cached NetCDF Files

NetCDF files are cached in `server/ml-service/data/`:

```
server/ml-service/data/
├── era5_sierra_leone_20230101_20231231.nc  (~3.2 MB)
├── era5_sierra_leone_20240101_20241231.nc  (~3.2 MB)
└── ...
```

**Benefits of caching:**
- No need to re-download data
- Faster data loading
- Works offline (once downloaded)
- Can be shared with team members

**Disk space:**
- Full year of data: ~3-4 MB per file
- 3 years of data: ~10-12 MB total
- Very manageable size!

## District Coverage

Data is available for all 13 Sierra Leone districts:

1. Bo (O6uvpzGd5pu)
2. Bombali (fdc6uOvgoji)
3. Bonthe (lc3eMKXaEfw)
4. Kailahun (jUb8gELQApl)
5. Kambia (PMa2VCrupOd)
6. Kenema (kJq2mPyFEHo)
7. Koinadugu (qhqAxPSTUXp)
8. Kono (Vth0fbpFcsO)
9. Moyamba (jmIPBj66vD6)
10. Port Loko (TEQlaapDQoK)
11. Pujehun (bL4ooGhyHRQ)
12. Tonkolili (eIQbndfxQMb)
13. Western Area (at6UHUQatSo)

## Available Data Range

- **Currently Available**: 2024 full year (366 days × 13 districts = 4,758 records)
- **Can Download**: Any date from 1940 to present (ERA5 reanalysis)
- **Recommended for ML**: 2-3 years of data for training models

## API Endpoints

Climate data is also available via REST API:

```bash
# Get climate data for a location
curl "http://localhost:4000/api/climate/O6uvpzGd5pu?startDate=2024-01-01&endDate=2024-01-31"

# Get climate statistics
curl "http://localhost:4000/api/climate/O6uvpzGd5pu/statistics"

# Get cache status for all districts
curl "http://localhost:4000/api/climate/cache/status"
```

## Troubleshooting

### "CDS_API_KEY not found"

Add your API key to `.env` file:
```bash
CDS_API_KEY=your-key-here
```

### "License not accepted"

Visit https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels and accept the terms of use.

### "Download failed: MARS error"

The ERA5 server may be temporarily down or overloaded. Try:
1. Wait a few minutes and retry
2. Download smaller date ranges (e.g., 6 months instead of full year)
3. Check CDS status: https://cds.climate.copernicus.eu/

### "No space left on device"

This is a server-side error from CDS. Try downloading smaller date ranges.

### Database connection errors

Check your PostgreSQL configuration in `.env`:
```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=dhis2SierraLeoneDemo
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password
```

## Example: Training a Disease Prediction Model

```python
from climate_data_loader import ClimateDataLoader
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split

# Load merged climate and disease data
with ClimateDataLoader() as loader:
    df = loader.merge_climate_disease_data(
        disease_name='Malaria',
        start_date='2023-01-01',
        end_date='2024-12-31',
        lag_days=14  # Predict cases 14 days ahead
    )

    # Create time series features
    df = loader.create_time_series_features(df, window_sizes=[7, 14, 30])

# Prepare features and target
feature_cols = [
    'temperature_mean', 'precipitation', 'humidity', 'wind_speed',
    'temp_mean_7d', 'temp_mean_14d', 'temp_mean_30d',
    'precip_sum_7d', 'precip_sum_14d', 'precip_sum_30d',
    'humidity_mean_7d', 'humidity_mean_14d', 'humidity_mean_30d'
]

X = df[feature_cols]
y = df['cases']

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train model
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate
score = model.score(X_test, y_test)
print(f"Model R² score: {score:.3f}")

# Get feature importance
importance = pd.DataFrame({
    'feature': feature_cols,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

print("\nTop 5 most important features:")
print(importance.head())
```

## Data Quality

ERA5 reanalysis data is:
- ✓ **High quality**: Validated and corrected by ECMWF
- ✓ **Complete**: No missing values
- ✓ **Consistent**: Same methodology across all years
- ✓ **Gridded**: 0.25° × 0.25° resolution (~28 km)
- ✓ **Temporal**: 4 times per day (00:00, 06:00, 12:00, 18:00 UTC)

For more information: https://www.ecmwf.int/en/forecasts/dataset/ecmwf-reanalysis-v5

## Support

For issues or questions:
1. Check this documentation
2. Run `./venv/bin/python setup_climate_data.py --check-only` to diagnose
3. Check CDS documentation: https://cds.climate.copernicus.eu/how-to-api
4. Contact the development team

---

**Last Updated**: 2024-11-22
