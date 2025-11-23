"""
Production-Compatible Improved Unified Model V3.1
=================================================

Uses the SAME feature set as V2.0 but with:
- Disease-category-specific models
- Optimized hyperparameters
- Better training approach

Expected R²: 0.85-0.90 (vs 0.56 baseline, 0.95 full V3.0)
"""

import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.preprocessing import LabelEncoder
import lightgbm as lgb
from typing import Dict, Tuple
from loguru import logger
import pickle
from pathlib import Path

# Import feature engineering from V2.0 model
from unified_model import UnifiedDiseaseModel


class ImprovedCompatibleModel:
    """
    Improved model that uses V2.0 feature set with V3.0 improvements
    """

    # Same disease categories as V3.0
    DISEASE_CATEGORIES = {
        'vector_borne': [
            'IDSR Malaria', 'IDSR Yellow Fever', 'Yellow Fever', 'IDSR Plague', 'Malaria'
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
            'Tuberculosis', 'IDSR Measles', 'Measles',
            'Meningitis/Severe Bacterial Infection'
        ],
        'vaccine_preventable': [
            'Tetanus (not incl. 0-28 days)', 'Neonatal Tetanus',
            'Acute Flaccid Paralysis (AFP)'
        ],
        'ntd': [
            'Worm Infestation', 'Schistosomiasis', 'Onchocerciasis', 'Yaws'
        ],
        'other': [
            'Lassa Fever', 'All Other', 'Skin Infection',
            'Clinical Malnutrition', 'Eye Infection', 'Otitis Media'
        ]
    }

    def __init__(self, model_version: str = "3.1"):
        self.model_version = model_version
        self.models = {}  # Category -> {lower, median, upper models}
        self.base_model = UnifiedDiseaseModel(model_version="2.0")  # Use V2.0 feature engineering
        self.disease_to_category = {}
        self.feature_names = []  # Will be set during training
        self.training_metadata = {}  # Will be set during training
        self.is_trained = False

        # Build disease to category mapping
        for category, diseases in self.DISEASE_CATEGORIES.items():
            for disease in diseases:
                self.disease_to_category[disease] = category

    def get_disease_category(self, disease: str) -> str:
        """Get category for a disease"""
        return self.disease_to_category.get(disease, 'other')

    def get_optimized_params(self, category: str) -> Dict:
        """Get optimized hyperparameters for each category"""
        base_params = {
            'objective': 'regression',
            'metric': 'rmse',
            'boosting_type': 'gbdt',
            'verbosity': -1,
            'seed': 42,
            'deterministic': True,
            'force_col_wise': True
        }

        # Optimized parameters per category (from V3.0)
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

    def prepare_training_data(
        self,
        disease_df: pd.DataFrame,
        climate_df: pd.DataFrame = None
    ) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame]:
        """
        Prepare training data using V2.0 feature engineering
        """
        logger.info("Preparing training data using V2.0-compatible features...")

        # Use base model's feature engineering (ensures compatibility)
        X, y = self.base_model.prepare_training_data(disease_df, climate_df)

        # Get the full dataframe with metadata
        # We need to reconstruct it since base model only returns X, y
        df = disease_df.copy()
        if climate_df is not None and len(climate_df) > 0:
            df = df.merge(climate_df, on=['location', 'week'], how='left')

        # Add disease category
        df['disease_category'] = df['disease'].map(self.get_disease_category).fillna('other')

        logger.info(f"Training data prepared: {X.shape[0]} samples, {X.shape[1]} features")
        logger.info(f"Features: {list(X.columns[:10])}... (showing first 10)")

        return X, y, df

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
        mape = np.mean(np.abs((y_test - y_pred_median) / (y_test + 1))) * 100
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
            'performance': performance
        }

    def train(self, X: pd.DataFrame, y: pd.Series, df: pd.DataFrame, test_size: float = 0.15) -> Dict:
        """Train category-specific models"""

        logger.info("=" * 80)
        logger.info("TRAINING COMPATIBLE IMPROVED MODEL V3.1")
        logger.info("=" * 80)

        # Store feature names for later use
        self.feature_names = list(X.columns)

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

        # Store training metadata
        self.training_metadata = {
            'performance': {
                'overall': weighted_metrics,
                'by_category': all_performance
            },
            'trained_at': datetime.now().isoformat(),
            'n_samples': len(X),
            'n_features': len(self.feature_names)
        }
        self.is_trained = True

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

    def get_feature_importance(self, disease: str = None, top_n: int = 10) -> Dict[str, float]:
        """Get feature importance from category models"""
        # If disease specified, get importance from that disease's category
        if disease:
            category = self.get_disease_category(disease)
            if category in self.models and 'q_50' in self.models[category]:
                model = self.models[category]['q_50']
                if hasattr(model, 'feature_importances_'):
                    importance = dict(zip(self.feature_names, model.feature_importances_))
                    # Sort by importance and return top N
                    sorted_importance = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True)[:top_n])
                    return sorted_importance

        # Otherwise return average importance across all categories
        all_importances = {}
        for category, models in self.models.items():
            if 'q_50' in models:
                model = models['q_50']
                if hasattr(model, 'feature_importances_'):
                    for feature, importance in zip(self.feature_names, model.feature_importances_):
                        if feature not in all_importances:
                            all_importances[feature] = []
                        all_importances[feature].append(importance)

        # Average across categories
        avg_importance = {feature: np.mean(importances) for feature, importances in all_importances.items()}
        # Sort and return top N
        sorted_importance = dict(sorted(avg_importance.items(), key=lambda x: x[1], reverse=True)[:top_n])
        return sorted_importance

    def save(self, save_dir: Path = Path("./models")):
        """Save model"""
        save_dir.mkdir(exist_ok=True, parents=True)

        model_path = save_dir / f"improved_unified_model_v{self.model_version}.pkl"

        model_data = {
            'model_version': self.model_version,
            'models': self.models,
            'disease_to_category': self.disease_to_category,
            'base_model': self.base_model,
            'feature_names': self.feature_names,
            'training_metadata': self.training_metadata,
            'is_trained': self.is_trained
        }

        with open(model_path, 'wb') as f:
            pickle.dump(model_data, f)

        logger.info(f"Model saved to {model_path}")
        return model_path

    @classmethod
    def load(cls, model_path: Path):
        """Load model"""
        with open(model_path, 'rb') as f:
            model_data = pickle.load(f)

        model = cls(model_version=model_data['model_version'])
        model.models = model_data['models']
        model.disease_to_category = model_data['disease_to_category']
        model.base_model = model_data['base_model']
        model.feature_names = model_data.get('feature_names', [])
        model.training_metadata = model_data.get('training_metadata', {})
        model.is_trained = model_data.get('is_trained', True)

        return model
