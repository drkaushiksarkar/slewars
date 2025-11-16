"""
One-time setup script to train initial ML models for disease forecasting
Run this script once to generate initial forecasts for all disease/location combinations
"""
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

import psycopg2
from psycopg2.extras import RealDictCursor
from loguru import logger
from datetime import datetime, timedelta
import time

# Configure logging
logger.remove()
logger.add(
    sys.stdout,
    level="INFO",
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>"
)

# Import services
from forecast_service import ForecastService
import config

def get_db_connection():
    """Get database connection"""
    try:
        if config.POSTGRES_USER:
            conn = psycopg2.connect(
                host=config.POSTGRES_HOST,
                port=config.POSTGRES_PORT,
                database=config.POSTGRES_DB,
                user=config.POSTGRES_USER,
                password=config.POSTGRES_PASSWORD
            )
        else:
            # Use peer authentication
            conn = psycopg2.connect(
                host=config.POSTGRES_HOST,
                port=config.POSTGRES_PORT,
                database=config.POSTGRES_DB
            )
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        return None

def check_database_connection():
    """Check if database is accessible"""
    logger.info("Checking database connection...")
    conn = get_db_connection()
    if not conn:
        return False

    try:
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        logger.info(f"✓ Database connected: PostgreSQL")
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"✗ Database connection failed: {e}")
        if conn:
            conn.close()
        return False

def get_available_locations():
    """Get all available district locations"""
    conn = get_db_connection()
    if not conn:
        return []

    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        query = """
            SELECT uid, name
            FROM organisationunit
            WHERE hierarchylevel = 2
            ORDER BY name
            LIMIT 5
        """
        cursor.execute(query)
        locations = cursor.fetchall()
        cursor.close()
        conn.close()
        return locations
    except Exception as e:
        logger.error(f"Error fetching locations: {e}")
        if conn:
            conn.close()
        return []

def check_disease_data(disease, disease_uid, location_uid):
    """Check if there's data available for a disease in a location"""
    conn = get_db_connection()
    if not conn:
        return 0

    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Check all available historical data (no date limits)
        query = """
            SELECT COUNT(*) as count
            FROM datavalue dv
            JOIN dataelement de ON dv.dataelementid = de.dataelementid
            JOIN period p ON dv.periodid = p.periodid
            JOIN organisationunit ou ON dv.sourceid = ou.organisationunitid
            WHERE dv.deleted = false
                AND de.uid = %s
                AND dv.value ~ '^[0-9]+$'
                AND EXISTS (
                    SELECT 1 FROM organisationunit parent
                    WHERE parent.uid = %s
                    AND ou.path LIKE parent.path || '%'
                )
        """

        cursor.execute(query, (disease_uid, location_uid))
        result = cursor.fetchone()
        count = result['count'] if result else 0

        cursor.close()
        conn.close()
        return count
    except Exception as e:
        logger.error(f"Error checking data for {disease}: {e}")
        if conn:
            conn.close()
        return 0

def train_and_forecast(service, disease, location_uid, location_name):
    """Train model and generate forecast for a disease/location"""
    try:
        logger.info(f"Training model for {disease} in {location_name}...")

        # Train the model
        train_result = service.train_model(disease, location_uid)

        if not train_result['success']:
            logger.warning(f"✗ Training failed: {train_result.get('error', 'Unknown error')}")
            return False

        logger.info(f"✓ Model trained successfully!")
        logger.info(f"  Training samples: {train_result['training_samples']}, Test samples: {train_result['test_samples']}")
        logger.info(f"  MAE: {train_result['performance']['mae']:.2f}, RMSE: {train_result['performance']['rmse']:.2f}, R²: {train_result['performance']['r_squared']:.3f}")

        # Generate initial forecast
        logger.info(f"Generating forecast for {disease} in {location_name}...")
        forecast_result = service.generate_forecast(
            disease=disease,
            location_uid=location_uid,
            horizon=4,
            auto_train=False,
            force_retrain=True
        )

        if not forecast_result['success']:
            logger.warning(f"✗ Forecast generation failed: {forecast_result.get('error', 'Unknown error')}")
            return False

        logger.info(f"✓ Forecast generated successfully!")
        logger.info(f"  Predictions saved for 4 weeks ahead")

        return True

    except Exception as e:
        logger.error(f"✗ Error: {str(e)}")
        return False

