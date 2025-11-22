"""
ERA5 Climate Data Download Script
Downloads historical climate data from Copernicus Climate Data Store (CDS)
for Sierra Leone districts and stores in PostgreSQL database.
"""

import os
import sys
from datetime import datetime, timedelta
import cdsapi
import xarray as xr
import numpy as np
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values
import logging
import zipfile

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables from project root
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)

# Database configuration
DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': os.getenv('POSTGRES_PORT', '5432'),
    'database': os.getenv('POSTGRES_DB', 'dhis2SierraLeoneDemo'),
    'user': os.getenv('POSTGRES_USER'),
    'password': os.getenv('POSTGRES_PASSWORD')
}

# Sierra Leone districts with coordinates
DISTRICTS = [
    {'uid': 'O6uvpzGd5pu', 'name': 'Bo', 'lat': 7.953, 'lon': -11.714},
    {'uid': 'fdc6uOvgoji', 'name': 'Bombali', 'lat': 9.311, 'lon': -12.166},
    {'uid': 'lc3eMKXaEfw', 'name': 'Bonthe', 'lat': 7.501, 'lon': -12.276},
    {'uid': 'jUb8gELQApl', 'name': 'Kailahun', 'lat': 8.085, 'lon': -10.697},
    {'uid': 'PMa2VCrupOd', 'name': 'Kambia', 'lat': 9.182, 'lon': -12.807},
    {'uid': 'kJq2mPyFEHo', 'name': 'Kenema', 'lat': 7.924, 'lon': -11.201},
    {'uid': 'qhqAxPSTUXp', 'name': 'Koinadugu', 'lat': 9.452, 'lon': -11.345},
    {'uid': 'Vth0fbpFcsO', 'name': 'Kono', 'lat': 8.686, 'lon': -10.949},
    {'uid': 'jmIPBj66vD6', 'name': 'Moyamba', 'lat': 8.059, 'lon': -12.427},
    {'uid': 'TEQlaapDQoK', 'name': 'Port Loko', 'lat': 8.724, 'lon': -12.733},
    {'uid': 'bL4ooGhyHRQ', 'name': 'Pujehun', 'lat': 7.295, 'lon': -11.567},
    {'uid': 'eIQbndfxQMb', 'name': 'Tonkolili', 'lat': 8.662, 'lon': -11.875},
    {'uid': 'at6UHUQatSo', 'name': 'Western Area', 'lat': 8.337, 'lon': -13.105},
]

# Sierra Leone bounding box
SIERRA_LEONE_BOUNDS = {
    'north': 10.0,
    'south': 6.9,
    'west': -13.5,
    'east': -10.2
}


def setup_cdsapi():
    """Setup CDS API client with credentials from environment"""
    cds_api_key = os.getenv('CDS_API_KEY')
    cds_api_url = os.getenv('CDS_API', 'https://cds.climate.copernicus.eu/api')

    if not cds_api_key:
        raise ValueError("CDS_API_KEY not found in environment variables")

    # Create .cdsapirc file in home directory
    cdsapirc_path = Path.home() / '.cdsapirc'
    with open(cdsapirc_path, 'w') as f:
        f.write(f"url: {cds_api_url}\n")
        f.write(f"key: {cds_api_key}\n")

    logger.info("CDS API configured successfully")
    return cdsapi.Client()


def download_era5_data(client, start_date, end_date, output_file):
    """
    Download ERA5 reanalysis data for Sierra Leone

    Args:
        client: CDS API client
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        output_file: Path to save NetCDF file
    """
    logger.info(f"Downloading ERA5 data from {start_date} to {end_date}")

    # Parse dates
    start = datetime.strptime(start_date, '%Y-%m-%d')
    end = datetime.strptime(end_date, '%Y-%m-%d')

    # Generate list of years and months
    years = list(set([str(year) for year in range(start.year, end.year + 1)]))

    # Generate months
    if start.year == end.year:
        months = [f"{month:02d}" for month in range(start.month, end.month + 1)]
    else:
        months = [f"{month:02d}" for month in range(1, 13)]

    # Generate days
    days = [f"{day:02d}" for day in range(1, 32)]

    logger.info(f"Requesting data for years: {years}, months: {months}")

    # ERA5 request
    request = {
        'product_type': 'reanalysis',
        'variable': [
            '2m_temperature',
            'total_precipitation',
            '2m_dewpoint_temperature',
            '10m_u_component_of_wind',
            '10m_v_component_of_wind',
        ],
        'year': years,
        'month': months,
        'day': days,
        'time': ['00:00', '06:00', '12:00', '18:00'],
        'area': [
            SIERRA_LEONE_BOUNDS['north'],
            SIERRA_LEONE_BOUNDS['west'],
            SIERRA_LEONE_BOUNDS['south'],
            SIERRA_LEONE_BOUNDS['east']
        ],
        'format': 'netcdf',
    }

    try:
        client.retrieve(
            'reanalysis-era5-single-levels',
            request,
            output_file
        )
        logger.info(f"Download complete: {output_file}")
        return True
    except Exception as e:
        logger.error(f"Error downloading ERA5 data: {e}")
        return False


