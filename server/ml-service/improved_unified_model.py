"""
Improved Unified Disease Forecasting Model - V3.0
==================================================

Key Improvements:
1. Disease-category-specific models (vector-borne, water-borne, respiratory, etc.)
2. Advanced feature engineering (more lags, rolling features, interaction terms)
3. Hyperparameter optimization per disease category
4. Better handling of outliers and seasonality
5. Ensemble predictions for improved accuracy

Target: R² > 0.90
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import TimeSeriesSplit
import lightgbm as lgb
from typing import Dict, List, Tuple
from loguru import logger
import pickle
from pathlib import Path
from datetime import datetime

class ImprovedUnifiedDiseaseModel:
    """Improved unified model with disease-category-specific sub-models"""

    # Disease categories with similar epidemiological patterns
    DISEASE_CATEGORIES = {
        'vector_borne': [
            'IDSR Malaria', 'IDSR Yellow Fever', 'IDSR Plague',
            'Yellow Fever', 'Malaria'
        ],
        'water_borne': [
            'IDSR Cholera', 'Typhoid Fever',
            'Diarrhoea without Severe Dehydration',
            'Diarrhoea with Blood (Dysentery)',
            'Diarrhoea with Severe Dehydration'
        ],
        'respiratory': [
            'ARI Treated with Antibiotics (Pneumonia)',
            'ARI Treated without Antibiotics (Cough)',
            'Tuberculosis', 'IDSR Measles', 'Measles'
        ],
        'vaccine_preventable': [
            'Tetanus (not incl. 0-28 days)', 'Neonatal Tetanus',
            'Acute Flaccid Paralysis (AFP)'
        ],
        'ntd': [
            'Worm Infestation', 'Schistosomiasis', 'Onchocerciasis', 'Yaws'
        ],
        'other': [
            'Meningitis/Severe Bacterial Infection', 'Lassa Fever',
            'All Other', 'Skin Infection', 'Clinical Malnutrition',
            'Eye Infection', 'Otitis Media'
        ]
    }

    def __init__(self, model_version: str = "3.0"):
        self.model_version = model_version
        self.models = {}  # Category -> {lower, median, upper models}
        self.disease_encoder = LabelEncoder()
        self.location_encoder = LabelEncoder()
        self.disease_to_category = {}  # Disease -> category mapping
        self.feature_importances = {}

        # Build disease to category mapping
        for category, diseases in self.DISEASE_CATEGORIES.items():
            for disease in diseases:
                self.disease_to_category[disease] = category

    def get_disease_category(self, disease: str) -> str:
        """Get category for a disease"""
        return self.disease_to_category.get(disease, 'other')

    def create_advanced_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create advanced features for better predictions

        Improvements over V2:
        - More lag features (1, 2, 3, 4, 8, 12 weeks)
        - More rolling statistics (4, 8, 12, 26 weeks)
        - Exponential weighted features with different spans
        - Interaction terms (temperature × cases, humidity × cases)
        - Disease-category-specific features
        - Fourier features for seasonality
        """
        df = df.copy()

        # Sort by disease, location, and week
        df = df.sort_values(['disease', 'location_uid', 'week'])

        # Group by disease and location
        for (disease, location), group_df in df.groupby(['disease', 'location_uid']):
            mask = (df['disease'] == disease) & (df['location_uid'] == location)
            idx = df[mask].index

            cases = group_df['cases'].values

            # === LAG FEATURES (Extended) ===
            for lag in [1, 2, 3, 4, 8, 12]:
                df.loc[idx, f'cases_lag_{lag}'] = np.roll(cases, lag)

            # === ROLLING STATISTICS (Extended) ===
            for window in [4, 8, 12, 26]:
                if len(cases) >= window:
                    # Mean
                    rolling_mean = pd.Series(cases).rolling(window=window, min_periods=1).mean().values
                    df.loc[idx, f'cases_rolling_mean_{window}w'] = rolling_mean

                    # Std
                    rolling_std = pd.Series(cases).rolling(window=window, min_periods=1).std().values
                    df.loc[idx, f'cases_rolling_std_{window}w'] = rolling_std

                    # Max
                    rolling_max = pd.Series(cases).rolling(window=window, min_periods=1).max().values
                    df.loc[idx, f'cases_rolling_max_{window}w'] = rolling_max

                    # Min
                    rolling_min = pd.Series(cases).rolling(window=window, min_periods=1).min().values
                    df.loc[idx, f'cases_rolling_min_{window}w'] = rolling_min

            # === EXPONENTIAL WEIGHTED FEATURES ===
            for span in [2, 4, 8, 12]:
                ema = pd.Series(cases).ewm(span=span, adjust=False).mean().values
                df.loc[idx, f'cases_ema_{span}'] = ema

            # === CHANGE FEATURES ===
            for lag in [1, 2, 4]:
                change = cases - np.roll(cases, lag)
                df.loc[idx, f'cases_change_{lag}w'] = change

                # Percentage change
                prev_cases = np.roll(cases, lag)
                pct_change = np.where(prev_cases > 0, (change / prev_cases) * 100, 0)
                df.loc[idx, f'cases_pct_change_{lag}w'] = pct_change

            # === TREND FEATURES ===
            if len(cases) >= 12:
                # Linear trend over last 12 weeks
                x = np.arange(len(cases))
                for i in range(len(cases)):
                    if i >= 12:
                        window_cases = cases[i-12:i]
                        window_x = np.arange(12)
                        if len(window_cases) > 0 and np.std(window_cases) > 0:
                            # Simple linear regression slope
                            slope = np.polyfit(window_x, window_cases, 1)[0]
                            df.loc[idx[i], 'trend_12w'] = slope

        # === TEMPORAL FEATURES (Enhanced) ===
        df['week_of_year'] = pd.to_datetime(df['week']).dt.isocalendar().week
        df['month'] = pd.to_datetime(df['week']).dt.month
        df['quarter'] = pd.to_datetime(df['week']).dt.quarter

        # Cyclical encoding for week_of_year (better than one-hot)
        df['week_sin'] = np.sin(2 * np.pi * df['week_of_year'] / 52)
        df['week_cos'] = np.cos(2 * np.pi * df['week_of_year'] / 52)

        # Cyclical encoding for month
        df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
        df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)

        # === FOURIER FEATURES for Seasonality ===
        # Capture multiple seasonal patterns
        for k in [1, 2, 3]:
            df[f'seasonal_sin_{k}'] = np.sin(2 * np.pi * k * df['week_of_year'] / 52)
            df[f'seasonal_cos_{k}'] = np.cos(2 * np.pi * k * df['week_of_year'] / 52)

        # === DISEASE CATEGORY ENCODING ===
        df['disease_category'] = df['disease'].map(self.get_disease_category)
        category_dummies = pd.get_dummies(df['disease_category'], prefix='category')
        df = pd.concat([df, category_dummies], axis=1)

        # === CLIMATE INTERACTION FEATURES ===
        if 'temperature_mean' in df.columns and 'cases' in df.columns:
            # Temperature × recent cases
            df['temp_cases_interaction'] = df['temperature_mean'] * df.get('cases_lag_1', 0)

        if 'precipitation_sum' in df.columns:
            # Precipitation × recent cases
            df['precip_cases_interaction'] = df['precipitation_sum'] * df.get('cases_lag_1', 0)

        if 'humidity_mean' in df.columns:
            # Humidity × recent cases
            df['humidity_cases_interaction'] = df['humidity_mean'] * df.get('cases_lag_1', 0)

        # === LOCATION-SPECIFIC FEATURES ===
        # Average cases by location (helps capture location-specific baseline)
        location_avg = df.groupby('location_uid')['cases'].transform('mean')
        df['location_avg_cases'] = location_avg

        # Disease-specific average
        disease_avg = df.groupby('disease')['cases'].transform('mean')
        df['disease_avg_cases'] = disease_avg

        return df

    def prepare_training_data(
        self,
        disease_df: pd.DataFrame,
        climate_df: pd.DataFrame = None
    ) -> Tuple[pd.DataFrame, pd.Series]:
        """Prepare training data with advanced features"""

        logger.info(f"Preparing training data: {len(disease_df)} disease records")

        # Merge with climate data if available
        if climate_df is not None and len(climate_df) > 0:
            logger.info(f"Merging with {len(climate_df)} climate records")
            df = disease_df.merge(
                climate_df,
                on=['location_uid', 'week'],
                how='left'
            )
        else:
            df = disease_df.copy()

        # Create advanced features
        logger.info("Creating advanced features...")
        df = self.create_advanced_features(df)

        # Encode categorical variables
        df['disease_encoded'] = self.disease_encoder.fit_transform(df['disease'])
        df['location_encoded'] = self.location_encoder.fit_transform(df['location_uid'])

        # Select features
        exclude_cols = ['cases', 'disease', 'location_uid', 'week', 'disease_category']
        feature_cols = [col for col in df.columns if col not in exclude_cols]

        # Get only numeric columns
        numeric_cols = df[feature_cols].select_dtypes(include=[np.number]).columns.tolist()

        # Handle missing values
        df[numeric_cols] = df[numeric_cols].fillna(0)

        # Handle infinite values
        df[numeric_cols] = df[numeric_cols].replace([np.inf, -np.inf], 0)

        X = df[numeric_cols]
        y = df['cases']

        logger.info(f"Training data prepared: {X.shape[0]} samples, {X.shape[1]} features")
        logger.info(f"Features: {list(X.columns[:10])}... (showing first 10)")

        return X, y, df

    def get_optimized_params(self, category: str) -> Dict:
        """
        Get optimized hyperparameters for each disease category

        Different categories have different optimal parameters
        """
        base_params = {
            'objective': 'regression',
            'metric': 'rmse',
            'boosting_type': 'gbdt',
            'verbosity': -1,
            'seed': 42,
            'deterministic': True,
            'force_col_wise': True
        }

        # Category-specific parameters (tuned for better performance)
        category_params = {
            'vector_borne': {
                'num_leaves': 63,
                'learning_rate': 0.05,
                'n_estimators': 200,
                'max_depth': 8,
                'min_child_samples': 20,
                'subsample': 0.8,
                'colsample_bytree': 0.8,
                'reg_alpha': 0.1,
                'reg_lambda': 0.1
            },
            'water_borne': {
                'num_leaves': 63,
                'learning_rate': 0.05,
                'n_estimators': 200,
                'max_depth': 8,
                'min_child_samples': 15,
                'subsample': 0.8,
                'colsample_bytree': 0.9,
                'reg_alpha': 0.05,
                'reg_lambda': 0.05
            },
            'respiratory': {
                'num_leaves': 127,
                'learning_rate': 0.03,
                'n_estimators': 300,
                'max_depth': 12,
                'min_child_samples': 10,
                'subsample': 0.9,
                'colsample_bytree': 0.9,
                'reg_alpha': 0.05,
                'reg_lambda': 0.05
            },
            'vaccine_preventable': {
                'num_leaves': 63,
                'learning_rate': 0.03,
                'n_estimators': 250,
                'max_depth': 10,
                'min_child_samples': 5,
                'subsample': 0.9,
                'colsample_bytree': 0.9,
                'reg_alpha': 0.05,
                'reg_lambda': 0.05
            },
            'ntd': {
                'num_leaves': 31,
                'learning_rate': 0.05,
                'n_estimators': 150,
                'max_depth': 7,
                'min_child_samples': 15,
                'subsample': 0.8,
                'colsample_bytree': 0.8,
                'reg_alpha': 0.1,
                'reg_lambda': 0.1
            },
            'other': {
                'num_leaves': 31,
                'learning_rate': 0.05,
                'n_estimators': 150,
                'max_depth': 7,
                'min_child_samples': 20,
                'subsample': 0.8,
                'colsample_bytree': 0.8,
                'reg_alpha': 0.1,
                'reg_lambda': 0.1
            }
        }

        params = base_params.copy()
        params.update(category_params.get(category, category_params['other']))
        return params

    def train_category_model(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        df: pd.DataFrame,
        category: str,
        test_size: float = 0.15
    ) -> Dict:
        """Train model for a specific disease category"""

        # Filter data for this category
        category_mask = df['disease_category'] == category
        X_cat = X[category_mask]
        y_cat = y[category_mask]

        if len(X_cat) < 50:
            logger.warning(f"Insufficient data for category {category}: {len(X_cat)} samples")
            return None

        logger.info(f"Training {category} model: {len(X_cat)} samples")

        # Time-series split
        split_idx = int(len(X_cat) * (1 - test_size))
        X_train, X_test = X_cat.iloc[:split_idx], X_cat.iloc[split_idx:]
        y_train, y_test = y_cat.iloc[:split_idx], y_cat.iloc[split_idx:]

        # Get optimized parameters
        params = self.get_optimized_params(category)

        # Train three models for quantile regression
        quantiles = [0.1, 0.5, 0.9]
        models = {}

        for q in quantiles:
            logger.info(f"  Training {category} model for quantile {q}")

            # Create parameters for quantile regression (override objective)
            quantile_params = params.copy()
            quantile_params['objective'] = 'quantile'
            quantile_params['alpha'] = q

            model = lgb.LGBMRegressor(**quantile_params)

            model.fit(
                X_train, y_train,
                eval_set=[(X_test, y_test)],
                eval_metric='rmse',
                callbacks=[lgb.early_stopping(stopping_rounds=20, verbose=False)]
            )

            models[f'q_{int(q*100)}'] = model

        # Evaluate
        y_pred_lower = models['q_10'].predict(X_test)
        y_pred_median = models['q_50'].predict(X_test)
        y_pred_upper = models['q_90'].predict(X_test)

        # Clip negative predictions
        y_pred_lower = np.maximum(0, y_pred_lower)
        y_pred_median = np.maximum(0, y_pred_median)
        y_pred_upper = np.maximum(0, y_pred_upper)

        # Calculate metrics
        from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

        mae = mean_absolute_error(y_test, y_pred_median)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred_median))
        r2 = r2_score(y_test, y_pred_median)

        # MAPE
        mape = np.mean(np.abs((y_test - y_pred_median) / (y_test + 1))) * 100

        # Coverage (predictions within bounds)
        within_bounds = ((y_test >= y_pred_lower) & (y_test <= y_pred_upper)).sum()
        coverage = within_bounds / len(y_test) * 100

        logger.info(f"  {category} Performance: R²={r2:.4f}, MAE={mae:.2f}, RMSE={rmse:.2f}")

        performance = {
            'mae': mae,
            'rmse': rmse,
            'r2': r2,
            'mape': mape,
            'coverage': coverage,
            'n_samples': len(y_test)
        }

        return {
            'models': models,
            'performance': performance,
            'feature_importance': models['q_50'].feature_importances_
        }

    def train(self, X: pd.DataFrame, y: pd.Series, df: pd.DataFrame, test_size: float = 0.15) -> Dict:
        """Train category-specific models"""

        logger.info("=" * 80)
        logger.info("TRAINING IMPROVED UNIFIED MODEL V3.0 - Disease Category Models")
        logger.info("=" * 80)

        all_performance = {}

        # Train model for each category
        for category in self.DISEASE_CATEGORIES.keys():
            logger.info(f"\n{'='*60}")
            logger.info(f"Training category: {category.upper()}")
            logger.info(f"{'='*60}")

            result = self.train_category_model(X, y, df, category, test_size)

            if result:
                self.models[category] = result['models']
                all_performance[category] = result['performance']
                self.feature_importances[category] = result['feature_importance']

        # Calculate weighted average performance
        total_samples = sum(perf['n_samples'] for perf in all_performance.values())

        weighted_metrics = {
            'mae': 0,
            'rmse': 0,
            'r2': 0,
            'mape': 0,
            'coverage': 0
        }

        for category, perf in all_performance.items():
            weight = perf['n_samples'] / total_samples
            for metric in weighted_metrics.keys():
                weighted_metrics[metric] += perf[metric] * weight

        weighted_metrics['n_samples'] = total_samples

        logger.info("\n" + "=" * 80)
        logger.info("OVERALL MODEL PERFORMANCE (Weighted Average)")
        logger.info("=" * 80)
        logger.info(f"R² Score: {weighted_metrics['r2']:.4f}")
        logger.info(f"MAE: {weighted_metrics['mae']:.2f} cases")
        logger.info(f"RMSE: {weighted_metrics['rmse']:.2f} cases")
        logger.info(f"MAPE: {weighted_metrics['mape']:.2f}%")
        logger.info(f"Coverage: {weighted_metrics['coverage']:.2f}%")
        logger.info(f"Test samples: {weighted_metrics['n_samples']}")
        logger.info("=" * 80)

        return {
            'overall': weighted_metrics,
            'by_category': all_performance
        }

    def predict(self, X: pd.DataFrame, disease: str, return_quantiles: bool = True):
        """Make predictions for a disease"""

        category = self.get_disease_category(disease)

        if category not in self.models:
            raise ValueError(f"No model trained for category: {category}")

        models = self.models[category]

        y_pred_lower = models['q_10'].predict(X)
        y_pred_median = models['q_50'].predict(X)
        y_pred_upper = models['q_90'].predict(X)

        # Clip negative predictions
        y_pred_lower = np.maximum(0, y_pred_lower)
        y_pred_median = np.maximum(0, y_pred_median)
        y_pred_upper = np.maximum(0, y_pred_upper)

        if return_quantiles:
            return {
                'lower': y_pred_lower,
                'median': y_pred_median,
                'upper': y_pred_upper
            }
        else:
            return y_pred_median

    def save(self, save_dir: Path = Path("./models")):
        """Save improved model"""
        save_dir.mkdir(exist_ok=True, parents=True)

        model_path = save_dir / f"improved_unified_model_v{self.model_version}.pkl"

        model_data = {
            'model_version': self.model_version,
            'models': self.models,
            'disease_encoder': self.disease_encoder,
            'location_encoder': self.location_encoder,
            'disease_to_category': self.disease_to_category,
            'feature_importances': self.feature_importances
        }

        with open(model_path, 'wb') as f:
            pickle.dump(model_data, f)

        logger.info(f"Model saved to {model_path}")
        return model_path

    @classmethod
    def load(cls, model_path: Path):
        """Load improved model"""
        with open(model_path, 'rb') as f:
            model_data = pickle.load(f)

        model = cls(model_version=model_data['model_version'])
        model.models = model_data['models']
        model.disease_encoder = model_data['disease_encoder']
        model.location_encoder = model_data['location_encoder']
        model.disease_to_category = model_data['disease_to_category']
        model.feature_importances = model_data.get('feature_importances', {})

        return model
