"""Database utilities for ML service"""
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from loguru import logger
import config

@contextmanager
def get_db_connection():
    """Get a database connection as a context manager"""
    conn = None
    try:
        # Connect to PostgreSQL
        if config.POSTGRES_USER:
            conn = psycopg2.connect(
                host=config.POSTGRES_HOST,
                port=config.POSTGRES_PORT,
                database=config.POSTGRES_DB,
                user=config.POSTGRES_USER,
                password=config.POSTGRES_PASSWORD
            )
        else:
            # Use peer authentication
            conn = psycopg2.connect(
                host=config.POSTGRES_HOST,
                port=config.POSTGRES_PORT,
                database=config.POSTGRES_DB
            )

        yield conn
        conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        if conn:
            conn.close()

def fetch_disease_timeseries(disease: str, location_uid: str, start_date: str = None, end_date: str = None):
    """Fetch disease time series data from DHIS2"""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Get disease UID
        disease_uid = config.DISEASE_UIDS.get(disease)
        if not disease_uid:
            logger.warning(f"Unknown disease: {disease}")
            return []

        query = """
            SELECT
                DATE_TRUNC('week', p.startdate) as week,
                p.startdate,
                p.enddate,
                SUM(CAST(dv.value AS INTEGER)) as cases,
                COUNT(DISTINCT dv.sourceid) as facilities_reporting
            FROM datavalue dv
            JOIN dataelement de ON dv.dataelementid = de.dataelementid
            JOIN period p ON dv.periodid = p.periodid
            JOIN organisationunit ou ON dv.sourceid = ou.organisationunitid
            WHERE dv.deleted = false
                AND de.uid = %(disease_uid)s
                AND dv.value ~ '^[0-9]+$'
        """

        params = {'disease_uid': disease_uid}

        # Add location filter (including child organization units)
        if location_uid and location_uid != config.SIERRA_LEONE_UID:
            query += """
                AND EXISTS (
                    SELECT 1 FROM organisationunit parent
                    WHERE parent.uid = %(location_uid)s
                    AND ou.path LIKE parent.path || '%%'
                )
            """
            params['location_uid'] = location_uid

        # Add date filters
        if start_date:
            query += " AND p.startdate >= %(start_date)s::date"
            params['start_date'] = start_date

        if end_date:
            query += " AND p.enddate <= %(end_date)s::date"
            params['end_date'] = end_date

        query += """
            GROUP BY week, p.startdate, p.enddate
            ORDER BY week
        """

        try:
            cursor.execute(query, params)
            columns = [desc[0] for desc in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            logger.info(f"Fetched {len(results)} disease time series records for disease")
            cursor.close()
            return results
        except Exception as e:
            logger.error(f"Error executing disease query: {e}")
            logger.error(f"Query params: {params}")
            if cursor:
                cursor.close()
            raise

def fetch_climate_data(location_uid: str, start_date: str = None, end_date: str = None):
    """Fetch climate data for a location"""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        query = """
            SELECT
                DATE_TRUNC('week', date) as week,
                location_uid,
                AVG(temperature_mean) as avg_temperature,
                MIN(temperature_min) as min_temperature,
                MAX(temperature_max) as max_temperature,
                SUM(precipitation) as total_precipitation,
                AVG(humidity) as avg_humidity,
                AVG(wind_speed) as avg_wind_speed,
                COUNT(*) as days_count
            FROM climate_data
            WHERE location_uid = %(location_uid)s
        """

        params = {'location_uid': location_uid}

        if start_date:
            query += " AND date >= %(start_date)s::date"
            params['start_date'] = start_date

        if end_date:
            query += " AND date <= %(end_date)s::date"
            params['end_date'] = end_date

        query += """
            GROUP BY week, location_uid
            ORDER BY week
        """

        try:
            cursor.execute(query, params)
            columns = [desc[0] for desc in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            logger.info(f"Fetched {len(results)} climate records")
            cursor.close()
            return results
        except Exception as e:
            logger.error(f"Error executing climate query: {e}")
            logger.error(f"Query params: {params}")
            if cursor:
                cursor.close()
            # Return empty list if climate data not available
            return []

def save_forecast(forecast_data: dict):
    """Save forecast to database"""
    import json

    with get_db_connection() as conn:
        cursor = conn.cursor()

        query = """
            INSERT INTO forecasts (
                disease, location_uid, forecast_date, target_date,
                predicted_cases, lower_bound, upper_bound,
                confidence, risk_level, risk_score,
                model_version, contributing_factors
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (disease, location_uid, forecast_date, target_date)
            DO UPDATE SET
                predicted_cases = EXCLUDED.predicted_cases,
                lower_bound = EXCLUDED.lower_bound,
                upper_bound = EXCLUDED.upper_bound,
                confidence = EXCLUDED.confidence,
                risk_level = EXCLUDED.risk_level,
                risk_score = EXCLUDED.risk_score,
                model_version = EXCLUDED.model_version,
                contributing_factors = EXCLUDED.contributing_factors,
                updated_at = NOW()
        """

        # Convert contributing_factors to JSON string
        contributing_factors_json = json.dumps(forecast_data.get('contributing_factors')) if forecast_data.get('contributing_factors') else None

        cursor.execute(query, (
            forecast_data['disease'],
            forecast_data['location_uid'],
            forecast_data['forecast_date'],
            forecast_data['target_date'],
            forecast_data['predicted_cases'],
            forecast_data['lower_bound'],
            forecast_data['upper_bound'],
            forecast_data['confidence'],
            forecast_data['risk_level'],
            forecast_data['risk_score'],
            forecast_data['model_version'],
            contributing_factors_json
        ))

        cursor.close()

def save_model_performance(performance_data: dict):
    """Save model performance metrics to database"""
    import json

    with get_db_connection() as conn:
        cursor = conn.cursor()

        query = """
            INSERT INTO model_performance (
                disease, location_uid, model_type, model_version,
                evaluation_date, mae, rmse, mape, r_squared,
                training_data_size, test_data_size, metrics
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        # Convert metrics dict to JSON string
        metrics_json = json.dumps(performance_data.get('metrics')) if performance_data.get('metrics') else None

        cursor.execute(query, (
            performance_data['disease'],
            performance_data['location_uid'],
            performance_data['model_type'],
            performance_data['model_version'],
            performance_data['evaluation_date'],
            performance_data.get('mae'),
            performance_data.get('rmse'),
            performance_data.get('mape'),
            performance_data.get('r_squared'),
            performance_data.get('training_data_size'),
            performance_data.get('test_data_size'),
            metrics_json
        ))

        cursor.close()
