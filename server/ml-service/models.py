"""Machine learning models for disease forecasting"""
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from statsmodels.tsa.statespace.sarimax import SARIMAX
import xgboost as xgb
from loguru import logger
import pickle
from pathlib import Path
import config

class ForecastModel:
    """Base class for forecast models"""

    def __init__(self, model_type):
        self.model_type = model_type
        self.model = None
        self.is_trained = False
        self.version = "1.0"

    def train(self, X_train, y_train):
        """Train the model"""
        raise NotImplementedError

    def predict(self, X_test):
        """Make predictions"""
        raise NotImplementedError

    def evaluate(self, X_test, y_test):
        """Evaluate model performance"""
        predictions = self.predict(X_test)

        mae = mean_absolute_error(y_test, predictions)
        rmse = np.sqrt(mean_squared_error(y_test, predictions))

        # MAPE (Mean Absolute Percentage Error)
        # Avoid division by zero
        mask = y_test > 0
        if mask.sum() > 0:
            mape = np.mean(np.abs((y_test[mask] - predictions[mask]) / y_test[mask])) * 100
        else:
            mape = None

        # R-squared
        r2 = r2_score(y_test, predictions)

        return {
            'mae': float(mae),
            'rmse': float(rmse),
            'mape': float(mape) if mape is not None else None,
            'r_squared': float(r2)
        }

    def save(self, filepath):
        """Save model to disk"""
        try:
            with open(filepath, 'wb') as f:
                pickle.dump(self, f)
            logger.info(f"Model saved to {filepath}")
        except Exception as e:
            logger.error(f"Error saving model: {e}")
            raise

    @staticmethod
    def load(filepath):
        """Load model from disk"""
        try:
            with open(filepath, 'rb') as f:
                model = pickle.load(f)
            logger.info(f"Model loaded from {filepath}")
            return model
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise


class SARIMAModel(ForecastModel):
    """SARIMA model for time series forecasting"""

    def __init__(self, order=(1, 1, 1), seasonal_order=(1, 1, 1, 52)):
        super().__init__("SARIMA")
        self.order = order
        self.seasonal_order = seasonal_order

    def train(self, timeseries_data, exog=None):
        """
        Train SARIMA model

        Args:
            timeseries_data: pandas Series with DatetimeIndex
            exog: Optional exogenous variables (climate data)
        """
        try:
            logger.info(f"Training SARIMA model with order={self.order}, seasonal_order={self.seasonal_order}")

            # Fit SARIMA model
            self.model = SARIMAX(
                timeseries_data,
                order=self.order,
                seasonal_order=self.seasonal_order,
                exog=exog,
                enforce_stationarity=False,
                enforce_invertibility=False
            )

            self.fitted_model = self.model.fit(disp=False, maxiter=100)
            self.is_trained = True

            logger.info("SARIMA model trained successfully")
            return self.fitted_model.summary()

        except Exception as e:
            logger.error(f"Error training SARIMA model: {e}")
            raise

    def predict(self, steps=4, exog=None):
        """
        Make forecast predictions

        Args:
            steps: Number of steps to forecast
            exog: Optional exogenous variables for forecast period

        Returns:
            numpy array of predictions
        """
        try:
            if not self.is_trained:
                raise ValueError("Model is not trained yet")

            forecast = self.fitted_model.forecast(steps=steps, exog=exog)

            # Ensure non-negative predictions
            forecast = np.maximum(forecast, 0)

            return forecast

        except Exception as e:
            logger.error(f"Error making SARIMA predictions: {e}")
            raise

    def get_prediction_intervals(self, steps=4, alpha=0.05):
        """Get prediction intervals"""
        try:
            forecast_result = self.fitted_model.get_forecast(steps=steps)
            forecast_df = forecast_result.summary_frame(alpha=alpha)

            return {
                'mean': forecast_df['mean'].values,
                'lower': np.maximum(forecast_df['mean_ci_lower'].values, 0),
                'upper': forecast_df['mean_ci_upper'].values
            }
        except Exception as e:
            logger.error(f"Error getting prediction intervals: {e}")
            raise


class XGBoostModel(ForecastModel):
    """XGBoost model for forecasting with exogenous variables"""

    def __init__(self, n_estimators=100, learning_rate=0.05, max_depth=5):
        super().__init__("XGBoost")
        self.n_estimators = n_estimators
        self.learning_rate = learning_rate
        self.max_depth = max_depth
        self.feature_names = None

    def train(self, X_train, y_train):
        """
        Train XGBoost model

        Args:
            X_train: Feature matrix (pandas DataFrame)
            y_train: Target variable (pandas Series)
        """
        try:
            logger.info(f"Training XGBoost model with {len(X_train)} samples")

            self.feature_names = X_train.columns.tolist()

            self.model = xgb.XGBRegressor(
                n_estimators=self.n_estimators,
                learning_rate=self.learning_rate,
                max_depth=self.max_depth,
                objective='reg:squarederror',
                random_state=42
            )

            self.model.fit(X_train, y_train)
            self.is_trained = True

            logger.info("XGBoost model trained successfully")

        except Exception as e:
            logger.error(f"Error training XGBoost model: {e}")
            raise

    def predict(self, X_test):
        """Make predictions"""
        try:
            if not self.is_trained:
                raise ValueError("Model is not trained yet")

            # Ensure features match
            if self.feature_names:
                X_test = X_test[self.feature_names]

            predictions = self.model.predict(X_test)

            # Ensure non-negative predictions
            predictions = np.maximum(predictions, 0)

            return predictions

        except Exception as e:
            logger.error(f"Error making XGBoost predictions: {e}")
            raise

    def get_feature_importance(self):
        """Get feature importance"""
        try:
            if not self.is_trained:
                return None

            importance = self.model.feature_importances_

            feature_importance = dict(zip(self.feature_names, importance))

            # Sort by importance
            sorted_importance = dict(
                sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
            )

            return sorted_importance

        except Exception as e:
            logger.error(f"Error getting feature importance: {e}")
            return None


