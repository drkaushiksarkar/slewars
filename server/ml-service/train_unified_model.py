"""
Training Pipeline for Unified Disease Forecasting Model
========================================================

This script trains the unified model on all available historical data (2015-2025)
for all 29 diseases and all districts, incorporating climate data from ERA5.

The training process:
1. Load disease case data for all diseases from DHIS2 database
2. Load and process climate data from ERA5 (GRIB files + database)
3. Merge and prepare comprehensive training dataset
4. Train unified model with quantile regression
5. Evaluate performance and save model

Expected output:
- Unified model file (unified_model_v2.0.pkl)
- Training metrics and performance report
- Feature importance analysis
"""

import sys
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
from loguru import logger
import psycopg2
from typing import List, Dict

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent))

from unified_model import UnifiedDiseaseModel
from database import get_db_connection
import config


# All 29 diseases from our catalog
ALL_DISEASES = [
    # Vector-Borne
    'IDSR Malaria',
    'IDSR Yellow Fever',
    'Yellow Fever',
    'IDSR Plague',

    # Water-Borne
    'Diarrhoea without Severe Dehydration',
    'Diarrhoea with Blood (Dysentery)',
    'Diarrhoea with Severe Dehydration',
    'Typhoid Fever',
    'IDSR Cholera',

    # Air-Borne
    'ARI Treated with Antibiotics (Pneumonia)',
    'ARI Treated without Antibiotics (Cough)',
    'IDSR Measles',
    'Measles',
    'Tuberculosis',
    'Meningitis/Severe Bacterial Infection',

    # NTDs
    'Worm Infestation',
    'Schistosomiasis',
    'Onchocerciasis',
    'Yaws',

    # Vaccine-Preventable
    'Tetanus (not incl. 0-28 days)',
    'Neonatal Tetanus',
    'Acute Flaccid Paralysis (AFP)',

    # Other
    'All Other',
    'Skin Infection',
    'Clinical Malnutrition',
    'Eye Infection',
    'Otitis Media',

    # Viral Hemorrhagic
    'Lassa Fever'
]


