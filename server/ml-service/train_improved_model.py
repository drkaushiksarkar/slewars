"""
Train Improved Unified Model V3.0
==================================

Train disease-category-specific models with advanced features
Target: R² > 0.90
"""

import sys
import argparse
from pathlib import Path
from datetime import datetime
import json
from loguru import logger
import pandas as pd
import numpy as np

from improved_unified_model import ImprovedUnifiedDiseaseModel
from database import get_db_connection
import config

# All 29 diseases
ALL_DISEASES = [
    'IDSR Malaria', 'IDSR Yellow Fever', 'Yellow Fever', 'IDSR Plague',
    'Diarrhoea without Severe Dehydration', 'Diarrhoea with Blood (Dysentery)',
    'Diarrhoea with Severe Dehydration', 'Typhoid Fever', 'IDSR Cholera',
    'ARI Treated with Antibiotics (Pneumonia)', 'ARI Treated without Antibiotics (Cough)',
    'IDSR Measles', 'Measles', 'Tuberculosis', 'Meningitis/Severe Bacterial Infection',
    'Worm Infestation', 'Schistosomiasis', 'Onchocerciasis', 'Yaws',
    'Tetanus (not incl. 0-28 days)', 'Neonatal Tetanus', 'Acute Flaccid Paralysis (AFP)',
    'All Other', 'Skin Infection', 'Clinical Malnutrition', 'Eye Infection', 'Otitis Media',
    'Lassa Fever'
]


def load_disease_timeseries_all_diseases(start_date: str = None, end_date: str = None) -> pd.DataFrame:
    """Load disease time series data for ALL diseases and districts"""
    logger.info("Loading disease data for all 29 diseases...")

    if end_date is None:
        end_date = datetime.now().strftime('%Y-%m-%d')

    disease_uids = {
        'IDSR Malaria': 'vq2qO3eTrNi', 'IDSR Yellow Fever': 'noIzB569hTM',
        'Yellow Fever': 'XWU1Huh0Luy', 'IDSR Plague': 'HS9zqaBdOQ4',
        'Diarrhoea without Severe Dehydration': 'U3jd8zVFKxY',
        'Diarrhoea with Blood (Dysentery)': 'nymNRxmnj4z',
        'Diarrhoea with Severe Dehydration': 'UfZcabJUVcZ',
        'Typhoid Fever': 'Cj5rTc9nEvl', 'IDSR Cholera': 'UsSUX0cpKsH',
        'ARI Treated with Antibiotics (Pneumonia)': 'iKGjnOOaPlE',
        'ARI Treated without Antibiotics (Cough)': 'Cm4XUw6VAxv',
        'IDSR Measles': 'YazgqXbizv1', 'Measles': 'GCvqIM3IzN0',
        'Tuberculosis': 'z9dYcQ2DlBG', 'Meningitis/Severe Bacterial Infection': 'JFFUt8yR2iW',
        'Worm Infestation': 'Usk9Asj5DED', 'Schistosomiasis': 'Y7Oq71I3ASg',
        'Onchocerciasis': 'DrEOxW8mbbh', 'Yaws': 'FF3Ev33BuCh',
        'Tetanus (not incl. 0-28 days)': 'Uoj2wmnr5Dw', 'Neonatal Tetanus': 'wcwbN1jR0ar',
        'Acute Flaccid Paralysis (AFP)': 'FQ2o8UBlcrS', 'All Other': 'A2VfEfPflHV',
        'Skin Infection': 'Y4cFzB4A9ZQ', 'Clinical Malnutrition': 'TBbCcJfZ91x',
        'Eye Infection': 'BQI18TPLR7W', 'Otitis Media': 'DWLCM68Q7Zl',
        'Lassa Fever': 'NCteyX2xpMf'
    }

    all_data = []

    with get_db_connection() as conn:
        cur = conn.cursor()

        for disease_name, disease_uid in disease_uids.items():
            logger.info(f"  Loading {disease_name}...")

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
                    'disease': row[0], 'location_uid': row[1],
                    'location': row[2], 'week': row[3], 'cases': float(row[4])
                })

            logger.info(f"    Loaded {len(rows)} records for {disease_name}")

        cur.close()

    df = pd.DataFrame(all_data)

    if df.empty:
        logger.warning("No disease data found!")
        return df

    df['week'] = pd.to_datetime(df['week'])

    logger.info(f"✓ Loaded {len(df)} total disease records")
    logger.info(f"  Date range: {df['week'].min()} to {df['week'].max()}")
    logger.info(f"  Diseases: {df['disease'].nunique()}")
    logger.info(f"  Locations: {df['location'].nunique()}")

    return df


