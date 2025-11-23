"""FastAPI application for disease forecasting ML service"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from loguru import logger
import sys

from forecast_service import ForecastService
from anomaly_detection import AnomalyDetector
from correlation_analysis import correlation_analyzer
import config

# Configure logging
logger.remove()
logger.add(
    sys.stdout,
    level=config.LOG_LEVEL,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>"
)

# Initialize FastAPI app
app = FastAPI(
    title="Disease Forecasting ML Service",
    description="Machine learning service for disease outbreak prediction using SARIMA and XGBoost ensemble",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize forecast service and anomaly detector
forecast_service = ForecastService()
anomaly_detector = AnomalyDetector(contamination=0.1, random_state=42)

# Request/Response models
class TrainRequest(BaseModel):
    disease: str = Field(..., description="Disease name (e.g., 'Malaria', 'Measles')")
    location_uid: str = Field(..., description="DHIS2 organization unit UID")
    start_date: Optional[str] = Field(None, description="Training data start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="Training data end date (YYYY-MM-DD)")

class ForecastRequest(BaseModel):
    disease: str = Field(..., description="Disease name")
    location_uid: str = Field(..., description="DHIS2 organization unit UID")
    horizon: int = Field(4, description="Number of weeks to forecast", ge=1, le=12)
    auto_train: bool = Field(True, description="Automatically train if model doesn't exist")
    force_retrain: bool = Field(True, description="Force retrain model with latest data")

class BatchForecastRequest(BaseModel):
    diseases: List[str] = Field(..., description="List of disease names")
    location_uids: List[str] = Field(..., description="List of location UIDs")
    horizon: int = Field(4, description="Number of weeks to forecast")

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    timestamp: str

class AnomalyRequest(BaseModel):
    disease: str = Field(..., description="Disease name (e.g., 'Malaria', 'Measles')")
    start_date: Optional[str] = Field(None, description="Start date for analysis (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date for analysis (YYYY-MM-DD)")
    level: int = Field(2, description="Administrative level (2=District, 3=Chiefdom, 4=Facility)", ge=2, le=4)

class CorrelationRequest(BaseModel):
    disease: str = Field(..., description="Disease name (e.g., 'Malaria', 'Measles')")
    location_uid: str = Field(..., description="DHIS2 organization unit UID")
    lag_weeks: int = Field(0, description="Lag period in weeks (positive = disease after climate, negative = disease before)", ge=-12, le=12)
    start_date: Optional[str] = Field(None, description="Start date for analysis (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date for analysis (YYYY-MM-DD)")

# API Endpoints

@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint - service health check"""
    return {
        "status": "healthy",
        "service": "Disease Forecasting ML Service",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Disease Forecasting ML Service",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/train")
async def train_model(request: TrainRequest, background_tasks: BackgroundTasks):
    """
    Train forecasting model for a disease and location

    This endpoint trains both SARIMA and XGBoost models on historical data
    and saves the models for future forecasting.
    """
    try:
        logger.info(f"Received training request for {request.disease} in {request.location_uid}")

        result = forecast_service.train_model(
            disease=request.disease,
            location_uid=request.location_uid,
            start_date=request.start_date,
            end_date=request.end_date
        )

        if result['success']:
            return {
                "success": True,
                "message": f"Model trained successfully for {request.disease}",
                "data": result
            }
        else:
            raise HTTPException(status_code=400, detail=result.get('error', 'Training failed'))

    except Exception as e:
        logger.error(f"Error in train endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/forecast")
async def generate_forecast(request: ForecastRequest):
    """
    Generate disease forecast

    Generates forecasts using ensemble of SARIMA and XGBoost models.
    Returns predicted cases with confidence intervals and risk levels.

    Set force_retrain=true to retrain model with latest data (slower).
    Otherwise, uses cached/saved model (faster).
    """
    try:
        logger.info(f"Received forecast request for {request.disease} in {request.location_uid} (force_retrain={request.force_retrain})")

        result = forecast_service.generate_forecast(
            disease=request.disease,
            location_uid=request.location_uid,
            horizon=request.horizon,
            auto_train=request.auto_train,
            force_retrain=request.force_retrain
        )

        if result['success']:
            return {
                "success": True,
                "data": result
            }
        else:
            raise HTTPException(status_code=400, detail=result.get('error', 'Forecast generation failed'))

    except Exception as e:
        logger.error(f"Error in forecast endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/forecast/{disease}/{location_uid}")