def load_disease_timeseries_all_diseases(
    start_date: str = None,
    end_date: str = None
) -> pd.DataFrame:
    """
    Load disease time series data for ALL diseases and districts

    Args:
        start_date: Start date (YYYY-MM-DD) or None for all available data
        end_date: End date (YYYY-MM-DD) or None for today

    Returns:
        DataFrame with columns: disease, location, location_uid, week, cases
    """
    logger.info("Loading disease data for all 29 diseases...")

    if end_date is None:
        end_date = datetime.now().strftime('%Y-%m-%d')

    # Disease name to UID mapping (from diseaseService.ts)
    disease_uids = {
        'IDSR Malaria': 'vq2qO3eTrNi',
        'IDSR Yellow Fever': 'noIzB569hTM',
        'Yellow Fever': 'XWU1Huh0Luy',
        'IDSR Plague': 'HS9zqaBdOQ4',
        'Diarrhoea without Severe Dehydration': 'U3jd8zVFKxY',
        'Diarrhoea with Blood (Dysentery)': 'nymNRxmnj4z',
        'Diarrhoea with Severe Dehydration': 'UfZcabJUVcZ',
        'Typhoid Fever': 'Cj5rTc9nEvl',
        'IDSR Cholera': 'UsSUX0cpKsH',
        'ARI Treated with Antibiotics (Pneumonia)': 'iKGjnOOaPlE',
        'ARI Treated without Antibiotics (Cough)': 'Cm4XUw6VAxv',
        'IDSR Measles': 'YazgqXbizv1',
        'Measles': 'GCvqIM3IzN0',
        'Tuberculosis': 'z9dYcQ2DlBG',
        'Meningitis/Severe Bacterial Infection': 'JFFUt8yR2iW',
        'Worm Infestation': 'Usk9Asj5DED',
        'Schistosomiasis': 'Y7Oq71I3ASg',
        'Onchocerciasis': 'DrEOxW8mbbh',
        'Yaws': 'FF3Ev33BuCh',
        'Tetanus (not incl. 0-28 days)': 'Uoj2wmnr5Dw',
        'Neonatal Tetanus': 'wcwbN1jR0ar',
        'Acute Flaccid Paralysis (AFP)': 'FQ2o8UBlcrS',
        'All Other': 'A2VfEfPflHV',
        'Skin Infection': 'Y4cFzB4A9ZQ',
        'Clinical Malnutrition': 'TBbCcJfZ91x',
        'Eye Infection': 'BQI18TPLR7W',
        'Otitis Media': 'DWLCM68Q7Zl',
        'Lassa Fever': 'NCteyX2xpMf'
    }

    all_data = []

    with get_db_connection() as conn:
        cur = conn.cursor()

        for disease_name, disease_uid in disease_uids.items():
            logger.info(f"  Loading {disease_name}...")

            # Query to get weekly aggregated data at district level (hierarchylevel=2)
            query = r"""
                SELECT
                    %s as disease,
                    district.uid as location_uid,
                    district.name as location,
                    p.startdate::date as week,
                    SUM(COALESCE(CAST(dv.value AS NUMERIC), 0)) as cases
                FROM datavalue dv
                JOIN dataelement de ON dv.dataelementid = de.dataelementid
                JOIN organisationunit facility ON dv.sourceid = facility.organisationunitid
                JOIN period p ON dv.periodid = p.periodid
                JOIN organisationunit district ON (
                    district.hierarchylevel = 2 AND
                    facility.path LIKE '%%' || district.uid || '%%'
                )
                WHERE de.uid = %s
                AND de.valuetype IN ('NUMBER', 'INTEGER', 'INTEGER_ZERO_OR_POSITIVE', 'INTEGER_POSITIVE')
                AND dv.deleted = false
                AND dv.value ~ '^[0-9]+(\.[0-9]+)?$'
                AND p.startdate <= %s::date
            """

            params = [disease_name, disease_uid, end_date]

            if start_date:
                query += " AND p.startdate >= %s::date"
                params.append(start_date)

            query += """
                GROUP BY disease, district.uid, district.name, p.startdate
                HAVING SUM(COALESCE(CAST(dv.value AS NUMERIC), 0)) > 0
                ORDER BY p.startdate, district.name
            """

            cur.execute(query, params)
            rows = cur.fetchall()

            for row in rows:
                all_data.append({
                    'disease': row[0],
                    'location_uid': row[1],
                    'location': row[2],
                    'week': row[3],
                    'cases': float(row[4])
                })

            logger.info(f"    Loaded {len(rows)} records for {disease_name}")

        cur.close()

    df = pd.DataFrame(all_data)

    if df.empty:
        logger.warning("No disease data found!")
        return df

    # Convert week to datetime
    df['week'] = pd.to_datetime(df['week'])

    logger.info(f"✓ Loaded {len(df)} total disease records")
    logger.info(f"  Date range: {df['week'].min()} to {df['week'].max()}")
    logger.info(f"  Diseases: {df['disease'].nunique()}")
    logger.info(f"  Locations: {df['location'].nunique()}")

    return df


