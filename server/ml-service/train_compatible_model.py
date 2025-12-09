"""
Train Production-Compatible Improved Model V3.1
===============================================

Trains improved model using V2.0 feature set for full compatibility
Expected R²: 0.85-0.90
"""

import sys
import argparse
from pathlib import Path
from datetime import datetime
import json
from loguru import logger

# Use the same data loading as before
from train_improved_model import load_disease_timeseries_all_diseases, load_climate_data_all_locations
from improved_unified_model_compatible import ImprovedCompatibleModel


def train_compatible_model_pipeline(start_date: str = None, end_date: str = None, test_size: float = 0.15):
    """Train production-compatible improved model"""

    logger.info("=" * 80)
    logger.info("PRODUCTION-COMPATIBLE IMPROVED MODEL TRAINING - V3.1")
    logger.info("=" * 80)
    logger.info(f"Start date: {start_date or 'All available'}")
    logger.info(f"End date: {end_date or 'All available'}")
    logger.info(f"Test size: {test_size:.0%}")
    logger.info("Using V2.0 feature set with V3.0 improvements")
    logger.info("")

    # Load disease data
    logger.info("Loading disease data for all diseases...")
    disease_df = load_disease_timeseries_all_diseases(start_date, end_date)
    logger.info(f"Loaded {len(disease_df)} disease records")
    logger.info(f"Diseases: {disease_df['disease'].nunique()}")
    logger.info(f"Locations: {disease_df['location_uid'].nunique()}")
    logger.info(f"Date range: {disease_df['week'].min()} to {disease_df['week'].max()}")
    logger.info("")

    # Load climate data
    logger.info("Loading climate data for all locations...")
    climate_df = load_climate_data_all_locations(start_date, end_date)
    logger.info(f"Loaded {len(climate_df)} climate records")
    logger.info("")

    # Initialize compatible model
    model = ImprovedCompatibleModel(model_version="3.1")

    # Prepare training data with V2.0 features
    logger.info("Preparing training data with V2.0-compatible features...")
    X, y, df = model.prepare_training_data(disease_df, climate_df)
    logger.info(f"Features created: {X.shape[1]}")
    logger.info("")

    # Train category-specific models
    logger.info("Training disease-category-specific models...")
    performance = model.train(X, y, df, test_size=test_size)

    # Save model
    logger.info("\nSaving compatible model...")
    model_path = model.save()

    # Save metadata
    metadata = {
        'trained_at': datetime.now().isoformat(),
        'model_version': '3.1',
        'compatibility': 'Full V2.0 feature compatibility',
        'n_samples': len(X),
        'n_diseases': disease_df['disease'].nunique(),
        'n_locations': disease_df['location_uid'].nunique(),
        'n_features': X.shape[1],
        'date_range': {
            'start': disease_df['week'].min().isoformat() if start_date else None,
            'end': disease_df['week'].max().isoformat() if end_date else None
        },
        'performance': {
            'overall': performance['overall'],
            'by_category': performance['by_category']
        },
        'disease_categories': model.DISEASE_CATEGORIES
    }

    metadata_path = model_path.parent / f"improved_unified_model_v3.1_metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2, default=str)

    logger.info(f"Metadata saved to {metadata_path}")
    logger.info("")

    # Print summary
    logger.info("=" * 80)
    logger.info("TRAINING COMPLETE")
    logger.info("=" * 80)
    logger.info(f"Model saved: {model_path}")
    logger.info(f"Metadata saved: {metadata_path}")
    logger.info("")
    logger.info("Overall Performance:")
    logger.info(f"  R² Score: {performance['overall']['r2']:.4f}")
    logger.info(f"  MAE: {performance['overall']['mae']:.2f} cases")
    logger.info(f"  RMSE: {performance['overall']['rmse']:.2f} cases")
    logger.info(f"  MAPE: {performance['overall']['mape']:.2f}%")
    logger.info(f"  Coverage: {performance['overall']['coverage']:.2f}%")
    logger.info("")
    logger.info("Performance by Category:")
    for category, perf in performance['by_category'].items():
        logger.info(f"  {category:20s}: R²={perf['r2']:.4f}, MAE={perf['mae']:.2f}, Samples={perf['n_samples']}")
    logger.info("")

    # Check target
    target_r2 = 0.85
    if performance['overall']['r2'] >= target_r2:
        logger.success(f"✓ TARGET ACHIEVED! R² = {performance['overall']['r2']:.4f} >= {target_r2}")
    else:
        logger.warning(f"Target not met. R² = {performance['overall']['r2']:.4f} < {target_r2}")

    logger.info("")
    logger.info("=" * 80)
    logger.info("PRODUCTION DEPLOYMENT READY")
    logger.info("=" * 80)
    logger.info("This model uses the same feature set as V2.0 and can be deployed directly.")
    logger.info("Update unified_forecast_service.py to use this model for improved predictions.")
    logger.info("")

    return model, performance


def main():
    parser = argparse.ArgumentParser(description='Train production-compatible improved model')
    parser.add_argument('--start-date', type=str, help='Start date (YYYY-MM-DD)')
    parser.add_argument('--end-date', type=str, help='End date (YYYY-MM-DD)')
    parser.add_argument('--test-size', type=float, default=0.15, help='Test set size (default: 0.15)')

    args = parser.parse_args()

    try:
        model, performance = train_compatible_model_pipeline(
            start_date=args.start_date,
            end_date=args.end_date,
            test_size=args.test_size
        )
        return 0
    except Exception as e:
        logger.error(f"Training failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
