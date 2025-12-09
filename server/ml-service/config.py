"""Configuration for ML service"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration (must be set in .env file)
POSTGRES_HOST = os.getenv('POSTGRES_HOST', 'localhost')
POSTGRES_PORT = int(os.getenv('POSTGRES_PORT', '5432'))
POSTGRES_DB = os.getenv('POSTGRES_DB')
POSTGRES_USER = os.getenv('POSTGRES_USER')
POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD')

# Validate required database configuration
if not POSTGRES_DB:
    raise ValueError("POSTGRES_DB environment variable is required")
if not POSTGRES_USER:
    raise ValueError("POSTGRES_USER environment variable is required")
if not POSTGRES_PASSWORD:
    raise ValueError("POSTGRES_PASSWORD environment variable is required")

# Service configuration
ML_SERVICE_PORT = int(os.getenv('ML_SERVICE_PORT', '8000'))
ML_SERVICE_HOST = os.getenv('ML_SERVICE_HOST', '0.0.0.0')
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')

# Model configuration
MODEL_SAVE_DIR = Path(os.getenv('MODEL_SAVE_DIR', './models'))
MODEL_SAVE_DIR.mkdir(exist_ok=True, parents=True)

TRAINING_DATA_MIN_POINTS = int(os.getenv('TRAINING_DATA_MIN_POINTS', '12'))  # Minimum 3 months of weekly data
FORECAST_HORIZON = int(os.getenv('FORECAST_HORIZON', '4'))
ENSEMBLE_SARIMA_WEIGHT = float(os.getenv('ENSEMBLE_SARIMA_WEIGHT', '0.6'))
ENSEMBLE_XGBOOST_WEIGHT = float(os.getenv('ENSEMBLE_XGBOOST_WEIGHT', '0.4'))

# Database connection string
DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
if not POSTGRES_USER:
    # Use peer authentication
    DATABASE_URL = f"postgresql://{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

# Disease mappings (actual UIDs from DHIS2 database with most data)
DISEASE_UIDS = {
    'Malaria': 'wZwzzRnr9N4',  # Rapid diagnostic test for Malaria positive (67k records)
    'Measles': 'YtbsuPPo010',  # Measles doses given (48k records)
    'Typhoid': 'Cj5rTc9nEvl',  # Keep original (no data found)
    'Yellow Fever': 'l6byfWFUGaP',  # Yellow Fever doses given (48k records)
    'Cholera': 'UsSUX0cpKsH',  # Keep original (no data found)
    'Lassa Fever': 'NCteyX2xpMf'  # Keep original (no data found)
}

# Sierra Leone country UID
SIERRA_LEONE_UID = 'ImspTQPwCqd'
