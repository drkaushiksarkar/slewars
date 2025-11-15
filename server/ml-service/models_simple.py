"""Simplified XGBoost-only models for disease forecasting (no SARIMA dependencies)"""
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb
from loguru import logger
import pickle
from pathlib import Path
import config


class XGBoostModel:
    """XGBoost model for disease forecasting"""

    def __init__(self):
        self.model_type = "XGBoost"
        self.model = None
        self.is_trained = False
        self.version = "1.0"
        self.feature_names = None
        self.feature_importance_dict = None

    def train(self, X_train, y_train):
        """Train XGBoost model"""
        try:
            logger.info(f"Training XGBoost model with {len(X_train)} samples")

            # Store feature names
            if isinstance(X_train, pd.DataFrame):
                self.feature_names = list(X_train.columns)
                X_train_values = X_train.values
            else:
                X_train_values = X_train

            # Train XGBoost
            self.model = xgb.XGBRegressor(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=5,
                min_child_weight=1,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42
            )

            self.model.fit(X_train_values, y_train)
            self.is_trained = True

            # Store feature importance
            if self.feature_names:
                importance = self.model.feature_importances_
                self.feature_importance_dict = dict(zip(self.feature_names, importance))
                # Sort by importance
                self.feature_importance_dict = dict(
                    sorted(self.feature_importance_dict.items(), key=lambda x: x[1], reverse=True)
                )

            logger.info("XGBoost model trained successfully")
            return True

        except Exception as e:
            logger.error(f"Error training XGBoost: {e}", exc_info=True)
            raise

    def predict(self, X_test):
        """Make predictions"""
        if not self.is_trained or self.model is None:
            raise ValueError("Model must be trained before making predictions")

        if isinstance(X_test, pd.DataFrame):
            X_test = X_test.values

        predictions = self.model.predict(X_test)
        # Ensure non-negative predictions
        predictions = np.maximum(predictions, 0)

        return predictions

    def evaluate(self, X_test, y_test):
        """Evaluate model performance"""
        predictions = self.predict(X_test)

        mae = mean_absolute_error(y_test, predictions)
        rmse = np.sqrt(mean_squared_error(y_test, predictions))

        # MAPE (Mean Absolute Percentage Error)
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

    def get_feature_importance(self):
        """Get feature importance dictionary"""
        return self.feature_importance_dict or {}

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


class EnsembleForecaster:
    """
    Simplified Ensemble forecaster using only XGBoost
    (Compatible interface with original EnsembleForecaster)
    """

    def __init__(self, sarima_weight=0.0, xgboost_weight=1.0):
        """Initialize with XGBoost only (sarima_weight ignored)"""
        self.xgboost_model = XGBoostModel()
        self.xgboost_weight = 1.0  # Always use XGBoost only
        self.is_trained = False
        self.dropped_columns = []
        self.feature_columns = []

    def train(self, df, target_col='cases'):
        """Train the ensemble (XGBoost only)"""
        try:
            logger.info(f"Training XGBoost forecaster on {len(df)} samples")

            # Prepare features and target
            X = df.drop(columns=[target_col])
            y = df[target_col]

            # Convert all columns to numeric, drop any that can't be converted
            non_numeric_cols = []
            for col in X.columns:
                try:
                    X[col] = pd.to_numeric(X[col])
                except (ValueError, TypeError):
                    logger.warning(f"Dropping non-numeric column: {col}")
                    non_numeric_cols.append(col)
                    X = X.drop(columns=[col])

            # Store the dropped columns and feature names for later use
            self.dropped_columns = non_numeric_cols
            self.feature_columns = list(X.columns)

            # Train XGBoost
            self.xgboost_model.train(X, y)
            self.is_trained = True

            logger.info("Ensemble (XGBoost) trained successfully")
            return True

        except Exception as e:
            logger.error(f"Error training ensemble: {e}", exc_info=True)
            raise

    def forecast(self, forecast_df, steps=4):
        """Generate forecast"""
        if not self.is_trained:
            raise ValueError("Model must be trained before forecasting")

        try:
            logger.info(f"Generating {steps}-step forecast")

            # Drop any non-numeric columns that were dropped during training
            for col in self.dropped_columns:
                if col in forecast_df.columns:
                    forecast_df = forecast_df.drop(columns=[col])

            # Ensure we have the same features as during training
            # Add missing features with 0 values
            for col in self.feature_columns:
                if col not in forecast_df.columns:
                    forecast_df[col] = 0

            # Reorder columns to match training
            forecast_df = forecast_df[self.feature_columns]

            # Get XGBoost predictions
            predictions = self.xgboost_model.predict(forecast_df)

            # Calculate confidence intervals (simple approach)
            # Use 95% confidence interval
            std_dev = predictions.std() if len(predictions) > 1 else predictions.mean() * 0.2
            confidence_interval = 1.96 * std_dev

            lower_bound = np.maximum(predictions - confidence_interval, 0)
            upper_bound = predictions + confidence_interval

            # Calculate risk levels
            risk_levels = []
            risk_scores = []

            for pred in predictions:
                if pred < 10:
                    risk = 'LOW'
                    score = 0.3
                elif pred < 50:
                    risk = 'MEDIUM'
                    score = 0.6
                else:
                    risk = 'HIGH'
                    score = 0.9

                risk_levels.append(risk)
                risk_scores.append(score)

            return {
                'predictions': predictions,
                'lower_bound': lower_bound,
                'upper_bound': upper_bound,
                'risk_levels': risk_levels,
                'risk_scores': risk_scores
            }

        except Exception as e:
            logger.error(f"Error generating forecast: {e}", exc_info=True)
            raise

    def evaluate(self, X_test, y_test):
        """Evaluate the ensemble"""
        return self.xgboost_model.evaluate(X_test, y_test)

    def save(self, disease, location_uid):
        """Save ensemble model"""
        try:
            model_dir = Path(config.MODEL_SAVE_DIR) / disease / location_uid
            model_dir.mkdir(parents=True, exist_ok=True)

            model_path = model_dir / 'ensemble_model.pkl'

            with open(model_path, 'wb') as f:
                pickle.dump(self, f)

            logger.info(f"Ensemble model saved to {model_path}")

        except Exception as e:
            logger.error(f"Error saving ensemble: {e}")
            raise

    @staticmethod
    def load(disease, location_uid):
        """Load ensemble model"""
        try:
            model_path = Path(config.MODEL_SAVE_DIR) / disease / location_uid / 'ensemble_model.pkl'

            if not model_path.exists():
                raise FileNotFoundError(f"Model not found at {model_path}")

            with open(model_path, 'rb') as f:
                model = pickle.load(f)

            logger.info(f"Ensemble model loaded from {model_path}")
            return model

        except Exception as e:
            logger.error(f"Error loading ensemble: {e}")
            raise