def calculate_humidity_from_dewpoint(temp_k, dewpoint_k):
    """
    Calculate relative humidity from temperature and dewpoint temperature

    Args:
        temp_k: Temperature in Kelvin
        dewpoint_k: Dewpoint temperature in Kelvin

    Returns:
        Relative humidity as percentage (0-100)
    """
    # Convert to Celsius
    temp_c = temp_k - 273.15
    dewpoint_c = dewpoint_k - 273.15

    # Magnus formula for saturation vapor pressure
    def saturation_vapor_pressure(t):
        return 6.112 * np.exp((17.67 * t) / (t + 243.5))

    # Calculate relative humidity
    es = saturation_vapor_pressure(temp_c)
    e = saturation_vapor_pressure(dewpoint_c)
    rh = 100 * (e / es)

    # Clamp to 0-100 range
    rh = np.clip(rh, 0, 100)

    return rh


def extract_zip_and_find_netcdf(zip_path):
    """
    Extract ZIP file and find the NetCDF files inside

    Args:
        zip_path: Path to ZIP file

    Returns:
        Dictionary with paths to extracted NetCDF files by type
    """
    logger.info(f"Extracting ZIP file: {zip_path}")

    extract_dir = Path(zip_path).parent / 'extracted'
    extract_dir.mkdir(exist_ok=True)

    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_dir)

    # Find NetCDF files in extracted directory
    nc_files = list(extract_dir.glob('*.nc'))

    if not nc_files:
        raise FileNotFoundError(f"No NetCDF file found in {extract_dir}")

    logger.info(f"Found {len(nc_files)} NetCDF files")

    # Organize files by type
    files = {}
    for nc_file in nc_files:
        if 'instant' in nc_file.name:
            files['instant'] = str(nc_file)
        elif 'accum' in nc_file.name:
            files['accum'] = str(nc_file)

    logger.info(f"Instant file: {files.get('instant', 'Not found')}")
    logger.info(f"Accumulated file: {files.get('accum', 'Not found')}")

    return files


def extract_district_data(netcdf_file, start_date, end_date):
    """
    Extract climate data for each district from NetCDF file

    Args:
        netcdf_file: Path to NetCDF file (can be ZIP)
        start_date: Start date filter
        end_date: End date filter

    Returns:
        List of climate data records
    """
    logger.info(f"Extracting district data from {netcdf_file}")

    # Check if file is a ZIP
    nc_files = {}
    if zipfile.is_zipfile(netcdf_file):
        nc_files = extract_zip_and_find_netcdf(netcdf_file)
    else:
        nc_files['instant'] = netcdf_file

    # Open both NetCDF datasets
    ds_instant = xr.open_dataset(nc_files['instant'])
    ds_accum = xr.open_dataset(nc_files['accum']) if 'accum' in nc_files else None

    logger.info(f"Instant dataset variables: {list(ds_instant.variables.keys())}")
    logger.info(f"Instant dataset shape: {ds_instant.dims}")

    if ds_accum:
        logger.info(f"Accumulated dataset variables: {list(ds_accum.variables.keys())}")

    records = []

    # Parse date range
    start_dt = datetime.strptime(start_date, '%Y-%m-%d')
    end_dt = datetime.strptime(end_date, '%Y-%m-%d')

    # Process each district
    for district in DISTRICTS:
        logger.info(f"Processing {district['name']} ({district['uid']})")

        try:
            # Select nearest grid point to district coordinates (instant data)
            district_instant = ds_instant.sel(
                latitude=district['lat'],
                longitude=district['lon'],
                method='nearest'
            )

            # Select precipitation data if available
            district_accum = None
            if ds_accum:
                district_accum = ds_accum.sel(
                    latitude=district['lat'],
                    longitude=district['lon'],
                    method='nearest'
                )

            # Filter by date range using valid_time
            district_instant = district_instant.sel(
                valid_time=slice(start_dt, end_dt)
            )

            if district_accum is not None:
                district_accum = district_accum.sel(
                    valid_time=slice(start_dt, end_dt)
                )

            # Group by day and calculate daily statistics
            daily_instant = district_instant.resample(valid_time='1D').mean()

            # Extract variables and convert units
            # Temperature: Kelvin to Celsius
            temp_2m = daily_instant['t2m'].values - 273.15

            # Dewpoint temperature for humidity calculation
            dewpoint_2m = daily_instant['d2m'].values - 273.15

            # Wind speed: calculate from u and v components
            u_wind = daily_instant['u10'].values
            v_wind = daily_instant['v10'].values
            wind_speed = np.sqrt(u_wind**2 + v_wind**2)

            # Calculate relative humidity
            humidity = calculate_humidity_from_dewpoint(
                daily_instant['t2m'].values,
                daily_instant['d2m'].values
            )

            # Precipitation: meters to millimeters (multiply by 1000)
            # Sum for daily total
            if district_accum is not None:
                daily_precip = district_accum.resample(valid_time='1D').sum()
                precip = daily_precip['tp'].values * 1000
            else:
                precip = np.zeros(len(temp_2m))

            # Create records for each day
            for i, time in enumerate(daily_instant.valid_time.values):
                date = np.datetime64(time, 'D')
                date_str = str(date)

                # Calculate min and max from sub-daily data for this day
                day_start = datetime.strptime(date_str, '%Y-%m-%d')
                day_end = day_start + timedelta(days=1)

                day_temps = district_instant.sel(
                    valid_time=slice(day_start, day_end)
                )['t2m'].values - 273.15

                temp_min = float(np.min(day_temps))
                temp_max = float(np.max(day_temps))
                temp_mean = float(temp_2m[i])

                record = {
                    'location_uid': district['uid'],
                    'date': date_str,
                    'temperature_mean': round(temp_mean, 2),
                    'temperature_min': round(temp_min, 2),
                    'temperature_max': round(temp_max, 2),
                    'precipitation': round(float(precip[i]), 2),
                    'humidity': round(float(humidity[i]), 2),
                    'wind_speed': round(float(wind_speed[i]), 2),
                    'source': 'ERA5'
                }

                records.append(record)

        except Exception as e:
            logger.error(f"Error processing {district['name']}: {e}")
            import traceback
            logger.error(traceback.format_exc())
            continue

    ds_instant.close()
    if ds_accum:
        ds_accum.close()

    logger.info(f"Extracted {len(records)} records from {len(DISTRICTS)} districts")

    return records