class EnsembleForecaster:
    """Ensemble of SARIMA and XGBoost models"""

    def __init__(self, sarima_weight=0.6, xgboost_weight=0.4):
        self.sarima_model = SARIMAModel()
        self.xgboost_model = XGBoostModel()
        self.sarima_weight = sarima_weight
        self.xgboost_weight = xgboost_weight
        self.is_trained = False

    def train(self, df, target_col='cases'):
        """
        Train both models

        Args:
            df: pandas DataFrame with features and target
            target_col: Name of target column (default: 'cases')
        """
        try:
            logger.info("Training ensemble models")

            # Prepare data for SARIMA (time series only)
            y = df[target_col]

            # Prepare exogenous variables for SARIMA (climate features)
            exog_cols = [col for col in df.columns if col.startswith(('avg_', 'total_', 'temp_', 'min_', 'max_'))]
            exog = df[exog_cols] if exog_cols else None

            # Train SARIMA
            self.sarima_model.train(y, exog=exog)

            # Prepare data for XGBoost (all features)
            feature_cols = [col for col in df.columns if col != target_col]
            X = df[feature_cols]

            # Train XGBoost
            self.xgboost_model.train(X, y)

            self.is_trained = True
            logger.info("Ensemble models trained successfully")

        except Exception as e:
            logger.error(f"Error training ensemble: {e}")
            raise

    def forecast(self, forecast_df, steps=4):
        """
        Make ensemble forecast

        Args:
            forecast_df: DataFrame with features for forecasting
            steps: Number of steps to forecast

        Returns:
            dict with predictions and metadata
        """
        try:
            if not self.is_trained:
                raise ValueError("Ensemble is not trained yet")

            # SARIMA forecast
            sarima_pred = self.sarima_model.predict(steps=steps)

            # XGBoost forecast
            xgboost_pred = self.xgboost_model.predict(forecast_df)

            # Ensemble prediction (weighted average)
            ensemble_pred = (
                self.sarima_weight * sarima_pred +
                self.xgboost_weight * xgboost_pred
            )

            # Get prediction intervals from SARIMA
            intervals = self.sarima_model.get_prediction_intervals(steps=steps)

            # Calculate risk scores based on predicted values
            mean_pred = np.mean(ensemble_pred)
            risk_scores = ensemble_pred / (mean_pred + 1)  # Normalize

            risk_levels = []
            for score in risk_scores:
                if score > 1.5:
                    risk_levels.append('HIGH')
                elif score > 1.0:
                    risk_levels.append('MEDIUM')
                else:
                    risk_levels.append('LOW')

            return {
                'predictions': ensemble_pred.tolist(),
                'lower_bound': intervals['lower'].tolist(),
                'upper_bound': intervals['upper'].tolist(),
                'sarima_predictions': sarima_pred.tolist(),
                'xgboost_predictions': xgboost_pred.tolist(),
                'risk_scores': risk_scores.tolist(),
                'risk_levels': risk_levels
            }

        except Exception as e:
            logger.error(f"Error making ensemble forecast: {e}")
            raise

    def evaluate(self, X_test, y_test):
        """Evaluate ensemble performance"""
        try:
            # Get XGBoost predictions for evaluation
            xgb_pred = self.xgboost_model.predict(X_test)

            # Calculate metrics
            mae = mean_absolute_error(y_test, xgb_pred)
            rmse = np.sqrt(mean_squared_error(y_test, xgb_pred))

            mask = y_test > 0
            if mask.sum() > 0:
                mape = np.mean(np.abs((y_test[mask] - xgb_pred[mask]) / y_test[mask])) * 100
            else:
                mape = None

            r2 = r2_score(y_test, xgb_pred)

            return {
                'mae': float(mae),
                'rmse': float(rmse),
                'mape': float(mape) if mape is not None else None,
                'r_squared': float(r2),
                'sarima_weight': self.sarima_weight,
                'xgboost_weight': self.xgboost_weight
            }

        except Exception as e:
            logger.error(f"Error evaluating ensemble: {e}")
            return None

    def save(self, disease, location_uid):
        """Save ensemble models"""
        model_dir = config.MODEL_SAVE_DIR / disease / location_uid
        model_dir.mkdir(parents=True, exist_ok=True)

        # Save SARIMA
        sarima_path = model_dir / "sarima_model.pkl"
        self.sarima_model.save(sarima_path)

        # Save XGBoost
        xgboost_path = model_dir / "xgboost_model.pkl"
        self.xgboost_model.save(xgboost_path)

        logger.info(f"Ensemble saved to {model_dir}")

    @staticmethod
    def load(disease, location_uid):
        """Load ensemble models"""
        model_dir = config.MODEL_SAVE_DIR / disease / location_uid

        ensemble = EnsembleForecaster()

        # Load SARIMA
        sarima_path = model_dir / "sarima_model.pkl"
        if sarima_path.exists():
            ensemble.sarima_model = ForecastModel.load(sarima_path)

        # Load XGBoost
        xgboost_path = model_dir / "xgboost_model.pkl"
        if xgboost_path.exists():
            ensemble.xgboost_model = ForecastModel.load(xgboost_path)

        ensemble.is_trained = ensemble.sarima_model.is_trained and ensemble.xgboost_model.is_trained

        logger.info(f"Ensemble loaded from {model_dir}")
        return ensemble