async def get_forecast(
    disease: str,
    location_uid: str,
    horizon: int = 4,
    force_retrain: bool = True
):
    """
    Get forecast for disease and location (GET method)

    Alternative endpoint using GET method for easier integration.

    Use ?force_retrain=true to retrain model with latest data.
    """
    try:
        result = forecast_service.generate_forecast(
            disease=disease,
            location_uid=location_uid,
            horizon=horizon,
            auto_train=True,
            force_retrain=force_retrain
        )

        if result['success']:
            return {
                "success": True,
                "data": result
            }
        else:
            raise HTTPException(status_code=400, detail=result.get('error', 'Forecast generation failed'))

    except Exception as e:
        logger.error(f"Error in get forecast endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/forecast/batch")
async def batch_forecast(request: BatchForecastRequest, background_tasks: BackgroundTasks):
    """
    Generate forecasts for multiple diseases and locations

    Useful for generating forecasts for all districts or all diseases at once.
    """
    try:
        logger.info(f"Received batch forecast request for {len(request.diseases)} diseases and {len(request.location_uids)} locations")

        results = []

        for disease in request.diseases:
            for location_uid in request.location_uids:
                try:
                    result = forecast_service.generate_forecast(
                        disease=disease,
                        location_uid=location_uid,
                        horizon=request.horizon,
                        auto_train=True
                    )
                    results.append({
                        'disease': disease,
                        'location_uid': location_uid,
                        'success': result['success'],
                        'data': result if result['success'] else None,
                        'error': result.get('error')
                    })
                except Exception as e:
                    logger.error(f"Error forecasting {disease} in {location_uid}: {e}")
                    results.append({
                        'disease': disease,
                        'location_uid': location_uid,
                        'success': False,
                        'error': str(e)
                    })

        successful = sum(1 for r in results if r['success'])
        failed = len(results) - successful

        return {
            "success": True,
            "message": f"Batch forecast completed: {successful} succeeded, {failed} failed",
            "results": results,
            "summary": {
                "total": len(results),
                "successful": successful,
                "failed": failed
            }
        }

    except Exception as e:
        logger.error(f"Error in batch forecast endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/performance/{disease}/{location_uid}")
async def get_model_performance(disease: str, location_uid: str):
    """
    Get model performance metrics

    Returns evaluation metrics like MAE, RMSE, MAPE, R-squared for the trained model.
    """
    try:
        result = forecast_service.get_model_performance(disease, location_uid)

        if result['success']:
            return {
                "success": True,
                "data": result['data']
            }
        else:
            raise HTTPException(status_code=404, detail=result.get('error', 'Performance metrics not found'))

    except Exception as e:
        logger.error(f"Error in performance endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models")
async def list_cached_models():
    """
    List cached models in memory

    Shows which models are currently loaded in the service.
    """
    try:
        models = list(forecast_service.models.keys())

        return {
            "success": True,
            "cached_models": models,
            "count": len(models)
        }

    except Exception as e:
        logger.error(f"Error in list models endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/config")
async def get_config():
    """
    Get service configuration

    Returns current configuration settings.
    """
    return {
        "success": True,
        "config": {
            "forecast_horizon": config.FORECAST_HORIZON,
            "training_min_points": config.TRAINING_DATA_MIN_POINTS,
            "ensemble_weights": {
                "sarima": config.ENSEMBLE_SARIMA_WEIGHT,
                "xgboost": config.ENSEMBLE_XGBOOST_WEIGHT
            },
            "model_save_dir": str(config.MODEL_SAVE_DIR),
            "supported_diseases": list(config.DISEASE_UIDS.keys())
        }
    }