def load_climate_data_all_locations(start_date: str = None, end_date: str = None) -> pd.DataFrame:
    """Load climate data for all districts"""
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

    df['week'] = pd.to_datetime(df['week'])

    for col in ['avg_temperature', 'total_precipitation', 'avg_humidity', 'avg_wind_speed']:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    df['avg_temperature'] = df['avg_temperature'].fillna(df['avg_temperature'].mean())
    df['total_precipitation'] = df['total_precipitation'].fillna(0)
    df['avg_humidity'] = df['avg_humidity'].fillna(df['avg_humidity'].mean())
    df['avg_wind_speed'] = df['avg_wind_speed'].fillna(df['avg_wind_speed'].mean())

    logger.info(f"✓ Loaded {len(df)} climate records")
    logger.info(f"  Date range: {df['week'].min()} to {df['week'].max()}")
    logger.info(f"  Locations: {df['location'].nunique()}")

    return df

def train_improved_model_pipeline(start_date: str = None, end_date: str = None, test_size: float = 0.15):
    """Train improved unified model with disease-category-specific sub-models"""

    logger.info("=" * 80)
    logger.info("IMPROVED UNIFIED MODEL TRAINING - V3.0")
    logger.info("=" * 80)
    logger.info(f"Start date: {start_date or 'All available'}")
    logger.info(f"End date: {end_date or 'All available'}")
    logger.info(f"Test size: {test_size:.0%}")
    logger.info("")

    # Load disease data for all diseases
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

    # Initialize improved model
    model = ImprovedUnifiedDiseaseModel(model_version="3.0")

    # Prepare training data with advanced features
    logger.info("Preparing training data with advanced features...")
    X, y, df = model.prepare_training_data(disease_df, climate_df)
    logger.info(f"Features created: {X.shape[1]}")
    logger.info("")

    # Train category-specific models
    logger.info("Training disease-category-specific models...")
    performance = model.train(X, y, df, test_size=test_size)

    # Save model
    logger.info("\nSaving improved model...")
    model_path = model.save()

    # Save metadata
    metadata = {
        'trained_at': datetime.now().isoformat(),
        'model_version': '3.0',
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

    metadata_path = model_path.parent / f"improved_unified_model_v3.0_metadata.json"
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

    # Check if target R² achieved
    if performance['overall']['r2'] >= 0.90:
        logger.success(f"✓ TARGET ACHIEVED! R² = {performance['overall']['r2']:.4f} >= 0.90")
    else:
        logger.warning(f"Target not met. R² = {performance['overall']['r2']:.4f} < 0.90")
        logger.info("Consider:")
        logger.info("  1. Collecting more historical data")
        logger.info("  2. Further hyperparameter tuning")
        logger.info("  3. Additional feature engineering")

    return model, performance


def main():
    parser = argparse.ArgumentParser(description='Train improved unified disease forecasting model')
    parser.add_argument('--start-date', type=str, help='Start date (YYYY-MM-DD)')
    parser.add_argument('--end-date', type=str, help='End date (YYYY-MM-DD)')
    parser.add_argument('--test-size', type=float, default=0.15, help='Test set size (default: 0.15)')

    args = parser.parse_args()

    try:
        model, performance = train_improved_model_pipeline(
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
