"""
Time Series Anomaly Detection for Disease Surveillance

Detects anomalies using Isolation Forest algorithm:
- Machine learning-based approach to identify outliers in time series data
- Works well with multivariate data (cases, location, temporal features)
- Provides anomaly scores and flags unusual disease patterns

Returns time series data with anomaly markers for visualization.
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from loguru import logger
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from database import get_db_connection


class AnomalyDetector:
    """Time series anomaly detection using Isolation Forest for disease surveillance"""

    def __init__(self, contamination: float = 0.1, random_state: int = 42):
        """
        Initialize the Anomaly Detector with Isolation Forest

        Args:
            contamination: Expected proportion of outliers in the dataset (default 0.1 = 10%)
            random_state: Random seed for reproducibility
        """
        self.contamination = contamination
        self.random_state = random_state
        self.model = None
        self.scaler = StandardScaler()

    def detect_anomalies(
        self,
        disease: str,
        start_date: str = None,
        end_date: str = None,
        level: int = 2,
        location_uid: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Detect anomalies in disease case time series using Isolation Forest

        Args:
            disease: Disease name (e.g., 'Malaria', 'Measles')
            start_date: Start date for analysis (YYYY-MM-DD), defaults to 6 months ago
            end_date: End date for analysis (YYYY-MM-DD), defaults to today
            level: Administrative level (2=District, 3=Chiefdom, 4=Facility)
            location_uid: Specific location UID to analyze (optional)

        Returns:
            Dictionary containing:
            - time_series: Time series data for all locations with anomaly scores
            - thresholds: Statistical thresholds for reference
            - anomalies: List of detected anomalies
            - summary: Overall statistics
        """
        try:
            logger.info(f"Detecting anomalies using Isolation Forest for {disease} at level {level}")

            # Set default date range (last 6 months)
            if not end_date:
                end_date = datetime.now().strftime('%Y-%m-%d')
            if not start_date:
                start_date = (datetime.now() - timedelta(days=180)).strftime('%Y-%m-%d')

            # Fetch time series data
            data = self._fetch_time_series_data(disease, level, start_date, end_date, location_uid)

            if not data or len(data) < 10:
                logger.warning(f"Insufficient data for anomaly detection: {len(data) if data else 0} records")
                return self._empty_response()

            # Convert to DataFrame
            df = pd.DataFrame(data)
            df['period'] = pd.to_datetime(df['period'])
            df['cases'] = df['cases'].astype(float)  # Convert Decimal to float
            df = df.sort_values(['location_name', 'period'])

            # Engineer features for Isolation Forest
            df = self._engineer_features(df)

            # Prepare features for Isolation Forest
            feature_cols = ['cases', 'day_of_week', 'day_of_month', 'month', 'rolling_mean_7', 'rolling_std_7', 'cases_diff']
            X = df[feature_cols].fillna(0)

            # Train Isolation Forest
            self.model = IsolationForest(
                contamination=self.contamination,
                random_state=self.random_state,
                n_estimators=100,
                max_samples='auto',
                max_features=1.0,
                bootstrap=False,
                n_jobs=-1
            )

            # Scale features
            X_scaled = self.scaler.fit_transform(X)

            # Predict anomalies (-1 for anomaly, 1 for normal)
            df['anomaly_prediction'] = self.model.fit_predict(X_scaled)
            df['anomaly_score'] = -self.model.score_samples(X_scaled)  # Negative score for anomalies
            df['is_anomaly'] = df['anomaly_prediction'] == -1

            # Calculate statistical thresholds for reference
            all_cases = df['cases'].values
            thresholds = self._calculate_thresholds(all_cases)

            # Build time series data
            time_series_data = []
            all_anomalies = []

            for _, row in df.iterrows():
                time_series_data.append({
                    'date': row['period'].strftime('%Y-%m-%d'),
                    'location_name': row['location_name'],
                    'location_uid': row['location_uid'],
                    'cases': float(row['cases']),
                    'moving_average': float(row['rolling_mean_7']),
                    'is_anomaly': bool(row['is_anomaly']),
                    'anomaly_score': float(row['anomaly_score']),
                    'z_score': float((row['cases'] - df['cases'].mean()) / (df['cases'].std() + 1e-10))
                })

                # Collect anomalies
                if row['is_anomaly']:
                    all_anomalies.append({
                        'date': row['period'].strftime('%Y-%m-%d'),
                        'location_name': row['location_name'],
                        'location_uid': row['location_uid'],
                        'cases': float(row['cases']),
                        'anomaly_score': float(row['anomaly_score']),
                        'z_score': float((row['cases'] - df['cases'].mean()) / (df['cases'].std() + 1e-10)),
                        'severity': self._classify_severity_by_score(row['anomaly_score'])
                    })

            # Sort anomalies by anomaly score (highest first)
            all_anomalies = sorted(all_anomalies, key=lambda x: x['anomaly_score'], reverse=True)

            # Calculate summary statistics
            summary = {
                'total_periods': len(df),
                'total_anomalies': len(all_anomalies),
                'anomaly_rate': len(all_anomalies) / len(df) if len(df) > 0 else 0,
                'locations_analyzed': df['location_name'].nunique(),
                'date_range': {
                    'start': start_date,
                    'end': end_date
                },
                'total_cases': int(df['cases'].sum()),
                'avg_cases_per_period': float(df['cases'].mean()),
                'max_cases': float(df['cases'].max()),
                'model': 'Isolation Forest',
                'contamination': self.contamination
            }

            logger.info(f"Detected {len(all_anomalies)} anomalies using Isolation Forest across {summary['locations_analyzed']} locations")

            return {
                'success': True,
                'time_series': time_series_data,
                'thresholds': thresholds,
                'anomalies': all_anomalies[:50],  # Limit to top 50 anomalies
                'summary': summary
            }

        except Exception as e:
            logger.error(f"Error in anomaly detection: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'time_series': [],
                'thresholds': {},
                'anomalies': [],
                'summary': {}
            }

    def _engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Engineer temporal and statistical features for Isolation Forest

        Args:
            df: Input dataframe with 'period' and 'cases' columns

        Returns:
            DataFrame with additional feature columns
        """
        # Temporal features
        df['day_of_week'] = df['period'].dt.dayofweek
        df['day_of_month'] = df['period'].dt.day
        df['month'] = df['period'].dt.month
        df['week_of_year'] = df['period'].dt.isocalendar().week

        # Rolling statistics (per location)
        for location in df['location_name'].unique():
            mask = df['location_name'] == location
            df.loc[mask, 'rolling_mean_7'] = df.loc[mask, 'cases'].rolling(window=7, min_periods=1).mean()
            df.loc[mask, 'rolling_std_7'] = df.loc[mask, 'cases'].rolling(window=7, min_periods=1).std()
            df.loc[mask, 'cases_diff'] = df.loc[mask, 'cases'].diff()

        # Fill NaN values
        df['rolling_std_7'] = df['rolling_std_7'].fillna(0)
        df['cases_diff'] = df['cases_diff'].fillna(0)

        return df

    def _fetch_time_series_data(
        self,
        disease: str,
        level: int,
        start_date: str,
        end_date: str,
        location_uid: Optional[str] = None
    ) -> List[Dict]:
        """Fetch time series data aggregated by location and period"""
        try:
            # Query aggregates facility-level data up to district level
            # Using path-based hierarchy navigation
            # IMPORTANT: Filter by valuetype to exclude TEXT/LONG_TEXT data elements
            query = """
                SELECT
                    p.startdate::date as period,
                    district.uid as location_uid,
                    district.name as location_name,
                    SUM(COALESCE(dv.value::numeric, 0)) as cases
                FROM datavalue dv
                JOIN dataelement de ON dv.dataelementid = de.dataelementid
                JOIN organisationunit facility ON dv.sourceid = facility.organisationunitid
                JOIN period p ON dv.periodid = p.periodid
                JOIN organisationunit district ON (
                    district.hierarchylevel = %s AND
                    facility.path LIKE '%%' || district.uid || '%%'
                )
                WHERE de.name ILIKE %s
                AND de.valuetype IN ('NUMBER', 'INTEGER', 'INTEGER_ZERO_OR_POSITIVE', 'INTEGER_POSITIVE', 'INTEGER_NEGATIVE')
                AND dv.deleted = false
                AND dv.value ~ '^[0-9]+$'
                AND p.startdate >= %s::date
                AND p.startdate <= %s::date
            """

            params = [level, f"%{disease}%", start_date, end_date]

            if location_uid:
                query += " AND district.uid = %s"
                params.append(location_uid)

            query += """
                GROUP BY p.startdate, district.uid, district.name
                HAVING SUM(COALESCE(dv.value::numeric, 0)) > 0
                ORDER BY p.startdate, district.name
            """

            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, params)
                    columns = [desc[0] for desc in cur.description]
                    results = [dict(zip(columns, row)) for row in cur.fetchall()]

            logger.info(f"Fetched {len(results)} time series data points")
            return results

        except Exception as e:
            logger.error(f"Error fetching time series data: {e}", exc_info=True)
            return []

    def _calculate_thresholds(self, data: np.ndarray) -> Dict[str, float]:
        """Calculate various threshold values for anomaly detection"""
        if len(data) == 0:
            return {
                'mean': 0,
                'std': 0,
                'upper_zscore': 0,
                'lower_zscore': 0,
                'q1': 0,
                'q3': 0,
                'iqr': 0,
                'upper_iqr': 0,
                'lower_iqr': 0,
                'median': 0,
                'percentile_95': 0
            }

        mean = float(np.mean(data))
        std = float(np.std(data))
        q1 = float(np.percentile(data, 25))
        q3 = float(np.percentile(data, 75))
        iqr = q3 - q1
        median = float(np.median(data))
        p95 = float(np.percentile(data, 95))

        # Use standard thresholds for reference (not used in Isolation Forest detection)
        z_threshold = 2.5
        iqr_multiplier = 1.5

        return {
            'mean': mean,
            'std': std,
            'upper_zscore': mean + (z_threshold * std),
            'lower_zscore': max(0, mean - (z_threshold * std)),
            'q1': q1,
            'q3': q3,
            'iqr': iqr,
            'upper_iqr': q3 + (iqr_multiplier * iqr),
            'lower_iqr': max(0, q1 - (iqr_multiplier * iqr)),
            'median': median,
            'percentile_95': p95
        }

    def _classify_severity(self, z_score: float) -> str:
        """Classify anomaly severity based on Z-score"""
        if z_score >= 3.0:
            return "High"
        elif z_score >= 2.5:
            return "Medium"
        else:
            return "Low"

    def _classify_severity_by_score(self, anomaly_score: float) -> str:
        """
        Classify anomaly severity based on Isolation Forest anomaly score
        Higher scores indicate more anomalous behavior
        """
        if anomaly_score >= 0.6:
            return "High"
        elif anomaly_score >= 0.4:
            return "Medium"
        else:
            return "Low"

    def _empty_response(self) -> Dict[str, Any]:
        """Return empty response structure"""
        return {
            'success': True,
            'time_series': [],
            'thresholds': {},
            'anomalies': [],
            'summary': {
                'total_periods': 0,
                'total_anomalies': 0,
                'anomaly_rate': 0,
                'locations_analyzed': 0
            }
        }


# Example usage
if __name__ == "__main__":
    detector = AnomalyDetector(contamination=0.1)
    results = detector.detect_anomalies(disease="Malaria", level=2)

    print(f"Analyzed {results['summary']['total_periods']} periods")
    print(f"Found {results['summary']['total_anomalies']} anomalies")
    print(f"Anomaly rate: {results['summary']['anomaly_rate']:.2%}")

    if results['anomalies']:
        print("\nRecent Anomalies:")
        for anomaly in results['anomalies'][:5]:
            print(f"  - {anomaly['date']}: {anomaly['location_name']} - {anomaly['cases']} cases ({anomaly['severity']} severity)")
