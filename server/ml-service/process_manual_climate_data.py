"""
Process Manually Downloaded Climate Data (GRIB format)
Loads climate data from GRIB files in data/ folder into PostgreSQL database
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
import xarray as xr
import numpy as np
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

# Load environment variables
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


def extract_zip_file(zip_path):
    """
    Extract GRIB file from ZIP archive

    Args:
        zip_path: Path to ZIP file

    Returns:
        Path to extracted GRIB file
    """
    logger.info(f"Extracting {zip_path.name}...")

    extract_dir = zip_path.parent / 'extracted'
    extract_dir.mkdir(exist_ok=True)

    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_dir)

    # Find GRIB file
    grib_files = list(extract_dir.glob('*.grib'))

    if not grib_files:
        raise FileNotFoundError(f"No GRIB file found in {zip_path}")

    return grib_files[0]


def process_grib_file(grib_file, year):
    """
    Process GRIB file and extract climate data for all districts

    Args:
        grib_file: Path to GRIB file
        year: Year being processed

    Returns:
        List of climate data records
    """
    logger.info(f"Processing GRIB file for year {year}...")

    records = []

    try:
        # Open datasets - GRIB files may have multiple parameter groups
        # First group: instant variables (t2m, d2m, u10, v10)
        ds_instant = xr.open_dataset(grib_file, engine='cfgrib')
        logger.info(f"Instant variables: {list(ds_instant.data_vars)}")

        # Try to open precipitation separately
        ds_precip = None
        try:
            ds_precip = xr.open_dataset(
                grib_file,
                engine='cfgrib',
                backend_kwargs={'filter_by_keys': {'shortName': 'tp'}}
            )
            logger.info(f"Precipitation variables: {list(ds_precip.data_vars)}")
        except Exception as e:
            logger.warning(f"Could not load precipitation data: {e}")

        # Process each district
        for district in DISTRICTS:
            logger.info(f"Processing {district['name']} ({district['uid']})")

            try:
                # Select nearest grid point to district coordinates
                district_instant = ds_instant.sel(
                    latitude=district['lat'],
                    longitude=district['lon'],
                    method='nearest'
                )

                # Group by day (resample to daily)
                # Use valid_time if available, otherwise use time
                time_coord = 'valid_time' if 'valid_time' in district_instant.coords else 'time'
                daily_instant = district_instant.resample({time_coord: '1D'})

                # Calculate daily statistics
                daily_mean = daily_instant.mean()
                daily_min = daily_instant.min()
                daily_max = daily_instant.max()

                # Extract variables
                dates = daily_mean[time_coord].values

                # Temperature: Kelvin to Celsius
                temp_mean = daily_mean['t2m'].values - 273.15
                temp_min = daily_min['t2m'].values - 273.15
                temp_max = daily_max['t2m'].values - 273.15

                # Calculate humidity from dewpoint
                humidity = calculate_humidity_from_dewpoint(
                    daily_mean['t2m'].values,
                    daily_mean['d2m'].values
                )

                # Wind speed: calculate from u and v components
                u_wind = daily_mean['u10'].values
                v_wind = daily_mean['v10'].values
                wind_speed = np.sqrt(u_wind**2 + v_wind**2)

                # Precipitation
                precip = np.zeros(len(dates))
                if ds_precip is not None:
                    try:
                        district_precip = ds_precip.sel(
                            latitude=district['lat'],
                            longitude=district['lon'],
                            method='nearest'
                        )
                        precip_time_coord = 'valid_time' if 'valid_time' in district_precip.coords else 'time'
                        daily_precip = district_precip.resample({precip_time_coord: '1D'}).sum()
                        # Convert from meters to millimeters
                        precip = daily_precip['tp'].values * 1000
                    except Exception as e:
                        logger.warning(f"Error processing precipitation for {district['name']}: {e}")

                # Create records for each day
                for i, date_val in enumerate(dates):
                    # Convert numpy datetime64 to string
                    date_str = str(np.datetime64(date_val, 'D'))

                    record = {
                        'location_uid': district['uid'],
                        'date': date_str,
                        'temperature_mean': round(float(temp_mean[i]), 2),
                        'temperature_min': round(float(temp_min[i]), 2),
                        'temperature_max': round(float(temp_max[i]), 2),
                        'precipitation': round(float(precip[i]), 2),
                        'humidity': round(float(humidity[i]), 2),
                        'wind_speed': round(float(wind_speed[i]), 2),
                        'source': 'ERA5'
                    }

                    records.append(record)

            except Exception as e:
                logger.error(f"Error processing district {district['name']}: {e}")
                import traceback
                logger.error(traceback.format_exc())
                continue

        ds_instant.close()
        if ds_precip:
            ds_precip.close()

    except Exception as e:
        logger.error(f"Error opening GRIB file: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise

    logger.info(f"Extracted {len(records)} records for year {year}")
    return records


def clear_existing_data():
    """
    Clear existing ERA5 data from the climate_data table
    """
    logger.info("Clearing existing ERA5 data from database...")

    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    try:
        cursor.execute("DELETE FROM climate_data WHERE source = 'ERA5'")
        deleted_count = cursor.rowcount
        conn.commit()
        logger.info(f"Deleted {deleted_count} existing records")
    except Exception as e:
        logger.error(f"Error clearing data: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


def store_climate_data(records):
    """
    Store climate data records in PostgreSQL database

    Args:
        records: List of climate data dictionaries
    """
    logger.info(f"Storing {len(records)} records in database...")

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


def cleanup_extracted_files():
    """Clean up extracted GRIB files"""
    data_dir = Path(__file__).parent / 'data'
    extract_dir = data_dir / 'extracted'

    if extract_dir.exists():
        import shutil
        shutil.rmtree(extract_dir)
        logger.info("Cleaned up extracted files")


def main():
    """Main function to process all GRIB files"""
    logger.info("=" * 60)
    logger.info("Processing Manual Climate Data (GRIB format)")
    logger.info("=" * 60)

    # Find all ZIP files in data directory
    data_dir = Path(__file__).parent / 'data'
    zip_files = sorted(data_dir.glob('*.zip'))

    if not zip_files:
        logger.error("No ZIP files found in data/ directory")
        sys.exit(1)

    logger.info(f"Found {len(zip_files)} ZIP files to process:")
    for zf in zip_files:
        logger.info(f"  - {zf.name}")

    # Ask for confirmation to overwrite existing data
    response = input("\nThis will OVERWRITE all existing ERA5 data in the database. Continue? (yes/no): ")
    if response.lower() not in ['yes', 'y']:
        logger.info("Operation cancelled")
        sys.exit(0)

    # Clear existing data
    clear_existing_data()

    # Process each year
    all_records = []

    for zip_file in zip_files:
        try:
            # Extract year from filename (e.g., 2022.zip -> 2022)
            year = zip_file.stem

            # Extract GRIB file
            grib_file = extract_zip_file(zip_file)

            # Process GRIB file
            records = process_grib_file(grib_file, year)
            all_records.extend(records)

        except Exception as e:
            logger.error(f"Error processing {zip_file.name}: {e}")
            import traceback
            logger.error(traceback.format_exc())
            continue

    # Store all records
    if all_records:
        logger.info(f"\nTotal records to store: {len(all_records)}")
        store_climate_data(all_records)
    else:
        logger.error("No records to store!")
        sys.exit(1)

    # Cleanup
    cleanup_extracted_files()

    # Verify data
    logger.info("\nVerifying data in database...")
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            COUNT(*) as total_records,
            MIN(date)::text as start_date,
            MAX(date)::text as end_date,
            COUNT(DISTINCT location_uid) as num_districts
        FROM climate_data
        WHERE source = 'ERA5'
    """)

    result = cursor.fetchone()
    cursor.close()
    conn.close()

    logger.info("\n" + "=" * 60)
    logger.info("Data Loading Complete!")
    logger.info("=" * 60)
    logger.info(f"Total records: {result[0]}")
    logger.info(f"Date range: {result[1]} to {result[2]}")
    logger.info(f"Districts: {result[3]}/13")
    logger.info("=" * 60)


if __name__ == '__main__':
    main()
