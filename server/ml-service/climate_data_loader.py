"""
Climate Data Loader for ML Modeling
Provides easy access to climate data for training and inference
"""

import os
import pandas as pd
import numpy as np
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
from datetime import datetime, timedelta
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)

# Database configuration
DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': os.getenv('POSTGRES_PORT', '5432'),
    'database': os.getenv('POSTGRES_DB', 'dhis2SierraLeoneDemo'),
    'user': os.getenv('POSTGRES_USER'),
    'password': os.getenv('POSTGRES_PASSWORD')
}


class ClimateDataLoader:
    """
    Load and prepare climate data for ML modeling
    """

    def __init__(self):
        """Initialize the climate data loader"""
        self.conn = None
        self.district_mapping = None

    def connect(self):
        """Establish database connection"""
        if not self.conn or self.conn.closed:
            self.conn = psycopg2.connect(**DB_CONFIG)
        return self.conn

    def close(self):
        """Close database connection"""
        if self.conn and not self.conn.closed:
            self.conn.close()

    def get_district_mapping(self):
        """
        Get mapping of district UIDs to names

        Returns:
            DataFrame with district information
        """
        if self.district_mapping is not None:
            return self.district_mapping

        conn = self.connect()

        query = """
            SELECT
                uid,
                name,
                hierarchylevel,
                ST_Y(ST_Centroid(geometry)) as latitude,
                ST_X(ST_Centroid(geometry)) as longitude
            FROM organisationunit
            WHERE hierarchylevel = 2
            ORDER BY name
        """

        self.district_mapping = pd.read_sql(query, conn)
        return self.district_mapping

    def load_climate_data(self, start_date=None, end_date=None, location_uids=None):
        """
        Load climate data from database

        Args:
            start_date: Start date (YYYY-MM-DD) or None for all
            end_date: End date (YYYY-MM-DD) or None for all
            location_uids: List of location UIDs or None for all districts

        Returns:
            DataFrame with climate data
        """
        conn = self.connect()

        # Build query
        query = """
            SELECT
                cd.location_uid,
                cd.date,
                cd.temperature_mean,
                cd.temperature_min,
                cd.temperature_max,
                cd.precipitation,
                cd.humidity,
                cd.wind_speed,
                cd.source,
                ou.name as location_name
            FROM climate_data cd
            LEFT JOIN organisationunit ou ON cd.location_uid = ou.uid
            WHERE cd.source = 'ERA5'
        """

        params = []

        if start_date:
            query += " AND cd.date >= %s"
            params.append(start_date)

        if end_date:
            query += " AND cd.date <= %s"
            params.append(end_date)

        if location_uids:
            placeholders = ','.join(['%s'] * len(location_uids))
            query += f" AND cd.location_uid IN ({placeholders})"
            params.extend(location_uids)

        query += " ORDER BY cd.location_uid, cd.date"

        df = pd.read_sql(query, conn, params=params if params else None)

        # Convert date to datetime
        df['date'] = pd.to_datetime(df['date'])

        # Convert numeric columns to float
        numeric_cols = [
            'temperature_mean', 'temperature_min', 'temperature_max',
            'precipitation', 'humidity', 'wind_speed'
        ]
        for col in numeric_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce')

        logger.info(f"Loaded {len(df)} climate records")

        return df

    def load_disease_data(self, disease_name, start_date=None, end_date=None, location_uids=None):
        """
        Load disease case data from database

        Args:
            disease_name: Name of disease (e.g., 'Malaria', 'Cholera')
            start_date: Start date (YYYY-MM-DD) or None for all
            end_date: End date (YYYY-MM-DD) or None for all
            location_uids: List of location UIDs or None for all districts

        Returns:
            DataFrame with disease data
        """
        conn = self.connect()

        # Build query to find disease data element
        query = """
            SELECT
                dv.dataelementid,
                de.name as disease_name,
                dv.sourceid,
                dv.periodid,
                dv.value,
                ou.uid as location_uid,
                ou.name as location_name,
                pe.startdate,
                pe.enddate
            FROM datavalue dv
            JOIN dataelement de ON dv.dataelementid = de.dataelementid
            JOIN organisationunit ou ON dv.sourceid = ou.organisationunitid
            JOIN period pe ON dv.periodid = pe.periodid
            WHERE de.name ILIKE %s
        """

        params = [f'%{disease_name}%']

        if start_date:
            query += " AND pe.startdate >= %s"
            params.append(start_date)

        if end_date:
            query += " AND pe.enddate <= %s"
            params.append(end_date)

        if location_uids:
            placeholders = ','.join(['%s'] * len(location_uids))
            query += f" AND ou.uid IN ({placeholders})"
            params.extend(location_uids)

        query += " ORDER BY ou.uid, pe.startdate"

        df = pd.read_sql(query, conn, params=params)

        # Convert dates to datetime
        df['startdate'] = pd.to_datetime(df['startdate'])
        df['enddate'] = pd.to_datetime(df['enddate'])

        # Convert value to numeric
        df['value'] = pd.to_numeric(df['value'], errors='coerce')

        logger.info(f"Loaded {len(df)} disease records for {disease_name}")

        return df

    def merge_climate_disease_data(
        self,
        disease_name,
        start_date=None,
        end_date=None,
        location_uids=None,
        lag_days=0
    ):
        """
        Merge climate and disease data for ML modeling

        Args:
            disease_name: Name of disease
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            location_uids: List of location UIDs
            lag_days: Number of days to lag climate data (for predictive modeling)

        Returns:
            DataFrame with merged climate and disease data
        """
        # Load climate data
        climate_df = self.load_climate_data(start_date, end_date, location_uids)

        # Load disease data
        disease_df = self.load_disease_data(disease_name, start_date, end_date, location_uids)

        if climate_df.empty:
            logger.warning("No climate data found")
            return pd.DataFrame()

        if disease_df.empty:
            logger.warning(f"No disease data found for {disease_name}")
            return pd.DataFrame()

        # Apply lag to climate data if specified
        if lag_days > 0:
            climate_df['date'] = climate_df['date'] + pd.Timedelta(days=lag_days)

        # Merge on location and date
        # For disease data, use startdate as the date
        disease_df['date'] = disease_df['startdate']

        merged_df = pd.merge(
            climate_df,
            disease_df[['location_uid', 'date', 'disease_name', 'value']],
            on=['location_uid', 'date'],
            how='left'
        )

        # Rename value to cases
        merged_df = merged_df.rename(columns={'value': 'cases'})

        # Fill NaN cases with 0
        merged_df['cases'] = merged_df['cases'].fillna(0)

        logger.info(f"Merged data: {len(merged_df)} rows")

        return merged_df

    def get_climate_features_for_date_range(
        self,
        location_uid,
        start_date,
        end_date,
        aggregation='mean'
    ):
        """
        Get aggregated climate features for a date range

        Args:
            location_uid: District UID
            start_date: Start date
            end_date: End date
            aggregation: Aggregation method ('mean', 'sum', 'min', 'max')

        Returns:
            Dictionary of aggregated climate features
        """
        df = self.load_climate_data(start_date, end_date, [location_uid])

        if df.empty:
            return None

        features = {}

        if aggregation == 'mean':
            features['avg_temperature'] = df['temperature_mean'].mean()
            features['avg_humidity'] = df['humidity'].mean()
            features['avg_wind_speed'] = df['wind_speed'].mean()
            features['total_precipitation'] = df['precipitation'].sum()
        elif aggregation == 'sum':
            features['total_precipitation'] = df['precipitation'].sum()
        elif aggregation == 'min':
            features['min_temperature'] = df['temperature_min'].min()
        elif aggregation == 'max':
            features['max_temperature'] = df['temperature_max'].max()
            features['max_precipitation'] = df['precipitation'].max()

        features['num_days'] = len(df)

        return features

    def create_time_series_features(self, df, window_sizes=[7, 14, 30]):
        """
        Create rolling window features for time series modeling

        Args:
            df: DataFrame with climate data (must have 'date' column)
            window_sizes: List of window sizes in days

        Returns:
            DataFrame with added rolling features
        """
        df = df.sort_values('date').copy()

        for window in window_sizes:
            # Rolling mean features
            df[f'temp_mean_{window}d'] = df['temperature_mean'].rolling(window).mean()
            df[f'precip_sum_{window}d'] = df['precipitation'].rolling(window).sum()
            df[f'humidity_mean_{window}d'] = df['humidity'].rolling(window).mean()

            # Rolling std features (volatility)
            df[f'temp_std_{window}d'] = df['temperature_mean'].rolling(window).std()

        # Drop rows with NaN (from rolling windows)
        df = df.dropna()

        return df

    def export_to_csv(self, df, output_path):
        """
        Export DataFrame to CSV for external use

        Args:
            df: DataFrame to export
            output_path: Path to save CSV file
        """
        df.to_csv(output_path, index=False)
        logger.info(f"Exported {len(df)} rows to {output_path}")

    def __enter__(self):
        """Context manager entry"""
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()