def load_climate_data_all_locations(
    start_date: str = None,
    end_date: str = None
) -> pd.DataFrame:
    """
    Load climate data for all districts

    Args:
        start_date: Start date (YYYY-MM-DD) or None for all
        end_date: End date (YYYY-MM-DD) or None for all

    Returns:
        DataFrame with columns: location, location_uid, week, avg_temperature,
                                total_precipitation, avg_humidity, avg_wind_speed
    """
    logger.info("Loading climate data for all districts...")

    with get_db_connection() as conn:
        query = """
            SELECT
                cd.location_uid,
                ou.name as location,
                DATE_TRUNC('week', cd.date)::date as week,
                AVG(cd.temperature_mean) as avg_temperature,
                SUM(cd.precipitation) as total_precipitation,
                AVG(cd.humidity) as avg_humidity,
                AVG(cd.wind_speed) as avg_wind_speed
            FROM climate_data cd
            JOIN organisationunit ou ON cd.location_uid = ou.uid
            WHERE cd.source = 'ERA5'
        """

        params = []

        if start_date:
            query += " AND cd.date >= %s::date"
            params.append(start_date)

        if end_date:
            query += " AND cd.date <= %s::date"
            params.append(end_date)

        query += """
            GROUP BY cd.location_uid, ou.name, DATE_TRUNC('week', cd.date)
            ORDER BY week, location
        """

        df = pd.read_sql(query, conn, params=params if params else None)

    if df.empty:
        logger.warning("No climate data found!")
        return df

    # Convert week to datetime
    df['week'] = pd.to_datetime(df['week'])

    # Convert numeric columns
    for col in ['avg_temperature', 'total_precipitation', 'avg_humidity', 'avg_wind_speed']:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    # Fill NaN values with reasonable defaults
    df['avg_temperature'] = df['avg_temperature'].fillna(df['avg_temperature'].mean())
    df['total_precipitation'] = df['total_precipitation'].fillna(0)
    df['avg_humidity'] = df['avg_humidity'].fillna(df['avg_humidity'].mean())
    df['avg_wind_speed'] = df['avg_wind_speed'].fillna(df['avg_wind_speed'].mean())

    logger.info(f"✓ Loaded {len(df)} climate records")
    logger.info(f"  Date range: {df['week'].min()} to {df['week'].max()}")
    logger.info(f"  Locations: {df['location'].nunique()}")

    return df