def store_climate_data(records):
    """
    Store climate data records in PostgreSQL database

    Args:
        records: List of climate data dictionaries
    """
    logger.info(f"Storing {len(records)} records in database")

    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    try:
        # Prepare data for bulk insert
        values = [
            (
                r['location_uid'],
                r['date'],
                r['temperature_mean'],
                r['temperature_min'],
                r['temperature_max'],
                r['precipitation'],
                r['humidity'],
                r['wind_speed'],
                r['source']
            )
            for r in records
        ]

        # Bulk insert with ON CONFLICT update
        query = """
            INSERT INTO climate_data (
                location_uid, date, temperature_mean, temperature_min,
                temperature_max, precipitation, humidity, wind_speed, source
            ) VALUES %s
            ON CONFLICT (location_uid, date, source)
            DO UPDATE SET
                temperature_mean = EXCLUDED.temperature_mean,
                temperature_min = EXCLUDED.temperature_min,
                temperature_max = EXCLUDED.temperature_max,
                precipitation = EXCLUDED.precipitation,
                humidity = EXCLUDED.humidity,
                wind_speed = EXCLUDED.wind_speed,
                updated_at = NOW()
        """

        execute_values(cursor, query, values)
        conn.commit()

        logger.info(f"Successfully stored {len(records)} records")

    except Exception as e:
        logger.error(f"Error storing data: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


def main():
    """Main function to download and process ERA5 data"""

    # Parse command line arguments
    if len(sys.argv) < 3:
        print("Usage: python download_era5_data.py <start_date> <end_date> [--keep-files]")
        print("Example: python download_era5_data.py 2024-01-01 2024-12-31")
        print("Options:")
        print("  --keep-files: Keep NetCDF files after processing (for reuse)")
        sys.exit(1)

    start_date = sys.argv[1]
    end_date = sys.argv[2]
    keep_files = '--keep-files' in sys.argv

    logger.info(f"Starting ERA5 data download: {start_date} to {end_date}")

    try:
        # Setup CDS API
        client = setup_cdsapi()

        # Create filename based on date range
        start_str = start_date.replace('-', '')
        end_str = end_date.replace('-', '')
        output_file = Path(__file__).parent / 'data' / f'era5_sierra_leone_{start_str}_{end_str}.nc'
        output_file.parent.mkdir(exist_ok=True)

        # Check if file already exists
        if output_file.exists():
            logger.info(f"Found existing file: {output_file}")
            logger.info("Skipping download, using cached file")
        else:
            # Download ERA5 data
            success = download_era5_data(client, start_date, end_date, str(output_file))

            if not success:
                logger.error("Failed to download ERA5 data")
                sys.exit(1)

        # Extract district data
        records = extract_district_data(str(output_file), start_date, end_date)

        if not records:
            logger.error("No records extracted from NetCDF file")
            sys.exit(1)

        # Store in database
        store_climate_data(records)

        # Clean up or keep files based on flag
        if keep_files:
            logger.info(f"Keeping data files at: {output_file}")
            logger.info(f"File size: {output_file.stat().st_size / (1024*1024):.2f} MB")
        else:
            output_file.unlink()
            logger.info("Cleaned up temporary download file")

        # Always clean up extracted directory
        extract_dir = output_file.parent / 'extracted'
        if extract_dir.exists():
            import shutil
            shutil.rmtree(extract_dir)
            logger.info("Cleaned up extracted files")

        logger.info("ERA5 data download and storage complete!")

    except Exception as e:
        logger.error(f"Error in main: {e}")
        import traceback
        logger.error(traceback.format_exc())
        sys.exit(1)


if __name__ == '__main__':
    main()