# Convenience functions
def load_climate_data(start_date=None, end_date=None, location_uids=None):
    """
    Quick function to load climate data

    Args:
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        location_uids: List of location UIDs

    Returns:
        DataFrame with climate data
    """
    with ClimateDataLoader() as loader:
        return loader.load_climate_data(start_date, end_date, location_uids)


def get_districts():
    """
    Get list of districts

    Returns:
        DataFrame with district information
    """
    with ClimateDataLoader() as loader:
        return loader.get_district_mapping()


if __name__ == '__main__':
    # Example usage
    print("Climate Data Loader - Example Usage")
    print("=" * 60)

    # Load district information
    with ClimateDataLoader() as loader:
        districts = loader.get_district_mapping()
        print(f"\nFound {len(districts)} districts:")
        print(districts[['uid', 'name']].to_string(index=False))

        # Load climate data for one district
        bo_uid = 'O6uvpzGd5pu'
        print(f"\nLoading climate data for Bo district...")
        climate_data = loader.load_climate_data(
            start_date='2024-01-01',
            end_date='2024-01-31',
            location_uids=[bo_uid]
        )

        print(f"\nSample data (first 5 rows):")
        print(climate_data.head().to_string(index=False))

        print(f"\nData summary:")
        print(climate_data[['temperature_mean', 'precipitation', 'humidity']].describe())
