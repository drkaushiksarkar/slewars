"""Forecasting service for disease prediction"""
from datetime import datetime, timedelta
from loguru import logger
import pandas as pd
import numpy as np

from feature_engineering import FeatureEngineer
from models_simple import EnsembleForecaster
from database import (
    fetch_disease_timeseries,
    fetch_climate_data,
    save_forecast,
    save_model_performance
)
import config

class ForecastService:
    """Service for disease forecasting"""

    def __init__(self):
        self.feature_engineer = FeatureEngineer()
        self.models = {}  # Cache of trained models

    def train_model(self, disease: str, location_uid: str, start_date: str = None, end_date: str = None):
        """
        Train forecasting model for a disease and location

        Args:
            disease: Disease name
            location_uid: DHIS2 organization unit UID
            start_date: Start date for training data (optional)
            end_date: End date for training data (optional)

        Returns:
            dict with training results
        """
        try:
            logger.info(f"Training model for {disease} in {location_uid}")

            # Set default date range if not provided
            if not end_date:
                end_date = datetime.now().strftime('%Y-%m-%d')

            if not start_date:
                # Use 2 years of data
                start_date = (datetime.now() - timedelta(days=730)).strftime('%Y-%m-%d')

            # Fetch disease time series
            disease_data = fetch_disease_timeseries(disease, location_uid, start_date, end_date)

            MIN_POINTS = 12  # Minimum 3 months of weekly data
            if not disease_data or len(disease_data) < MIN_POINTS:
                logger.warning(f"Insufficient data for {disease} in {location_uid}: {len(disease_data)} points")
                return {
                    'success': False,
                    'error': f'Insufficient training data. Found {len(disease_data)} data points, need at least {MIN_POINTS}'
                }

            # Fetch climate data
            climate_data = fetch_climate_data(location_uid, start_date, end_date)

            logger.info(f"Fetched {len(disease_data)} disease records and {len(climate_data)} climate records")

            # Prepare training data with features
            training_df = self.feature_engineer.prepare_training_data(disease_data, climate_data)

            if training_df is None or len(training_df) == 0:
                return {
                    'success': False,
                    'error': 'Failed to prepare training data'
                }

            # Split into train/test (80/20)
            train_size = int(len(training_df) * 0.8)
            train_df = training_df.iloc[:train_size]
            test_df = training_df.iloc[train_size:]

            logger.info(f"Training set: {len(train_df)} samples, Test set: {len(test_df)} samples")

            # Train ensemble model
            ensemble = EnsembleForecaster(
                sarima_weight=config.ENSEMBLE_SARIMA_WEIGHT,
                xgboost_weight=config.ENSEMBLE_XGBOOST_WEIGHT
            )

            ensemble.train(train_df, target_col='cases')

            # Evaluate on test set
            X_test = test_df.drop('cases', axis=1)

            # Drop any datetime columns that were dropped during training
            for col in ['startdate', 'enddate']:
                if col in X_test.columns:
                    X_test = X_test.drop(col, axis=1)

            y_test = test_df['cases']

            performance = ensemble.evaluate(X_test, y_test)

            # Save model
            ensemble.save(disease, location_uid)

            # Cache model
            model_key = f"{disease}_{location_uid}"
            self.models[model_key] = ensemble

            # Save performance metrics to database
            save_model_performance({
                'disease': disease,
                'location_uid': location_uid,
                'model_type': 'ensemble',
                'model_version': '1.0',
                'evaluation_date': datetime.now().date(),
                'mae': performance['mae'],
                'rmse': performance['rmse'],
                'mape': performance['mape'],
                'r_squared': performance['r_squared'],
                'training_data_size': len(train_df),
                'test_data_size': len(test_df),
                'metrics': performance
            })

            logger.info(f"Model trained successfully. MAE: {performance['mae']:.2f}, RMSE: {performance['rmse']:.2f}")

            return {
                'success': True,
                'disease': disease,
                'location_uid': location_uid,
                'training_samples': len(train_df),
                'test_samples': len(test_df),
                'performance': performance,
                'date_range': {
                    'start': start_date,
                    'end': end_date
                }
            }

        except Exception as e:
            logger.error(f"Error training model: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }

    def generate_forecast(
        self,
        disease: str,
        location_uid: str,
        horizon: int = 4,
        auto_train: bool = True,
        force_retrain: bool = False
    ):
        """
        Generate forecast for a disease and location

        Args:
            disease: Disease name
            location_uid: DHIS2 organization unit UID
            horizon: Number of weeks to forecast (default: 4)
            auto_train: Automatically train if model doesn't exist
            force_retrain: Force retraining even if model exists

        Returns:
            dict with forecast results
        """
        try:
            logger.info(f"Generating forecast for {disease} in {location_uid}, horizon={horizon}, force_retrain={force_retrain}")

            model_key = f"{disease}_{location_uid}"

            # If force_retrain, retrain the model
            if force_retrain:
                logger.info("Force retraining model...")
                train_result = self.train_model(disease, location_uid)
                if not train_result['success']:
                    return train_result
                # Model is now cached in self.models
            # Otherwise, try to load existing model
            elif model_key not in self.models:
                try:
                    logger.info(f"Loading saved model for {disease} in {location_uid}...")
                    ensemble = EnsembleForecaster.load(disease, location_uid)
                    self.models[model_key] = ensemble
                    logger.info("Saved model loaded successfully")
                except Exception as e:
                    logger.warning(f"Could not load existing model: {e}")
                    if auto_train:
                        logger.info("Auto-training model (first time)...")
                        train_result = self.train_model(disease, location_uid)
                        if not train_result['success']:
                            return train_result
                    else:
                        return {
                            'success': False,
                            'error': 'Model not found and auto_train is disabled. Please train the model first.'
                        }

            ensemble = self.models[model_key]

            # Fetch recent historical data for forecasting
            end_date = datetime.now().strftime('%Y-%m-%d')
            start_date = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')

            disease_data = fetch_disease_timeseries(disease, location_uid, start_date, end_date)
            climate_data = fetch_climate_data(location_uid, start_date, end_date)

            # Prepare historical features
            historical_df = self.feature_engineer.prepare_training_data(disease_data, climate_data)

            if historical_df is None or len(historical_df) == 0:
                return {
                    'success': False,
                    'error': 'Failed to prepare historical data for forecasting'
                }

            # Check minimum data requirements for forecasting
            min_required_points = 10
            if len(historical_df) < min_required_points:
                return {
                    'success': False,
                    'error': f'Insufficient historical data for forecasting. Found {len(historical_df)} points, need at least {min_required_points}'
                }

            # Prepare forecast features
            forecast_df = self.feature_engineer.prepare_forecast_features(historical_df, horizon)

            # Generate forecast
            forecast_result = ensemble.forecast(forecast_df, steps=horizon)

            # Get feature importance from XGBoost
            feature_importance = ensemble.xgboost_model.get_feature_importance()

            # Determine contributing factors (top 3)
            contributing_factors = []
            if feature_importance:
                top_features = list(feature_importance.items())[:3]
                for feature, importance in top_features:
                    contributing_factors.append({
                        'factor': feature.replace('_', ' ').title(),
                        'impact': float(importance)
                    })

            # Prepare forecast dates
            last_date = historical_df.index[-1]
            forecast_dates = [
                (last_date + timedelta(weeks=i)).strftime('%Y-%m-%d')
                for i in range(1, horizon + 1)
            ]

            forecast_date = datetime.now().date()

            # Save forecasts to database
            for i, target_date in enumerate(forecast_dates):
                save_forecast({
                    'disease': disease,
                    'location_uid': location_uid,
                    'forecast_date': forecast_date,
                    'target_date': target_date,
                    'predicted_cases': int(round(forecast_result['predictions'][i])),
                    'lower_bound': int(round(forecast_result['lower_bound'][i])),
                    'upper_bound': int(round(forecast_result['upper_bound'][i])),
                    'confidence': 0.95,
                    'risk_level': forecast_result['risk_levels'][i],
                    'risk_score': forecast_result['risk_scores'][i],
                    'model_version': '1.0',
                    'contributing_factors': contributing_factors if i == 0 else None
                })

            # Get data availability info
            data_start_date = historical_df.index[0].strftime('%Y-%m-%d') if len(historical_df) > 0 else None
            data_end_date = historical_df.index[-1].strftime('%Y-%m-%d') if len(historical_df) > 0 else None

            result = {
                'success': True,
                'disease': disease,
                'location_uid': location_uid,
                'forecast_date': forecast_date.isoformat(),
                'horizon': horizon,
                'data_availability': {
                    'start_date': data_start_date,
                    'end_date': data_end_date,
                    'total_points': len(historical_df),
                    'has_climate_data': len(climate_data) > 0
                },
                'predictions': [
                    {
                        'date': forecast_dates[i],
                        'week': f"{datetime.strptime(forecast_dates[i], '%Y-%m-%d').isocalendar()[0]}-W{datetime.strptime(forecast_dates[i], '%Y-%m-%d').isocalendar()[1]:02d}",
                        'predicted_cases': int(round(forecast_result['predictions'][i])),
                        'lower_bound': int(round(forecast_result['lower_bound'][i])),
                        'upper_bound': int(round(forecast_result['upper_bound'][i])),
                        'confidence': 0.95,
                        'risk_level': forecast_result['risk_levels'][i],
                        'risk_score': float(forecast_result['risk_scores'][i]),
                        'contributing_factors': contributing_factors if i == 0 else []
                    }
                    for i in range(horizon)
                ],
                'model_info': {
                    'sarima_weight': config.ENSEMBLE_SARIMA_WEIGHT,
                    'xgboost_weight': config.ENSEMBLE_XGBOOST_WEIGHT,
                    'version': '1.0'
                }
            }

            logger.info(f"Forecast generated successfully for {horizon} weeks")

            return result

        except Exception as e:
            logger.error(f"Error generating forecast: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }

    def get_model_performance(self, disease: str, location_uid: str):
        """Get model performance metrics"""
        try:
            from database import get_db_connection

            with get_db_connection() as conn:
                cursor = conn.cursor()

                query = """
                    SELECT *
                    FROM model_performance
                    WHERE disease = %s
                      AND location_uid = %s
                    ORDER BY evaluation_date DESC
                    LIMIT 1
                """

                cursor.execute(query, (disease, location_uid))
                result = cursor.fetchone()
                cursor.close()

                if not result:
                    return {
                        'success': False,
                        'error': 'No performance metrics found'
                    }

                columns = [desc[0] for desc in cursor.description]
                performance_data = dict(zip(columns, result))

                return {
                    'success': True,
                    'data': performance_data
                }

        except Exception as e:
            logger.error(f"Error getting model performance: {e}")
            return {
                'success': False,
                'error': str(e)
            }
