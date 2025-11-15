"""Script to train initial ML models for common diseases and locations"""
import sys
import requests
from loguru import logger
import time

# Configure logging
logger.remove()
logger.add(
    sys.stdout,
    level="INFO",
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>"
)

# ML Service URL
ML_SERVICE_URL = "http://localhost:8000"

# Define diseases and sample locations to train
DISEASES = ['Malaria', 'Measles', 'Typhoid']
SAMPLE_LOCATIONS = [
    'O6uvpzGd5pu',  # Bo District
    'kU8vhUkAGaT',  # Sample location 2
    'Cpd5l15XxwA',  # Sample location 3
]

def check_ml_service():
    """Check if ML service is running"""
    try:
        response = requests.get(f"{ML_SERVICE_URL}/health", timeout=5)
        if response.status_code == 200:
            logger.info("ML service is running")
            return True
        return False
    except Exception as e:
        logger.error(f"ML service not available: {e}")
        return False

def train_model(disease, location_uid):
    """Train model for a disease and location"""
    try:
        logger.info(f"Training model for {disease} in {location_uid}...")

        response = requests.post(
            f"{ML_SERVICE_URL}/train",
            json={
                "disease": disease,
                "location_uid": location_uid
            },
            timeout=300  # 5 minute timeout
        )

        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                logger.info(f"✓ Successfully trained {disease} in {location_uid}")
                logger.info(f"  MAE: {result['data']['performance']['mae']:.2f}, RMSE: {result['data']['performance']['rmse']:.2f}")
                return True
            else:
                logger.warning(f"✗ Training failed for {disease} in {location_uid}: {result.get('error')}")
                return False
        else:
            error_msg = response.json().get('detail', 'Unknown error')
            logger.warning(f"✗ Training failed for {disease} in {location_uid}: {error_msg}")
            return False

    except Exception as e:
        logger.error(f"✗ Error training {disease} in {location_uid}: {e}")
        return False

def generate_initial_forecasts(disease, location_uid):
    """Generate initial forecasts after training"""
    try:
        logger.info(f"Generating initial forecast for {disease} in {location_uid}...")

        response = requests.post(
            f"{ML_SERVICE_URL}/forecast",
            json={
                "disease": disease,
                "location_uid": location_uid,
                "horizon": 4,
                "auto_train": False,  # Model already trained
                "force_retrain": False
            },
            timeout=60
        )

        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                logger.info(f"✓ Successfully generated forecast for {disease} in {location_uid}")
                return True
            else:
                logger.warning(f"✗ Forecast generation failed: {result.get('error')}")
                return False
        else:
            logger.warning(f"✗ Forecast generation failed with status {response.status_code}")
            return False

    except Exception as e:
        logger.error(f"✗ Error generating forecast: {e}")
        return False

def main():
    """Main function to train all models"""
    logger.info("=" * 60)
    logger.info("Initial Model Training Script")
    logger.info("=" * 60)

    # Check ML service
    if not check_ml_service():
        logger.error("ML service is not running. Please start it first.")
        sys.exit(1)

    total_trained = 0
    total_forecasts = 0
    total_attempts = len(DISEASES) * len(SAMPLE_LOCATIONS)

    logger.info(f"\nStarting training for {len(DISEASES)} diseases across {len(SAMPLE_LOCATIONS)} locations")
    logger.info(f"Total models to train: {total_attempts}\n")

    start_time = time.time()

    for disease in DISEASES:
        logger.info(f"\n{'=' * 60}")
        logger.info(f"Processing {disease}")
        logger.info('=' * 60)

        for location_uid in SAMPLE_LOCATIONS:
            # Train model
            if train_model(disease, location_uid):
                total_trained += 1

                # Wait a bit between requests
                time.sleep(1)

                # Generate forecast
                if generate_initial_forecasts(disease, location_uid):
                    total_forecasts += 1

                # Wait between iterations
                time.sleep(2)

    end_time = time.time()
    duration = end_time - start_time

    logger.info("\n" + "=" * 60)
    logger.info("Training Complete!")
    logger.info("=" * 60)
    logger.info(f"Total models trained: {total_trained}/{total_attempts}")
    logger.info(f"Total forecasts generated: {total_forecasts}/{total_attempts}")
    logger.info(f"Time taken: {duration:.1f} seconds ({duration/60:.1f} minutes)")
    logger.info("=" * 60)

    if total_trained < total_attempts:
        logger.warning(f"\n⚠️  {total_attempts - total_trained} models failed to train")
        logger.warning("This is likely due to insufficient historical data for those combinations")

if __name__ == "__main__":
    main()
