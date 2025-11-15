"""Feature engineering for disease forecasting"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from loguru import logger

class FeatureEngineer:
    """Feature engineering for time series forecasting"""

    def __init__(self):
        self.feature_names = []

    def prepare_training_data(self, disease_data, climate_data=None):
        """
        Prepare training data from disease and climate data

        Args:
            disease_data: List of dicts with 'week', 'cases', etc.
            climate_data: Optional list of dicts with climate variables

        Returns:
            pandas DataFrame with engineered features
        """
        try:
            if not disease_data:
                logger.warning("No disease data provided")
                return None

            # Convert to DataFrame
            df = pd.DataFrame(disease_data)

            # Ensure week column is datetime
            if 'week' in df.columns:
                df['week'] = pd.to_datetime(df['week'])
                df = df.sort_values('week')
            elif 'startdate' in df.columns:
                df['week'] = pd.to_datetime(df['startdate'])
                df = df.sort_values('week')

            # Set week as index
            df.set_index('week', inplace=True)

            # Ensure we have a 'cases' column
            if 'cases' not in df.columns:
                logger.error("No 'cases' column in disease data")
                return None

            # Handle missing values
            df['cases'] = df['cases'].fillna(0)

            # Create lagged features
            df = self._create_lagged_features(df)

            # Create rolling statistics
            df = self._create_rolling_features(df)

            # Create temporal features
            df = self._create_temporal_features(df)

            # Merge climate data if provided
            if climate_data:
                df = self._merge_climate_features(df, climate_data)

            # Drop rows with NaN values (from lagged features)
            df = df.dropna()

            logger.info(f"Prepared {len(df)} training samples with {len(df.columns)} features")
            self.feature_names = df.columns.tolist()

            return df

        except Exception as e:
            logger.error(f"Error in prepare_training_data: {e}")
            raise

    def _create_lagged_features(self, df):
        """Create lagged features"""
        # Lagged cases (1, 2, 4, 8 weeks ago)
        for lag in [1, 2, 4, 8]:
            df[f'cases_lag_{lag}'] = df['cases'].shift(lag)

        return df

    def _create_rolling_features(self, df):
        """Create rolling window features"""
        # 4-week moving average and std
        df['cases_ma_4'] = df['cases'].rolling(window=4, min_periods=1).mean()
        df['cases_std_4'] = df['cases'].rolling(window=4, min_periods=1).std()

        # 8-week moving average
        df['cases_ma_8'] = df['cases'].rolling(window=8, min_periods=1).mean()

        # 4-week cumulative sum
        df['cases_cum_4'] = df['cases'].rolling(window=4, min_periods=1).sum()

        return df

    def _create_temporal_features(self, df):
        """Create temporal features"""
        # Month (1-12)
        df['month'] = df.index.month

        # Week of year (1-52)
        df['week_of_year'] = df.index.isocalendar().week

        # Season (Rainy: May-October, Dry: November-April)
        df['is_rainy_season'] = df['month'].apply(lambda m: 1 if 5 <= m <= 10 else 0)

        # Quarter
        df['quarter'] = df.index.quarter

        return df

    def _merge_climate_features(self, df, climate_data):
        """Merge climate features"""
        try:
            # Convert climate data to DataFrame
            climate_df = pd.DataFrame(climate_data)

            if 'week' in climate_df.columns:
                climate_df['week'] = pd.to_datetime(climate_df['week'])
                climate_df.set_index('week', inplace=True)

            # Select relevant columns
            climate_cols = [
                'avg_temperature', 'total_precipitation',
                'avg_humidity', 'avg_wind_speed'
            ]

            available_cols = [col for col in climate_cols if col in climate_df.columns]

            if not available_cols:
                logger.warning("No climate columns found to merge")
                return df

            climate_df = climate_df[available_cols]

            # Merge with main dataframe
            df = df.join(climate_df, how='left')

            # Create lagged climate features
            for col in available_cols:
                df[f'{col}_lag_1'] = df[col].shift(1)
                df[f'{col}_lag_2'] = df[col].shift(2)

            # Create climate interaction terms
            if 'avg_temperature' in df.columns and 'total_precipitation' in df.columns:
                df['temp_precip_interaction'] = df['avg_temperature'] * df['total_precipitation']

            if 'avg_temperature' in df.columns:
                df['temp_squared'] = df['avg_temperature'] ** 2

            # Fill missing climate values with forward fill then backward fill
            df = df.fillna(method='ffill').fillna(method='bfill')

            logger.info(f"Merged {len(available_cols)} climate features")

            return df

        except Exception as e:
            logger.error(f"Error merging climate features: {e}")
            return df

    def prepare_forecast_features(self, historical_df, forecast_horizon=4):
        """
        Prepare features for forecasting

        Args:
            historical_df: DataFrame with historical data and features
            forecast_horizon: Number of periods to forecast

        Returns:
            DataFrame with features for forecasting
        """
        try:
            # Validate input
            if historical_df is None or len(historical_df) == 0:
                raise ValueError("Historical dataframe is empty")

            if len(historical_df) < 8:
                logger.warning(f"Historical data has only {len(historical_df)} points, forecast quality may be poor")

            forecast_features = []

            # Get the last row of historical data
            last_row = historical_df.iloc[-1].copy()
            last_date = historical_df.index[-1]

            for i in range(1, forecast_horizon + 1):
                # Calculate next date (weekly increment)
                next_date = last_date + timedelta(weeks=i)

                # Create features for this forecast period
                features = {}
                features['forecast_week'] = next_date

                # Temporal features
                features['month'] = next_date.month
                features['week_of_year'] = next_date.isocalendar()[1]
                features['is_rainy_season'] = 1 if 5 <= next_date.month <= 10 else 0
                features['quarter'] = (next_date.month - 1) // 3 + 1

                # For lagged features, we need to use actual historical data
                # and previously forecasted values
                if i == 1:
                    features['cases_lag_1'] = historical_df['cases'].iloc[-1] if len(historical_df) >= 1 else 0
                    features['cases_lag_2'] = historical_df['cases'].iloc[-2] if len(historical_df) >= 2 else 0
                    features['cases_lag_4'] = historical_df['cases'].iloc[-4] if len(historical_df) >= 4 else 0
                    features['cases_lag_8'] = historical_df['cases'].iloc[-8] if len(historical_df) >= 8 else 0
                else:
                    # Use previously forecasted values (simplified - use last known)
                    features['cases_lag_1'] = last_row.get('cases', 0)
                    features['cases_lag_2'] = last_row.get('cases_lag_1', 0)
                    features['cases_lag_4'] = last_row.get('cases_lag_3', 0) if i >= 4 else last_row.get('cases', 0)
                    features['cases_lag_8'] = last_row.get('cases_lag_7', 0) if i >= 8 else last_row.get('cases', 0)

                # Rolling features (use last known values)
                cases_value = last_row.get('cases', 0)
                features['cases_ma_4'] = last_row.get('cases_ma_4', cases_value)
                features['cases_std_4'] = last_row.get('cases_std_4', 0)
                features['cases_ma_8'] = last_row.get('cases_ma_8', cases_value)
                features['cases_cum_4'] = last_row.get('cases_cum_4', cases_value * 4)

                # Climate features (use last known or seasonal averages)
                for col in ['avg_temperature', 'total_precipitation', 'avg_humidity', 'avg_wind_speed']:
                    if col in last_row.index:
                        # Use seasonal pattern if available
                        features[col] = last_row[col]
                        features[f'{col}_lag_1'] = last_row.get(col, 0)
                        features[f'{col}_lag_2'] = last_row.get(f'{col}_lag_1', 0)

                # Interaction terms
                if 'avg_temperature' in features and 'total_precipitation' in features:
                    features['temp_precip_interaction'] = features['avg_temperature'] * features['total_precipitation']
                if 'avg_temperature' in features:
                    features['temp_squared'] = features['avg_temperature'] ** 2

                forecast_features.append(features)

            # Convert to DataFrame
            forecast_df = pd.DataFrame(forecast_features)
            forecast_df.set_index('forecast_week', inplace=True)

            logger.info(f"Prepared forecast features for {forecast_horizon} periods")

            return forecast_df

        except Exception as e:
            logger.error(f"Error preparing forecast features: {e}")
            raise
