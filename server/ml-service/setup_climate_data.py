"""
Climate Data Setup Script
Automatically sets up climate data for new users
Checks for existing data and downloads if needed
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
import logging
from datetime import datetime

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


def check_database_data():
    """
    Check if climate data exists in the database

    Returns:
        dict with data status information
    """
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # Check total records
        cursor.execute("SELECT COUNT(*) FROM climate_data WHERE source = 'ERA5'")
        total_records = cursor.fetchone()[0]

        # Check date range
        cursor.execute("""
            SELECT MIN(date)::text, MAX(date)::text
            FROM climate_data
            WHERE source = 'ERA5'
        """)
        result = cursor.fetchone()

        # Check number of districts covered
        cursor.execute("""
            SELECT COUNT(DISTINCT location_uid)
            FROM climate_data
            WHERE source = 'ERA5'
        """)
        num_districts = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        return {
            'has_data': total_records > 0,
            'total_records': total_records,
            'start_date': result[0] if result[0] else None,
            'end_date': result[1] if result[1] else None,
            'num_districts': num_districts,
            'expected_districts': 13
        }

    except Exception as e:
        logger.error(f"Error checking database: {e}")
        return {
            'has_data': False,
            'total_records': 0,
            'error': str(e)
        }


def check_cached_files():
    """
    Check for cached NetCDF files

    Returns:
        list of cached file information
    """
    data_dir = Path(__file__).parent / 'data'

    if not data_dir.exists():
        return []

    nc_files = list(data_dir.glob('era5_*.nc'))

    files_info = []
    for nc_file in nc_files:
        size_mb = nc_file.stat().st_size / (1024 * 1024)
        files_info.append({
            'file': nc_file.name,
            'path': str(nc_file),
            'size_mb': round(size_mb, 2)
        })

    return files_info


def run_download(start_date, end_date, keep_files=True):
    """
    Run the download script

    Args:
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        keep_files: Whether to keep NetCDF files after processing
    """
    import subprocess

    script_path = Path(__file__).parent / 'download_era5_data.py'
    python_path = Path(__file__).parent / 'venv' / 'bin' / 'python'

    cmd = [str(python_path), str(script_path), start_date, end_date]
    if keep_files:
        cmd.append('--keep-files')

    logger.info(f"Running: {' '.join(cmd)}")

    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        logger.info("Download completed successfully")
        logger.info(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Download failed: {e}")
        logger.error(e.stdout)
        logger.error(e.stderr)
        return False


def setup_climate_data(force_download=False):
    """
    Main setup function

    Args:
        force_download: Force re-download even if data exists
    """
    logger.info("=" * 60)
    logger.info("Climate Data Setup for ML Modeling")
    logger.info("=" * 60)

    # Check CDS API key
    cds_api_key = os.getenv('CDS_API_KEY')
    if not cds_api_key:
        logger.error("CDS_API_KEY not found in environment variables!")
        logger.error("Please add your CDS API key to the .env file")
        return False

    logger.info(f"✓ CDS API key configured: {cds_api_key[:8]}...")

    # Check database data
    logger.info("\nChecking database for existing climate data...")
    db_status = check_database_data()

    if db_status.get('error'):
        logger.error(f"✗ Database error: {db_status['error']}")
        return False

    if db_status['has_data']:
        logger.info(f"✓ Found {db_status['total_records']} ERA5 records in database")
        logger.info(f"  Date range: {db_status['start_date']} to {db_status['end_date']}")
        logger.info(f"  Districts: {db_status['num_districts']}/{db_status['expected_districts']}")

        if not force_download:
            logger.info("\n✓ Climate data already available!")
            logger.info("  Use --force to re-download")

            # Check cached files
            cached_files = check_cached_files()
            if cached_files:
                logger.info(f"\n✓ Found {len(cached_files)} cached NetCDF file(s):")
                for file_info in cached_files:
                    logger.info(f"  - {file_info['file']} ({file_info['size_mb']} MB)")
            else:
                logger.info("\n⚠ No cached NetCDF files found")
                logger.info("  Files will be downloaded if needed")

            return True
    else:
        logger.info("✗ No climate data found in database")

    # Download data
    logger.info("\nDownloading climate data...")
    logger.info("This may take several minutes depending on the date range")

    # Download data for 2023 and 2024 (2 years for ML modeling)
    years_to_download = [
        ('2023-01-01', '2023-12-31'),
        ('2024-01-01', '2024-12-31'),
    ]

    for start_date, end_date in years_to_download:
        logger.info(f"\nDownloading {start_date} to {end_date}...")
        success = run_download(start_date, end_date, keep_files=True)

        if not success:
            logger.error(f"✗ Failed to download data for {start_date} to {end_date}")
            logger.info("  You can try manually:")
            logger.info(f"  python download_era5_data.py {start_date} {end_date} --keep-files")
            return False

    # Verify data was loaded
    logger.info("\nVerifying data was loaded...")
    db_status = check_database_data()

    if db_status['has_data']:
        logger.info(f"✓ Successfully loaded {db_status['total_records']} records")
        logger.info(f"  Date range: {db_status['start_date']} to {db_status['end_date']}")
        logger.info(f"  Districts: {db_status['num_districts']}/{db_status['expected_districts']}")

        # Check cached files
        cached_files = check_cached_files()
        logger.info(f"\n✓ Cached {len(cached_files)} NetCDF file(s) for future use")
        total_size = sum(f['size_mb'] for f in cached_files)
        logger.info(f"  Total size: {total_size:.2f} MB")

        logger.info("\n" + "=" * 60)
        logger.info("✓ Climate data setup complete!")
        logger.info("=" * 60)
        return True
    else:
        logger.error("✗ Data download completed but no data found in database")
        return False


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(
        description='Setup climate data for ML modeling'
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='Force re-download even if data exists'
    )
    parser.add_argument(
        '--check-only',
        action='store_true',
        help='Only check status, do not download'
    )

    args = parser.parse_args()

    if args.check_only:
        logger.info("Checking climate data status...")
        db_status = check_database_data()
        cached_files = check_cached_files()

        print("\n" + "=" * 60)
        print("Climate Data Status")
        print("=" * 60)

        if db_status['has_data']:
            print(f"Database Records: {db_status['total_records']}")
            print(f"Date Range: {db_status['start_date']} to {db_status['end_date']}")
            print(f"Districts: {db_status['num_districts']}/{db_status['expected_districts']}")
        else:
            print("Database: No data found")

        if cached_files:
            print(f"\nCached Files: {len(cached_files)}")
            for file_info in cached_files:
                print(f"  - {file_info['file']} ({file_info['size_mb']} MB)")
        else:
            print("\nCached Files: None")

        print("=" * 60)
    else:
        success = setup_climate_data(force_download=args.force)
        sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
