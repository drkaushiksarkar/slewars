"""Correlation analysis between weather variables and disease cases"""
import numpy as np
import pandas as pd
from scipy import stats
from scipy.signal import correlate
from loguru import logger
from typing import Dict, List, Tuple
from database import get_db_connection


class CorrelationAnalyzer:
    """Analyze correlation between climate variables and disease cases with lag periods"""

    def __init__(self):
        pass

    def calculate_lagged_correlation(
        self,
        disease: str,
        location_uid: str,
        start_date: str = None,
        end_date: str = None,
        lag_weeks: int = 0
    ) -> Dict:
        """
        Calculate correlation metrics between weather variables and disease cases
        with a specified lag period.

        Args:
            disease: Disease name
            location_uid: Location UID
            start_date: Start date for analysis (YYYY-MM-DD)
            end_date: End date for analysis (YYYY-MM-DD)
            lag_weeks: Lag period in weeks (positive = disease lags climate, negative = disease leads climate)

        Returns:
            Dictionary with correlation metrics and scores
        """
        try:
            logger.info(f"Calculating lagged correlation for {disease} at {location_uid} with lag={lag_weeks} weeks")

            # Fetch disease and climate data
            data = self._fetch_merged_data(disease, location_uid, start_date, end_date)

            if data is None or len(data) < 10:
                return {
                    'success': False,
                    'error': 'Insufficient data for correlation analysis (need at least 10 data points)'
                }

            # Apply lag to disease data
            lagged_data = self._apply_lag(data, lag_weeks)

            if len(lagged_data) < 10:
                return {
                    'success': False,
                    'error': f'Insufficient data after applying {lag_weeks} week lag'
                }

            # Calculate correlation metrics for each climate variable
            correlations = {}

            climate_vars = {
                'temperature': ['avg_temperature', 'temperature_mean', 'temp_mean'],
                'rainfall': ['total_precipitation', 'precipitation', 'rainfall'],
                'humidity': ['avg_humidity', 'humidity', 'humidity_mean']
            }

            for var_name, possible_columns in climate_vars.items():
                # Find which column exists in the data
                col = None
                for possible_col in possible_columns:
                    if possible_col in lagged_data.columns:
                        col = possible_col
                        break

                if col is None:
                    logger.warning(f"Climate variable {var_name} not found in data")
                    continue

                correlations[var_name] = self._calculate_correlation_metrics(
                    lagged_data[col],
                    lagged_data['cases']
                )

            # Calculate composite correlation score (0-100)
            composite_score = self._calculate_composite_score(correlations)

            # Determine relationship strength
            strength = self._get_correlation_strength(composite_score)

            # Calculate statistical significance
            significance = self._calculate_significance(correlations, len(lagged_data))

            return {
                'success': True,
                'lag_weeks': lag_weeks,
                'data_points': len(lagged_data),
                'composite_score': round(composite_score, 2),
                'strength': strength,
                'significant': significance['is_significant'],
                'p_value': significance['p_value'],
                'correlations': correlations,
                'interpretation': self._generate_interpretation(
                    composite_score,
                    strength,
                    lag_weeks,
                    correlations
                )
            }

        except Exception as e:
            logger.error(f"Error calculating lagged correlation: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }

    def _fetch_merged_data(
        self,
        disease: str,
        location_uid: str,
        start_date: str = None,
        end_date: str = None
    ) -> pd.DataFrame:
        """Fetch and merge disease and climate data"""
        try:
            # Set default dates if not provided
            if end_date is None:
                end_date = pd.Timestamp.now().strftime('%Y-%m-%d')
            if start_date is None:
                # Get last 2 years of data
                start_date = (pd.Timestamp.now() - pd.DateOffset(years=2)).strftime('%Y-%m-%d')

            with get_db_connection() as conn:
                cursor = conn.cursor()

                # Fetch disease data
                disease_query = """
                    SELECT
                        p.startdate as date,
                        SUM(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as cases
                    FROM datavalue dv
                    JOIN dataelement de ON dv.dataelementid = de.dataelementid
                    JOIN period p ON dv.periodid = p.periodid
                    JOIN organisationunit ou ON dv.sourceid = ou.organisationunitid
                    WHERE dv.deleted = false
                    AND p.startdate >= %s
                    AND p.enddate <= %s
                    AND de.name ILIKE %s
                    AND ou.path LIKE '%%' || %s || '%%'
                    AND dv.value IS NOT NULL
                    AND p.startdate <= NOW()
                    GROUP BY p.startdate
                    ORDER BY p.startdate
                """

                cursor.execute(disease_query, (start_date, end_date, f"%{disease}%", location_uid))
                disease_data = cursor.fetchall()

                if not disease_data:
                    logger.warning(f"No disease data found for {disease} at {location_uid}")
                    cursor.close()
                    return None

                df_disease = pd.DataFrame(disease_data, columns=['date', 'cases'])
                df_disease['date'] = pd.to_datetime(df_disease['date'])
                # Convert cases to numeric
                df_disease['cases'] = pd.to_numeric(df_disease['cases'], errors='coerce').fillna(0)

                # Fetch climate data (aggregate daily data to weekly)
                climate_query = """
                    SELECT
                        DATE_TRUNC('week', date)::date as date,
                        AVG(temperature_mean)::float as avg_temperature,
                        SUM(precipitation)::float as rainfall,
                        AVG(humidity)::float as avg_humidity
                    FROM climate_data
                    WHERE location_uid = %s
                    AND date >= %s
                    AND date <= %s
                    GROUP BY DATE_TRUNC('week', date)
                    ORDER BY DATE_TRUNC('week', date)
                """

                cursor.execute(climate_query, (location_uid, start_date, end_date))
                climate_data = cursor.fetchall()
                cursor.close()

                if not climate_data:
                    logger.warning(f"No climate data found for location {location_uid}")
                    return None

                df_climate = pd.DataFrame(
                    climate_data,
                    columns=['date', 'avg_temperature', 'rainfall', 'avg_humidity']
                )
                df_climate['date'] = pd.to_datetime(df_climate['date'])

                # Convert all climate columns to float
                df_climate['avg_temperature'] = pd.to_numeric(df_climate['avg_temperature'], errors='coerce').fillna(0)
                df_climate['rainfall'] = pd.to_numeric(df_climate['rainfall'], errors='coerce').fillna(0)
                df_climate['avg_humidity'] = pd.to_numeric(df_climate['avg_humidity'], errors='coerce').fillna(0)

                # Merge disease and climate data
                merged = pd.merge(df_disease, df_climate, on='date', how='inner')

                # Remove any rows with missing values
                merged = merged.dropna()

                logger.info(f"Merged data: {len(merged)} records")

                return merged

        except Exception as e:
            logger.error(f"Error fetching merged data: {e}", exc_info=True)
            return None

    def _apply_lag(self, data: pd.DataFrame, lag_weeks: int) -> pd.DataFrame:
        """Apply lag to disease data relative to climate data"""
        if lag_weeks == 0:
            return data.copy()

        lagged_data = data.copy()

        if lag_weeks > 0:
            # Positive lag: disease cases occur AFTER climate conditions
            # Shift disease data forward (align with earlier climate data)
            lagged_data['cases'] = lagged_data['cases'].shift(lag_weeks)
        else:
            # Negative lag: disease cases occur BEFORE climate conditions
            # Shift disease data backward (align with later climate data)
            lagged_data['cases'] = lagged_data['cases'].shift(lag_weeks)

        # Remove rows with NaN values created by shifting
        lagged_data = lagged_data.dropna()

        return lagged_data

    def _calculate_correlation_metrics(
        self,
        x: pd.Series,
        y: pd.Series
    ) -> Dict:
        """Calculate correlation metrics between two variables"""
        try:
            # Remove any remaining NaN values
            mask = ~(np.isnan(x) | np.isnan(y))
            x_clean = x[mask]
            y_clean = y[mask]

            if len(x_clean) < 3:
                return {
                    'pearson': 0.0,
                    'spearman': 0.0,
                    'p_value': 1.0
                }

            # Pearson correlation (linear relationship)
            pearson_r, pearson_p = stats.pearsonr(x_clean, y_clean)

            # Spearman correlation (monotonic relationship)
            spearman_r, spearman_p = stats.spearmanr(x_clean, y_clean)

            return {
                'pearson': float(pearson_r),
                'spearman': float(spearman_r),
                'p_value': float(min(pearson_p, spearman_p))
            }

        except Exception as e:
            logger.error(f"Error calculating correlation metrics: {e}")
            return {
                'pearson': 0.0,
                'spearman': 0.0,
                'p_value': 1.0
            }

    def _calculate_composite_score(self, correlations: Dict) -> float:
        """
        Calculate composite correlation score (0-100) based on all climate variables.

        The score represents the overall strength of the relationship between
        weather conditions and disease cases.
        """
        if not correlations:
            return 0.0

        # Use absolute values to capture both positive and negative correlations
        scores = []
        for var_name, metrics in correlations.items():
            # Average of Pearson and Spearman correlations
            avg_corr = (abs(metrics['pearson']) + abs(metrics['spearman'])) / 2
            scores.append(avg_corr)

        # Calculate weighted average (equal weights for now)
        composite = np.mean(scores) * 100

        return float(composite)

    def _get_correlation_strength(self, score: float) -> str:
        """Determine correlation strength category"""
        if score >= 70:
            return 'Strong'
        elif score >= 50:
            return 'Moderate'
        elif score >= 30:
            return 'Weak'
        else:
            return 'Very Weak'

    def _calculate_significance(self, correlations: Dict, n: int) -> Dict:
        """Calculate overall statistical significance"""
        if not correlations:
            return {'is_significant': False, 'p_value': 1.0}

        # Get minimum p-value across all correlations
        p_values = [metrics['p_value'] for metrics in correlations.values()]
        min_p_value = min(p_values) if p_values else 1.0

        # Use Bonferroni correction for multiple comparisons
        alpha = 0.05
        corrected_alpha = alpha / len(p_values) if p_values else alpha

        return {
            'is_significant': min_p_value < corrected_alpha,
            'p_value': float(min_p_value)
        }

    def _generate_interpretation(
        self,
        score: float,
        strength: str,
        lag_weeks: int,
        correlations: Dict
    ) -> str:
        """Generate human-readable interpretation of the ML impact analysis"""

        lag_desc = ""
        if lag_weeks == 0:
            lag_desc = "with simultaneous timing"
        elif lag_weeks > 0:
            lag_desc = f"{lag_weeks} week{'s' if lag_weeks > 1 else ''} after climate conditions"
        else:
            lag_desc = f"preceding climate patterns by {abs(lag_weeks)} week{'s' if abs(lag_weeks) > 1 else ''}"

        # Identify the dominant climate factor
        if correlations:
            strongest_var = max(
                correlations.items(),
                key=lambda x: (abs(x[1]['pearson']) + abs(x[1]['spearman'])) / 2
            )[0]

            interpretation = (
                f"{strength} climate-disease linkage identified ({score:.1f}/100). "
                f"ML model indicates {strongest_var} as the dominant driver "
                f"{lag_desc}."
            )
        else:
            interpretation = f"{strength} climate-disease linkage identified ({score:.1f}/100) {lag_desc}."

        return interpretation


# Create singleton instance
correlation_analyzer = CorrelationAnalyzer()
