"""Regenerate forecasts for all existing trained models"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from forecast_service import ForecastService
from loguru import logger
import time

logger.remove()
logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{message}</level>")

def find_all_trained_models():
    """Find all trained models on disk"""
    models_dir = Path(__file__).parent / "models"
    trained_models = []

    for disease_dir in models_dir.iterdir():
        if not disease_dir.is_dir():
            continue

        disease = disease_dir.name

        for location_dir in disease_dir.iterdir():
            if not location_dir.is_dir():
                continue

            location_uid = location_dir.name
            model_file = location_dir / "ensemble_model.pkl"

            if model_file.exists():
                trained_models.append((disease, location_uid))

    return trained_models

def main():
    logger.info("=" * 80)
    logger.info("REGENERATE FORECASTS - From Existing Trained Models")
    logger.info("=" * 80)

    # Find all trained models
    logger.info("Scanning for trained models...")
    models = find_all_trained_models()
    logger.info(f"Found {len(models)} trained models")

    # Group by disease for better logging
    by_disease = {}
    for disease, location_uid in models:
        if disease not in by_disease:
            by_disease[disease] = []
        by_disease[disease].append(location_uid)

    logger.info("\nModels found:")
    for disease, locations in sorted(by_disease.items()):
        logger.info(f"  {disease}: {len(locations)} locations")

    # Initialize service
    service = ForecastService()

    successful = 0
    failed = 0
    skipped = 0

    logger.info(f"\nGenerating forecasts for {len(models)} models...\n")
    start_time = time.time()

    for i, (disease, location_uid) in enumerate(models, 1):
        logger.info(f"[{i}/{len(models)}] {disease} - {location_uid}")

        try:
            result = service.generate_forecast(
                disease=disease,
                location_uid=location_uid,
                horizon=4,
                auto_train=False  # Don't retrain, just use existing model
            )

            if result['success']:
                logger.info(f"  ✓ Forecast generated and saved to database")
                logger.info(f"  Forecast periods: {len(result.get('forecast', []))}")
                successful += 1
            else:
                error_msg = result.get('error', 'Unknown error')
                if 'No data available' in error_msg or 'Insufficient' in error_msg:
                    logger.warning(f"  ⊘ Skipped: {error_msg}")
                    skipped += 1
                else:
                    logger.warning(f"  ✗ Failed: {error_msg}")
                    failed += 1

        except Exception as e:
            logger.error(f"  ✗ Error: {str(e)}")
            failed += 1

        time.sleep(0.2)  # Small delay to avoid overwhelming the system

    end_time = time.time()
    duration = end_time - start_time

    logger.info(f"\n{'='*80}")
    logger.info("REGENERATION COMPLETE")
    logger.info('='*80)
    logger.info(f"Total models: {len(models)}")
    logger.info(f"✓ Successful: {successful}")
    logger.info(f"⊘ Skipped: {skipped}")
    logger.info(f"✗ Failed: {failed}")
    logger.info(f"Time taken: {duration:.1f} seconds ({duration/60:.1f} minutes)")
    logger.info('='*80)

if __name__ == "__main__":
    main()
