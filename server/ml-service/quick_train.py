"""Quick training script - trains Malaria models for all districts"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from forecast_service import ForecastService
from loguru import logger
import time

logger.remove()
logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{message}</level>")

def get_all_districts():
    """Get all district locations from database"""
    import psycopg2
    try:
        conn = psycopg2.connect(database='dhis2SierraLeoneDemo')
        cursor = conn.cursor()
        cursor.execute("SELECT uid, name FROM organisationunit WHERE hierarchylevel = 2 ORDER BY name")
        districts = cursor.fetchall()
        cursor.close()
        conn.close()
        return [(name, uid) for uid, name in districts]
    except Exception as e:
        logger.error(f"Error fetching districts: {e}")
        return []

def main():
    logger.info("=" * 80)
    logger.info("COMPLETE TRAINING - All Diseases & All Districts")
    logger.info("=" * 80)

    # Initialize service
    service = ForecastService()

    # Get all districts
    logger.info("Fetching all districts...")
    locations = get_all_districts()
    logger.info(f"Found {len(locations)} districts")

    # All diseases
    diseases = ['Malaria', 'Measles', 'Yellow Fever']

    successful = 0
    failed = 0
    total = len(locations) * len(diseases)

    logger.info(f"\nStarting training for {len(diseases)} diseases across {len(locations)} districts")
    logger.info(f"Total combinations to train: {total}\n")

    start_time = time.time()

    for disease in diseases:
        logger.info(f"\n{'='*80}")
        logger.info(f"DISEASE: {disease}")
        logger.info('='*80)

        for location_name, location_uid in locations:
            logger.info(f"\n[{successful + failed + 1}/{total}] {disease} in {location_name}")
            logger.info('-'*80)

            try:
                # Train
                logger.info("Training model...")
                result = service.train_model(disease, location_uid)

                if result['success']:
                    logger.info(f"✓ Training successful!")
                    logger.info(f"  Training: {result['training_samples']} samples")
                    logger.info(f"  Testing: {result['test_samples']} samples")
                    logger.info(f"  MAE: {result['performance']['mae']:.2f}")
                    logger.info(f"  RMSE: {result['performance']['rmse']:.2f}")
                    logger.info(f"  R²: {result['performance']['r_squared']:.3f}")

                    # Generate forecast
                    logger.info("Generating initial forecast...")
                    forecast_result = service.generate_forecast(
                        disease=disease,
                        location_uid=location_uid,
                        horizon=4,
                        auto_train=False
                    )

                    if forecast_result['success']:
                        logger.info("✓ Forecast generated!")
                        successful += 1
                    else:
                        logger.warning(f"✗ Forecast failed: {forecast_result.get('error')}")
                        # Still count training as successful
                        successful += 1
                else:
                    logger.warning(f"✗ Training failed: {result.get('error')}")
                    failed += 1

            except Exception as e:
                logger.error(f"✗ Error: {str(e)}")
                failed += 1

            time.sleep(0.5)

    end_time = time.time()
    duration = end_time - start_time

    logger.info(f"\n{'='*80}")
    logger.info("TRAINING COMPLETE")
    logger.info('='*80)
    logger.info(f"Total combinations: {total}")
    logger.info(f"✓ Successful: {successful}")
    logger.info(f"✗ Failed: {failed}")
    logger.info(f"Time taken: {duration:.1f} seconds ({duration/60:.1f} minutes)")
    logger.info('='*80)

if __name__ == "__main__":
    main()
