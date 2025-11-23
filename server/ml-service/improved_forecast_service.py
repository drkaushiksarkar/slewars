"""
Improved Forecast Service using V3.0 Disease-Category-Specific Models
======================================================================

Uses the improved unified model with R² > 0.94
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
from loguru import logger
from typing import Dict, List

from improved_unified_model import ImprovedUnifiedDiseaseModel
from database import get_db_connection


class ImprovedForecastService:
    """Forecast service using improved V3.0 models"""

    def __init__(self, model_path: Path = None):
        """Initialize service with improved model"""
        if model_path is None:
            model_path = Path("models/improved_unified_model_v3.0.pkl")

        if not model_path.exists():
            raise FileNotFoundError(f"Model not found: {model_path}")

        logger.info(f"Loading improved model from {model_path}...")
        self.model = ImprovedUnifiedDiseaseModel.load(model_path)
        logger.info("✓ Improved model loaded successfully")

    def load_historical_data(
        self,
        disease: str,
        location_uid: str,
        lookback_weeks: int = 26
    ) -> pd.DataFrame:
        """Load historical disease and climate data"""

        end_date = datetime.now()
        start_date = end_date - timedelta(weeks=lookback_weeks)

        with get_db_connection() as conn:
            # Load disease data
            disease_query = """
                SELECT
                    %s as disease,
                    %s as location_uid,
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
                WHERE de.uid = (
                    SELECT uid FROM dataelement WHERE name = %s LIMIT 1
                )
                AND district.uid = %s
                AND p.startdate >= %s::date
                AND p.startdate <= %s::date
                GROUP BY p.startdate
                ORDER BY p.startdate
            """

            disease_df = pd.read_sql(
                disease_query,
                conn,
                params=[disease, location_uid, disease, location_uid,
                        start_date.strftime('%Y-%m-%d'),
                        end_date.strftime('%Y-%m-%d')]
            )

            # Load climate data
            climate_query = """
                SELECT
                    DATE_TRUNC('week', cd.date)::date as week,
                    AVG(cd.temperature_mean) as avg_temperature,
                    SUM(cd.precipitation) as total_precipitation,
                    AVG(cd.humidity) as avg_humidity,
                    AVG(cd.wind_speed) as avg_wind_speed
                FROM climate_data cd
                WHERE cd.location_uid = %s
                AND cd.source = 'ERA5'
                AND cd.date >= %s::date
                AND cd.date <= %s::date
                GROUP BY DATE_TRUNC('week', cd.date)
                ORDER BY week
            """

            climate_df = pd.read_sql(
                climate_query,
                conn,
                params=[location_uid,
                        start_date.strftime('%Y-%m-%d'),
                        end_date.strftime('%Y-%m-%d')]
            )

        if disease_df.empty:
            logger.warning(f"No historical data found for {disease} in {location_uid}")
            return pd.DataFrame()

        # Merge disease and climate data
        df = disease_df.merge(climate_df, on='week', how='left')
        df['week'] = pd.to_datetime(df['week'])
        df = df.sort_values('week')

        return df

    def generate_forecast(
        self,
        disease: str,
        location_uid: str,
        horizon: int = 4,
        store_in_db: bool = True
    ) -> Dict:
        """
        Generate forecast for a disease and location

        Args:
            disease: Disease name (e.g., "IDSR Malaria")
            location_uid: Location UID
            horizon: Number of weeks to forecast
            store_in_db: Whether to store forecast in database

        Returns:
            Dictionary with forecast results
        """

        logger.info(f"Generating improved forecast: {disease} in {location_uid} for {horizon} weeks")

        try:
            # Load historical data
            hist_df = self.load_historical_data(disease, location_uid, lookback_weeks=26)

            if hist_df.empty or len(hist_df) < 10:
                raise ValueError(f"Insufficient historical data for {disease} in {location_uid}")

            # Prepare forecast base
            last_week = hist_df['week'].max()
            forecast_weeks = [last_week + timedelta(weeks=i+1) for i in range(horizon)]

            # Create forecast dataframe
            forecast_df = pd.DataFrame({
                'disease': [disease] * horizon,
                'location_uid': [location_uid] * horizon,
                'week': forecast_weeks,
                'cases': [hist_df['cases'].iloc[-1]] * horizon  # Initial guess
            })

            # Add historical context for feature engineering
            context_df = pd.concat([hist_df, forecast_df], ignore_index=True)

            # Get climate forecast (assume recent averages)
            recent_climate = hist_df[['avg_temperature', 'total_precipitation',
                                     'avg_humidity', 'avg_wind_speed']].tail(4).mean()

            for col in recent_climate.index:
                context_df[col] = context_df[col].fillna(recent_climate[col])

            # Prepare features
            X, y, full_df = self.model.prepare_training_data(context_df, None)

            # Get predictions for forecast period
            forecast_indices = full_df[full_df['week'].isin(forecast_weeks)].index
            X_forecast = X.loc[forecast_indices]

            # Generate predictions
            predictions = self.model.predict(X_forecast, disease, return_quantiles=True)

            # Calculate risk levels
            recent_avg = hist_df['cases'].tail(12).mean()

            results = []
            for i, week in enumerate(forecast_weeks):
                predicted = predictions['median'][i]
                lower = predictions['lower'][i]
                upper = predictions['upper'][i]

                # Risk assessment
                risk_score = predicted / (recent_avg + 1)
                if risk_score < 0.8:
                    risk_level = "LOW"
                elif risk_score < 1.5:
                    risk_level = "MEDIUM"
                else:
                    risk_level = "HIGH"

                results.append({
                    'date': week,
                    'week': week.strftime('%Y-W%U'),
                    'predicted_cases': int(round(predicted)),
                    'lower_bound': int(round(lower)),
                    'upper_bound': int(round(upper)),
                    'confidence': 0.8,
                    'risk_level': risk_level,
                    'risk_score': round(risk_score, 4)
                })

            forecast_result = {
                'success': True,
                'disease': disease,
                'location_uid': location_uid,
                'forecast_date': datetime.now().isoformat(),
                'model_version': '3.0',
                'predictions': results
            }

            # Store in database if requested
            if store_in_db:
                self.store_forecast(forecast_result)

            logger.info(f"✓ Forecast generated successfully: {len(results)} weeks")
            return forecast_result

        except Exception as e:
            logger.error(f"Forecast generation failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': f'Forecast generation failed for {disease} in {location_uid}'
            }

    def store_forecast(self, forecast: Dict):
        """Store forecast in database"""

        with get_db_connection() as conn:
            cur = conn.cursor()

            for pred in forecast['predictions']:
                query = """
                    INSERT INTO forecasts (
                        disease, location_uid, forecast_date, target_date,
                        predicted_cases, lower_bound, upper_bound, confidence,
                        risk_level, risk_score, model_version, created_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (disease, location_uid, forecast_date, target_date)
                    DO UPDATE SET
                        predicted_cases = EXCLUDED.predicted_cases,
                        lower_bound = EXCLUDED.lower_bound,
                        upper_bound = EXCLUDED.upper_bound,
                        confidence = EXCLUDED.confidence,
                        risk_level = EXCLUDED.risk_level,
                        risk_score = EXCLUDED.risk_score,
                        model_version = EXCLUDED.model_version,
                        created_at = NOW()
                """

                cur.execute(query, (
                    forecast['disease'],
                    forecast['location_uid'],
                    forecast['forecast_date'],
                    pred['date'].isoformat(),
                    pred['predicted_cases'],
                    pred['lower_bound'],
                    pred['upper_bound'],
                    pred['confidence'],
                    pred['risk_level'],
                    pred['risk_score'],
                    forecast['model_version']
                ))

            conn.commit()
            cur.close()

        logger.info(f"✓ Forecast stored in database: {len(forecast['predictions'])} records")


# Global instance
improved_forecast_service = ImprovedForecastService()