def main():
    """Main training function"""
    logger.info("=" * 80)
    logger.info("ML FORECASTING - INITIAL TRAINING SETUP")
    logger.info("=" * 80)
    logger.info("")

    # Check database connection
    if not check_database_connection():
        logger.error("Cannot proceed without database connection. Please check:")
        logger.error("  1. PostgreSQL is running")
        logger.error("  2. Database credentials in .env file")
        logger.error("  3. Database name is correct")
        sys.exit(1)

    logger.info("")

    # Get available locations
    logger.info("Fetching available locations...")
    locations = get_available_locations()

    if not locations:
        logger.error("No locations found in database")
        sys.exit(1)

    logger.info(f"✓ Found {len(locations)} locations")
    for loc in locations:
        logger.info(f"  - {loc['name']} ({loc['uid']})")

    logger.info("")

    # Define diseases to train
    diseases_to_train = [
        ('Malaria', 'wZwzzRnr9N4'),
        ('Measles', 'YtbsuPPo010'),
        ('Yellow Fever', 'l6byfWFUGaP')
    ]

    logger.info("Checking data availability for each disease/location combination...")
    logger.info("")

    # Check data availability
    training_queue = []
    for disease_name, disease_uid in diseases_to_train:
        logger.info(f"Checking {disease_name}...")
        for location in locations:
            count = check_disease_data(disease_name, disease_uid, location['uid'])
            if count > 0:
                logger.info(f"  ✓ {location['name']}: {count} data points")
                training_queue.append((disease_name, location['uid'], location['name']))
            else:
                logger.info(f"  ✗ {location['name']}: No data")

    logger.info("")

    if not training_queue:
        logger.error("No data available for any disease/location combination")
        logger.error("Please ensure your database has disease surveillance data")
        sys.exit(1)

    logger.info(f"Found {len(training_queue)} disease/location combinations with data")
    logger.info("")
    logger.info("=" * 80)
    logger.info("STARTING TRAINING")
    logger.info("=" * 80)
    logger.info("")

    # Initialize forecast service
    service = ForecastService()

    # Train each combination
    total = len(training_queue)
    successful = 0
    failed = 0

    start_time = time.time()

    for idx, (disease, location_uid, location_name) in enumerate(training_queue, 1):
        logger.info(f"[{idx}/{total}] Processing {disease} in {location_name}")
        logger.info("-" * 80)

        if train_and_forecast(service, disease, location_uid, location_name):
            successful += 1
        else:
            failed += 1

        logger.info("")

        # Small delay between trainings
        if idx < total:
            time.sleep(1)

    end_time = time.time()
    duration = end_time - start_time

    # Summary
    logger.info("=" * 80)
    logger.info("TRAINING COMPLETE")
    logger.info("=" * 80)
    logger.info(f"Total combinations processed: {total}")
    logger.info(f"✓ Successful: {successful}")
    logger.info(f"✗ Failed: {failed}")
    logger.info(f"Time taken: {duration:.1f} seconds ({duration/60:.1f} minutes)")
    logger.info("")

    if successful > 0:
        logger.info("✓ You can now use the ML Forecasting dashboard!")
        logger.info("  Forecasts have been generated and saved to the database.")
    else:
        logger.warning("⚠️  No models were successfully trained.")
        logger.warning("  Please check the logs above for errors.")

    logger.info("=" * 80)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.warning("\n\nTraining interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"\n\nUnexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
