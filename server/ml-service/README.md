# Disease Forecasting ML Service

Machine learning service for disease outbreak prediction using ensemble of SARIMA and XGBoost models.

## Features

- Time series forecasting with SARIMA
- XGBoost regression with climate and temporal features
- Ensemble predictions with confidence intervals
- Feature engineering pipeline
- Model persistence and caching
- FastAPI REST API

## Setup

### 1. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
nano .env
```

### 4. Run Service

```bash
# Development
python main.py

# Production with uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

### Health Check

```bash
GET /health
```

### Train Model

```bash
POST /train
Content-Type: application/json

{
  "disease": "Malaria",
  "location_uid": "O6uvpzGd5pu",
  "start_date": "2023-01-01",
  "end_date": "2025-11-15"
}
```

### Generate Forecast

```bash
POST /forecast
Content-Type: application/json

{
  "disease": "Malaria",
  "location_uid": "O6uvpzGd5pu",
  "horizon": 4,
  "auto_train": true
}
```

### Get Forecast (GET)

```bash
GET /forecast/{disease}/{location_uid}?horizon=4
```

### Batch Forecast

```bash
POST /forecast/batch
Content-Type: application/json

{
  "diseases": ["Malaria", "Measles"],
  "location_uids": ["O6uvpzGd5pu", "fdc6uOvgoji"],
  "horizon": 4
}
```

### Get Model Performance

```bash
GET /performance/{disease}/{location_uid}
```

### List Cached Models

```bash
GET /models
```

### Get Configuration

```bash
GET /config
```

## Model Architecture

### SARIMA Model

- **Order**: (1, 1, 1)
- **Seasonal Order**: (1, 1, 1, 52) - weekly seasonality
- **Features**: Time series + exogenous climate variables

### XGBoost Model

- **Features**: Lagged cases, rolling statistics, temporal features, climate data
- **Parameters**: 100 estimators, learning rate 0.05, max depth 5

### Ensemble

- **SARIMA Weight**: 60%
- **XGBoost Weight**: 40%
- **Prediction Intervals**: 95% confidence from SARIMA

## Feature Engineering

### Lagged Features

- Cases lag 1, 2, 4, 8 weeks

### Rolling Features

- 4-week and 8-week moving averages
- 4-week standard deviation
- 4-week cumulative sum

### Temporal Features

- Month (1-12)
- Week of year (1-52)
- Season (rainy/dry)
- Quarter

### Climate Features

- Average temperature
- Total precipitation
- Average humidity
- Average wind speed
- Lagged climate variables (1-2 weeks)
- Interaction terms (temperature × precipitation)

## Database Tables

The service uses the following PostgreSQL tables:

- `climate_data` - Climate observations
- `forecasts` - Generated forecasts
- `model_performance` - Model evaluation metrics

## Development

### Running Tests

```bash
pytest tests/
```

### Code Formatting

```bash
black .
flake8 .
```

### Type Checking

```bash
mypy .
```

## Production Deployment

### Using Docker

```bash
docker build -t ml-service .
docker run -p 8000:8000 --env-file .env ml-service
```

### Using PM2

```bash
pm2 start main.py --name ml-service --interpreter python3
```

## Monitoring

The service logs all requests and errors using loguru. Configure log level in `.env`:

```
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR
```

## Performance

Target metrics:

- **MAE**: < 20 cases per week
- **RMSE**: < 50 cases per week
- **MAPE**: < 25%
- **R²**: > 0.70

## Troubleshooting

### ImportError: No module named 'statsmodels'

Make sure all dependencies are installed:

```bash
pip install -r requirements.txt
```

### Database Connection Error

Check PostgreSQL credentials in `.env` and ensure database is running:

```bash
psql -h localhost -d dhis2SierraLeoneDemo
```

### Insufficient Training Data

Ensure at least 52 weeks (1 year) of historical data exists for the disease and location.

## License

Proprietary - Disease Early Warning System (DEWS)