def train_unified_model_pipeline(
    start_date: str = None,
    end_date: str = None,
    test_size: float = 0.2,
    save_model: bool = True
):
    """
    Complete training pipeline for unified disease forecasting model

    Args:
        start_date: Training data start date (None = all available data)
        end_date: Training data end date (None = today)
        test_size: Proportion of data for testing
        save_model: Whether to save the trained model

    Returns:
        Trained UnifiedDiseaseModel instance
    """
    logger.info("=" * 80)
    logger.info("UNIFIED DISEASE FORECASTING MODEL - TRAINING PIPELINE")
    logger.info("=" * 80)
    logger.info(f"Start Date: {start_date or 'All available data'}")
    logger.info(f"End Date: {end_date or 'Today'}")
    logger.info(f"Test Size: {test_size * 100}%")
    logger.info("")

    # Step 1: Load disease data
    logger.info("STEP 1: Loading disease case data...")
    disease_df = load_disease_timeseries_all_diseases(start_date, end_date)

    if disease_df.empty:
        raise ValueError("No disease data available for training!")

    # Step 2: Load climate data
    logger.info("\nSTEP 2: Loading climate data...")
    climate_df = load_climate_data_all_locations(start_date, end_date)

    if climate_df.empty:
        logger.warning("No climate data available! Training without climate features...")
        # Create dummy climate data with zeros
        unique_locations = disease_df[['location', 'location_uid']].drop_duplicates()
        unique_weeks = disease_df['week'].unique()

        climate_data = []
        for _, loc in unique_locations.iterrows():
            for week in unique_weeks:
                climate_data.append({
                    'location': loc['location'],
                    'location_uid': loc['location_uid'],
                    'week': week,
                    'avg_temperature': 25.0,  # Default tropical temperature
                    'total_precipitation': 0.0,
                    'avg_humidity': 70.0,  # Default humidity
                    'avg_wind_speed': 2.0  # Default wind speed
                })
        climate_df = pd.DataFrame(climate_data)

    # Step 3: Initialize and train model
    logger.info("\nSTEP 3: Initializing unified model...")
    model = UnifiedDiseaseModel(model_version="2.0")

    logger.info("\nSTEP 4: Preparing training data with feature engineering...")
    X, y = model.prepare_training_data(disease_df, climate_df)

    logger.info(f"\n✓ Training dataset prepared:")
    logger.info(f"  Total samples: {len(X):,}")
    logger.info(f"  Features: {len(X.columns)}")
    logger.info(f"  Diseases: {disease_df['disease'].nunique()}")
    logger.info(f"  Locations: {disease_df['location'].nunique()}")
    logger.info(f"  Date range: {disease_df['week'].min().date()} to {disease_df['week'].max().date()}")

    # Step 4: Train model
    logger.info("\nSTEP 5: Training unified model with quantile regression...")
    logger.info("This may take several minutes...")
    logger.info("")

    performance = model.train(X, y, test_size=test_size, verbose=True)

    # Step 5: Analyze feature importance
    logger.info("\nSTEP 6: Analyzing feature importance...")
    feature_importance = model.get_feature_importance(top_n=15)

    logger.info("\nTop 15 Most Important Features:")
    logger.info("-" * 60)
    for i, (feature, importance) in enumerate(feature_importance.items(), 1):
        logger.info(f"  {i:2d}. {feature:40s} {importance:10.2f}")

    # Step 6: Print performance summary
    logger.info("\n" + "=" * 80)
    logger.info("TRAINING COMPLETE - PERFORMANCE SUMMARY")
    logger.info("=" * 80)
    logger.info(f"R² Score:                {performance['r2']:.4f}")
    logger.info(f"Mean Absolute Error:     {performance['mae']:.2f} cases")
    logger.info(f"Root Mean Squared Error: {performance['rmse']:.2f} cases")
    logger.info(f"Mean Absolute % Error:   {performance['mape']:.2f}%")
    logger.info(f"Prediction Coverage:     {performance['coverage']:.1f}%")
    logger.info(f"Mean Interval Width:     {performance['mean_interval_width']:.2f} cases")
    logger.info("")

    # Interpret R² score
    if performance['r2'] >= 0.7:
        logger.info("✓ EXCELLENT model performance (R² ≥ 0.7)")
    elif performance['r2'] >= 0.5:
        logger.info("✓ GOOD model performance (R² ≥ 0.5)")
    elif performance['r2'] >= 0.3:
        logger.info("⚠ MODERATE model performance (R² ≥ 0.3)")
    else:
        logger.info("⚠ LOW model performance (R² < 0.3) - consider more data or feature engineering")

    logger.info("")

    # Step 7: Save model
    if save_model:
        logger.info("\nSTEP 7: Saving unified model...")
        model.save()
        logger.info("✓ Model saved successfully!")

    logger.info("\n" + "=" * 80)
    logger.info("Training pipeline completed successfully!")
    logger.info("=" * 80)

    return model


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Train Unified Disease Forecasting Model')
    parser.add_argument('--start-date', type=str, default=None,
                       help='Training start date (YYYY-MM-DD). Default: all available data')
    parser.add_argument('--end-date', type=str, default=None,
                       help='Training end date (YYYY-MM-DD). Default: today')
    parser.add_argument('--test-size', type=float, default=0.2,
                       help='Test set size (0-1). Default: 0.2')
    parser.add_argument('--no-save', action='store_true',
                       help='Do not save the trained model')

    args = parser.parse_args()

    try:
        # Train the model
        model = train_unified_model_pipeline(
            start_date=args.start_date,
            end_date=args.end_date,
            test_size=args.test_size,
            save_model=not args.no_save
        )

        logger.info("\n✓ All done! The unified model is ready for use.")
        logger.info("\nNext steps:")
        logger.info("  1. Test the model with: python test_unified_model.py")
        logger.info("  2. Integrate with API by updating forecast_service.py")
        logger.info("  3. Start making predictions for all diseases!")

    except Exception as e:
        logger.error(f"\n✗ Training failed: {e}", exc_info=True)
        sys.exit(1)