@app.post("/anomaly-detection")
async def detect_anomalies(request: AnomalyRequest):
    """
    Detect anomalies using Isolation Forest algorithm

    Uses Isolation Forest to detect unusual patterns in disease case counts
    across locations at a specified administrative level.

    The algorithm works by:
    1. Building isolation trees that randomly partition the data
    2. Identifying observations that are easier to isolate (anomalies)
    3. Scoring each location based on how anomalous it is

    Returns detected anomalies with severity levels and visualization data.
    """
    try:
        logger.info(f"Received anomaly detection request for {request.disease} at level {request.level}")

        result = anomaly_detector.detect_anomalies(
            disease=request.disease,
            start_date=request.start_date,
            end_date=request.end_date,
            level=request.level
        )

        if result['success']:
            return {
                "success": True,
                "data": result
            }
        else:
            raise HTTPException(status_code=400, detail=result.get('error', 'Anomaly detection failed'))

    except Exception as e:
        logger.error(f"Error in anomaly detection endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/anomaly-detection/{disease}")
async def get_anomalies(
    disease: str,
    level: int = 2,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    location_uid: Optional[str] = None
):
    """
    Get anomaly detection results (GET method)

    Alternative endpoint using GET method for easier integration.
    Optionally filter by location_uid to show anomalies for a specific location.
    """
    try:
        result = anomaly_detector.detect_anomalies(
            disease=disease,
            start_date=start_date,
            end_date=end_date,
            level=level,
            location_uid=location_uid
        )

        if result['success']:
            return {
                "success": True,
                "data": result
            }
        else:
            raise HTTPException(status_code=400, detail=result.get('error', 'Anomaly detection failed'))

    except Exception as e:
        logger.error(f"Error in get anomaly detection endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/correlation")
async def calculate_correlation(request: CorrelationRequest):
    """
    Calculate weather-disease correlation with lag analysis

    Analyzes the relationship between climate variables (temperature, rainfall, humidity)
    and disease cases with a specified time lag.

    Returns correlation metrics including:
    - Composite correlation score (0-100)
    - Individual correlations for each climate variable
    - Statistical significance
    - Relationship strength interpretation
    """
    try:
        logger.info(f"Received correlation request for {request.disease} at {request.location_uid} with lag={request.lag_weeks}w")

        result = correlation_analyzer.calculate_lagged_correlation(
            disease=request.disease,
            location_uid=request.location_uid,
            lag_weeks=request.lag_weeks,
            start_date=request.start_date,
            end_date=request.end_date
        )

        if result['success']:
            return {
                "success": True,
                "data": result
            }
        else:
            raise HTTPException(status_code=400, detail=result.get('error', 'Correlation analysis failed'))

    except Exception as e:
        logger.error(f"Error in correlation endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/correlation/{disease}/{location_uid}")
async def get_correlation(
    disease: str,
    location_uid: str,
    lag_weeks: int = 0,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Get weather-disease correlation (GET method)

    Alternative endpoint using GET method for easier integration.
    """
    try:
        result = correlation_analyzer.calculate_lagged_correlation(
            disease=disease,
            location_uid=location_uid,
            lag_weeks=lag_weeks,
            start_date=start_date,
            end_date=end_date
        )

        if result['success']:
            return {
                "success": True,
                "data": result
            }
        else:
            raise HTTPException(status_code=400, detail=result.get('error', 'Correlation analysis failed'))

    except Exception as e:
        logger.error(f"Error in get correlation endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn

    logger.info(f"Starting Disease Forecasting ML Service on {config.ML_SERVICE_HOST}:{config.ML_SERVICE_PORT}")

    uvicorn.run(
        "main:app",
        host=config.ML_SERVICE_HOST,
        port=config.ML_SERVICE_PORT,
        reload=True,
        log_level=config.LOG_LEVEL.lower()
    )
