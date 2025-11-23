"""
Generate Forecasts for All Diseases and Districts
==================================================

This script generates forecasts for all 29 diseases across all 13 districts
and stores them in the database for quick retrieval.

Run this after model training to populate the forecasts table.
"""

import sys
import requests
import time
from datetime import datetime
from loguru import logger

# ML Service URL
ML_SERVICE_URL = "http://localhost:8000"

# All 29 diseases supported by unified model
ALL_DISEASES = [
    'IDSR Malaria',
    'IDSR Yellow Fever',
    'IDSR Plague',
    'IDSR Cholera',
    'IDSR Measles',
    'Measles',
    'Yellow Fever',
    'Typhoid Fever',
    'Lassa Fever',
    'Diarrhoea without Severe Dehydration',
    'Diarrhoea with Blood (Dysentery)',
    'Diarrhoea with Severe Dehydration',
    'ARI Treated with Antibiotics (Pneumonia)',
    'ARI Treated without Antibiotics (Cough)',
    'Tuberculosis',
    'Meningitis/Severe Bacterial Infection',
    'Worm Infestation',
    'Schistosomiasis',
    'Onchocerciasis',
    'Yaws',
    'Tetanus (not incl. 0-28 days)',
    'Neonatal Tetanus',
    'Acute Flaccid Paralysis (AFP)',
    'All Other',
    'Skin Infection',
    'Clinical Malnutrition',
    'Eye Infection',
    'Otitis Media'
]

# All 13 districts in Sierra Leone
ALL_DISTRICTS = [
    {'uid': 'O6uvpzGd5pu', 'name': 'Bo'},
    {'uid': 'lc3eMKXaEfw', 'name': 'Bonthe'},
    {'uid': 'jmIPBj66vD6', 'name': 'Western Area'},
    {'uid': 'fdc6uOvgoji', 'name': 'Bombali'},
    {'uid': 'at6UHUQatSo', 'name': 'Kailahun'},
    {'uid': 'bL4ooGhyHRQ', 'name': 'Kono'},
    {'uid': 'kJq2mPyFEHo', 'name': 'Kenema'},
    {'uid': 'qhqAxPSTUXp', 'name': 'Koinadugu'},
    {'uid': 'Vth0fbpFcsO', 'name': 'Moyamba'},
    {'uid': 'PMa2VCrupOd', 'name': 'Port Loko'},
    {'uid': 'TEQlaapDQoK', 'name': 'Pujehun'},
    {'uid': 'jUb8gELQApl', 'name': 'Tonkolili'},
    {'uid': 'eIQbndfxQMb', 'name': 'Kambia'}
]


def check_ml_service():
    """Check if ML service is running"""
    try:
        response = requests.get(f"{ML_SERVICE_URL}/health", timeout=5)
        if response.status_code == 200:
            logger.info("✓ ML service is healthy")
            return True
        else:
            logger.error("ML service is not healthy")
            return False
    except Exception as e:
        logger.error(f"Cannot connect to ML service: {e}")
        return False


def generate_forecast(disease: str, location_uid: str, location_name: str):
    """Generate forecast for a disease and location"""
    try:
        logger.info(f"Generating forecast: {disease} in {location_name}")

        response = requests.get(
            f"{ML_SERVICE_URL}/forecast/{requests.utils.quote(disease)}/{location_uid}",
            params={'horizon': 4},
            timeout=60
        )

        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                logger.info(f"  ✓ Success - {len(data['data'].get('predictions', []))} weeks forecasted")
                return True
            else:
                logger.warning(f"  ✗ Failed: {data.get('error', 'Unknown error')}")
                return False
        else:
            logger.warning(f"  ✗ HTTP {response.status_code}: {response.text[:100]}")
            return False

    except Exception as e:
        logger.error(f"  ✗ Error: {e}")
        return False


def main():
    """Main function to generate all forecasts"""
    logger.info("=" * 80)
    logger.info("GENERATING FORECASTS FOR ALL DISEASES AND DISTRICTS")
    logger.info("=" * 80)
    logger.info(f"Diseases: {len(ALL_DISEASES)}")
    logger.info(f"Districts: {len(ALL_DISTRICTS)}")
    logger.info(f"Total forecasts to generate: {len(ALL_DISEASES) * len(ALL_DISTRICTS)}")
    logger.info("")

    # Check ML service
    if not check_ml_service():
        logger.error("ML service is not available. Please start it first.")
        sys.exit(1)

    logger.info("")
    logger.info("Starting forecast generation...")
    logger.info("")

    start_time = time.time()
    successful = 0
    failed = 0

    for i, disease in enumerate(ALL_DISEASES, 1):
        logger.info(f"[{i}/{len(ALL_DISEASES)}] Processing disease: {disease}")

        for j, district in enumerate(ALL_DISTRICTS, 1):
            success = generate_forecast(disease, district['uid'], district['name'])

            if success:
                successful += 1
            else:
                failed += 1

            # Small delay to avoid overwhelming the service
            time.sleep(0.5)

        logger.info("")

    elapsed_time = time.time() - start_time

    logger.info("=" * 80)
    logger.info("FORECAST GENERATION COMPLETE")
    logger.info("=" * 80)
    logger.info(f"Total forecasts attempted: {successful + failed}")
    logger.info(f"Successful: {successful}")
    logger.info(f"Failed: {failed}")
    logger.info(f"Success rate: {(successful / (successful + failed) * 100):.1f}%")
    logger.info(f"Time elapsed: {elapsed_time:.1f} seconds")
    logger.info("")

    if failed > 0:
        logger.warning(f"⚠ {failed} forecasts failed - check logs above for details")
    else:
        logger.info("✓ All forecasts generated successfully!")

    logger.info("")
    logger.info("Forecasts are now available in the database.")
    logger.info("The frontend should now show predictions for all diseases.")


if __name__ == "__main__":
    main()
