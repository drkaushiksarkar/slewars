"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const postgresService_1 = require("./postgresService");
const logger_1 = __importDefault(require("./logger"));
class ForecastService {
    constructor() {
        this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    }
    /**
     * Map disease IDs to the names used by the unified ML model
     * The unified model expects exact disease names as stored in DHIS2
     */
    mapDiseaseIdToForecastName(diseaseId) {
        const diseaseMap = {
            // Malaria variants
            'malaria': 'IDSR Malaria',
            'malariaIDSR': 'IDSR Malaria',
            'malariaidsr': 'IDSR Malaria',
            // Measles variants
            'measles': 'IDSR Measles',
            'measlesIDSR': 'IDSR Measles',
            'measlesidsr': 'IDSR Measles',
            // Yellow Fever variants
            'yellowfever': 'IDSR Yellow Fever',
            'yellowFever': 'IDSR Yellow Fever',
            'yellowFeverIDSR': 'IDSR Yellow Fever',
            'yellowfeveridsr': 'IDSR Yellow Fever',
            // Typhoid variants
            'typhoid': 'Typhoid Fever',
            'typhoidfever': 'Typhoid Fever',
            'typhoidFever': 'Typhoid Fever',
            // Cholera variants
            'cholera': 'IDSR Cholera',
            'choleraIDSR': 'IDSR Cholera',
            'choleraidsr': 'IDSR Cholera',
            // Lassa Fever variants
            'lassa': 'Lassa Fever',
            'lassafever': 'Lassa Fever',
            'lassaFever': 'Lassa Fever',
            // Plague variants
            'plague': 'IDSR Plague',
            'plagueIDSR': 'IDSR Plague',
            'plagueidsr': 'IDSR Plague',
            // Diarrhoea variants
            'diarrhoea': 'Diarrhoea without Severe Dehydration',
            'dysentery': 'Diarrhoea with Blood (Dysentery)',
            'severediarrhoea': 'Diarrhoea with Severe Dehydration',
            // Respiratory variants
            'pneumonia': 'ARI Treated with Antibiotics (Pneumonia)',
            'cough': 'ARI Treated without Antibiotics (Cough)',
            'tuberculosis': 'Tuberculosis',
            'meningitis': 'Meningitis/Severe Bacterial Infection',
            // NTDs
            'worms': 'Worm Infestation',
            'schistosomiasis': 'Schistosomiasis',
            'onchocerciasis': 'Onchocerciasis',
            'yaws': 'Yaws',
            // Vaccine-preventable
            'tetanus': 'Tetanus (not incl. 0-28 days)',
            'neonataltetanus': 'Neonatal Tetanus',
            'afp': 'Acute Flaccid Paralysis (AFP)',
            // Other
            'skin': 'Skin Infection',
            'malnutrition': 'Clinical Malnutrition',
            'eye': 'Eye Infection',
            'otitis': 'Otitis Media',
        };
        // Return mapped name or original ID if not found
        return diseaseMap[diseaseId] || diseaseId;
    }
    /**
     * Generate forecast for a disease and location
     */
    async generateForecast(params) {
        try {
            const forceRetrain = params.force_retrain === true;
            // Map disease ID to forecast database name
            const mappedDisease = this.mapDiseaseIdToForecastName(params.disease);
            logger_1.default.info(`Generating forecast for ${params.disease} (mapped: ${mappedDisease}) in ${params.location_uid} (force_retrain: ${forceRetrain})`);
            const response = await axios_1.default.post(`${this.mlServiceUrl}/forecast`, {
                disease: mappedDisease,
                location_uid: params.location_uid,
                horizon: params.horizon || 4,
                auto_train: params.auto_train !== false,
                force_retrain: forceRetrain
            }, {
                timeout: forceRetrain ? 300000 : 60000 // 5 min for retrain, 1 min for inference
            });
            return response.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                logger_1.default.error({ error: error.message, response: error.response?.data }, 'ML service error');
                throw new Error(error.response?.data?.detail || 'Forecast generation failed');
            }
            throw error;
        }
    }
    /**
     * Train forecasting model
     */
    async trainModel(params) {
        try {
            // Map disease ID to forecast database name
            const mappedDisease = this.mapDiseaseIdToForecastName(params.disease);
            logger_1.default.info(`Training model for ${params.disease} (mapped: ${mappedDisease}) in ${params.location_uid}`);
            const response = await axios_1.default.post(`${this.mlServiceUrl}/train`, {
                ...params,
                disease: mappedDisease
            }, {
                timeout: 300000 // 5 minute timeout for training
            });
            return response.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                logger_1.default.error({ error: error.message, response: error.response?.data }, 'ML service training error');
                throw new Error(error.response?.data?.detail || 'Model training failed');
            }
            throw error;
        }
    }
    /**
     * Get stored forecasts from database
     */
    async getStoredForecasts(disease, locationUid, forecastDate) {
        try {
            // Map disease ID to forecast database name
            const mappedDisease = this.mapDiseaseIdToForecastName(disease);
            const query = `
        SELECT
          id,
          disease,
          location_uid,
          forecast_date,
          target_date,
          predicted_cases,
          lower_bound,
          upper_bound,
          confidence,
          risk_level,
          risk_score,
          model_version,
          contributing_factors,
          created_at
        FROM forecasts
        WHERE disease = $1
          AND location_uid = $2
          ${forecastDate ? 'AND forecast_date = $3' : ''}
        ORDER BY target_date
      `;
            const params = forecastDate
                ? [mappedDisease, locationUid, forecastDate]
                : [mappedDisease, locationUid];
            const result = await postgresService_1.postgresService.query(query, params);
            return result.rows;
        }
        catch (error) {
            logger_1.default.error({ error }, 'Error fetching stored forecasts');
            throw error;
        }
    }
    /**
     * Get latest forecast for a disease and location
     */
    async getLatestForecast(disease, locationUid) {
        try {
            // Map disease ID to forecast database name
            const mappedDisease = this.mapDiseaseIdToForecastName(disease);
            const query = `
        SELECT DISTINCT ON (target_date)
          id,
          disease,
          location_uid,
          forecast_date,
          target_date,
          predicted_cases,
          lower_bound,
          upper_bound,
          confidence,
          risk_level,
          risk_score,
          model_version,
          contributing_factors,
          created_at
        FROM forecasts
        WHERE disease = $1
          AND location_uid = $2
          AND forecast_date = (
            SELECT MAX(forecast_date)
            FROM forecasts
            WHERE disease = $1 AND location_uid = $2
          )
        ORDER BY target_date, forecast_date DESC
      `;
            const result = await postgresService_1.postgresService.query(query, [mappedDisease, locationUid]);
            if (result.rows.length === 0) {
                return null;
            }
            // Get model performance to extract data availability info
            let dataAvailability = null;
            try {
                const perfData = await this.getModelPerformance(disease, locationUid);
                if (perfData) {
                    // Approximate data range from training samples (weekly data)
                    const totalWeeks = perfData.training_data_size + perfData.test_data_size;
                    const endDate = new Date(perfData.evaluation_date);
                    const startDate = new Date(endDate);
                    startDate.setDate(startDate.getDate() - (totalWeeks * 7));
                    dataAvailability = {
                        start_date: startDate.toISOString().split('T')[0],
                        end_date: endDate.toISOString().split('T')[0],
                        total_points: totalWeeks,
                        has_climate_data: true // Assume true if model was trained
                    };
                }
            }
            catch (err) {
                logger_1.default.warn('Could not fetch data availability info');
            }
            return {
                disease,
                location_uid: locationUid,
                forecast_date: result.rows[0].forecast_date,
                data_availability: dataAvailability,
                predictions: result.rows.map((row) => ({
                    date: row.target_date,
                    predicted_cases: row.predicted_cases,
                    lower_bound: row.lower_bound,
                    upper_bound: row.upper_bound,
                    confidence: parseFloat(row.confidence),
                    risk_level: row.risk_level,
                    risk_score: parseFloat(row.risk_score),
                    contributing_factors: row.contributing_factors
                })),
                model_version: result.rows[0].model_version
            };
        }
        catch (error) {
            logger_1.default.error({ error }, 'Error fetching latest forecast');
            throw error;
        }
    }
    /**
     * Get model performance metrics
     * The unified model returns global performance, not per disease/location
     */
    async getModelPerformance(disease, locationUid) {
        try {
            // For unified model, get global performance
            // The model doesn't have per-disease-location metrics anymore
            const response = await axios_1.default.get(`${this.mlServiceUrl}/performance`, {
                timeout: 5000
            });
            if (response.data.success) {
                const perfData = response.data.data;
                // Format to match old structure for backwards compatibility
                return {
                    id: null,
                    disease: disease,
                    location_uid: locationUid,
                    model_type: 'unified',
                    model_version: perfData.model_version || '3.1',
                    evaluation_date: perfData.training_info?.trained_at || new Date().toISOString(),
                    mae: perfData.performance?.overall?.mae || 0,
                    rmse: perfData.performance?.overall?.rmse || 0,
                    mape: perfData.performance?.overall?.mape || 0,
                    r_squared: perfData.performance?.overall?.r2 || 0,
                    training_data_size: perfData.training_info?.n_samples || 0,
                    test_data_size: perfData.performance?.overall?.n_samples || 0,
                    metrics: perfData.performance,
                    created_at: new Date().toISOString()
                };
            }
            return null;
        }
        catch (error) {
            logger_1.default.warn('Could not fetch unified model performance, trying database fallback');
            // Fallback to database (for old stored metrics)
            try {
                const mappedDisease = this.mapDiseaseIdToForecastName(disease);
                const query = `
          SELECT
            id,
            disease,
            location_uid,
            model_type,
            model_version,
            evaluation_date,
            mae,
            rmse,
            mape,
            r_squared,
            training_data_size,
            test_data_size,
            metrics,
            created_at
          FROM model_performance
          WHERE disease = $1
            AND location_uid = $2
          ORDER BY evaluation_date DESC
          LIMIT 1
        `;
                const result = await postgresService_1.postgresService.query(query, [mappedDisease, locationUid]);
                if (result.rows.length === 0) {
                    return null;
                }
                return result.rows[0];
            }
            catch (dbError) {
                logger_1.default.error({ error: dbError }, 'Error fetching model performance from database');
                return null;
            }
        }
    }
    /**
     * Get all districts with available forecasts
     */
    async getDistrictsWithForecasts(disease) {
        try {
            // Map disease ID to forecast database name if provided
            const mappedDisease = disease ? this.mapDiseaseIdToForecastName(disease) : undefined;
            const query = `
        SELECT DISTINCT
          f.location_uid,
          ou.name as location_name,
          f.disease,
          MAX(f.forecast_date) as latest_forecast_date,
          COUNT(*) as forecast_count
        FROM forecasts f
        JOIN organisationunit ou ON f.location_uid = ou.uid
        WHERE ou.hierarchylevel = 2
          ${mappedDisease ? 'AND f.disease = $1' : ''}
        GROUP BY f.location_uid, ou.name, f.disease
        ORDER BY ou.name, f.disease
      `;
            const params = mappedDisease ? [mappedDisease] : [];
            const result = await postgresService_1.postgresService.query(query, params);
            return result.rows;
        }
        catch (error) {
            logger_1.default.error({ error }, 'Error fetching districts with forecasts');
            throw error;
        }
    }
    /**
     * Batch generate forecasts for all districts
     */
    async batchForecastAllDistricts(disease, horizon = 4) {
        try {
            // Map disease ID to forecast database name
            const mappedDisease = this.mapDiseaseIdToForecastName(disease);
            // Get all districts
            const districtsQuery = `
        SELECT uid, name
        FROM organisationunit
        WHERE hierarchylevel = 2
        ORDER BY name
      `;
            const districts = await postgresService_1.postgresService.query(districtsQuery);
            logger_1.default.info(`Generating forecasts for ${disease} (mapped: ${mappedDisease}) across ${districts.rows.length} districts`);
            // Call ML service batch forecast
            const response = await axios_1.default.post(`${this.mlServiceUrl}/forecast/batch`, {
                diseases: [mappedDisease],
                location_uids: districts.rows.map((d) => d.uid),
                horizon
            }, {
                timeout: 600000 // 10 minute timeout for batch
            });
            return response.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                logger_1.default.error({ error: error.message }, 'Batch forecast error');
                throw new Error(error.response?.data?.detail || 'Batch forecast failed');
            }
            throw error;
        }
    }
    /**
     * Check ML service health
     */
    async checkMLServiceHealth() {
        try {
            const response = await axios_1.default.get(`${this.mlServiceUrl}/health`, {
                timeout: 5000
            });
            return response.data.status === 'healthy';
        }
        catch (error) {
            logger_1.default.warn('ML service health check failed');
            return false;
        }
    }
    /**
     * Get risk analysis for all districts
     */
    async getRiskAnalysis(disease) {
        try {
            // Map disease ID to forecast database name
            const mappedDisease = this.mapDiseaseIdToForecastName(disease);
            const query = `
        WITH latest_forecasts AS (
          SELECT DISTINCT ON (f.location_uid, f.target_date)
            f.location_uid,
            f.target_date,
            f.predicted_cases,
            f.risk_level,
            f.risk_score
          FROM forecasts f
          WHERE f.disease = $1
            AND f.forecast_date = (
              SELECT MAX(forecast_date)
              FROM forecasts
              WHERE disease = $1
            )
          ORDER BY f.location_uid, f.target_date, f.forecast_date DESC
        )
        SELECT
          ou.uid as location_uid,
          ou.name as location_name,
          lf.target_date,
          lf.predicted_cases,
          lf.risk_level,
          lf.risk_score,
          AVG(lf.predicted_cases) OVER (PARTITION BY lf.location_uid) as avg_predicted_cases,
          MAX(lf.risk_score) OVER (PARTITION BY lf.location_uid) as max_risk_score
        FROM organisationunit ou
        LEFT JOIN latest_forecasts lf ON ou.uid = lf.location_uid
        WHERE ou.hierarchylevel = 2
        ORDER BY max_risk_score DESC NULLS LAST, ou.name
      `;
            const result = await postgresService_1.postgresService.query(query, [mappedDisease]);
            // Group by location
            const locationMap = new Map();
            result.rows.forEach((row) => {
                if (!locationMap.has(row.location_uid)) {
                    locationMap.set(row.location_uid, {
                        location_uid: row.location_uid,
                        location_name: row.location_name,
                        avg_predicted_cases: parseFloat(row.avg_predicted_cases) || 0,
                        max_risk_score: parseFloat(row.max_risk_score) || 0,
                        risk_level: row.risk_level || 'UNKNOWN',
                        forecasts: []
                    });
                }
                if (row.target_date) {
                    locationMap.get(row.location_uid).forecasts.push({
                        target_date: row.target_date,
                        predicted_cases: row.predicted_cases,
                        risk_level: row.risk_level,
                        risk_score: parseFloat(row.risk_score)
                    });
                }
            });
            return Array.from(locationMap.values());
        }
        catch (error) {
            logger_1.default.error({ error }, 'Error getting risk analysis');
            throw error;
        }
    }
    /**
     * Detect anomalies using Isolation Forest
     */
    async detectAnomalies(disease, level = 2, startDate, endDate, locationUid) {
        try {
            // Map disease ID to forecast database name
            const mappedDisease = this.mapDiseaseIdToForecastName(disease);
            logger_1.default.info(`Detecting anomalies for ${disease} (mapped: ${mappedDisease}) at level ${level}${locationUid ? ` for location ${locationUid}` : ''}`);
            const response = await axios_1.default.get(`${this.mlServiceUrl}/anomaly-detection/${encodeURIComponent(mappedDisease)}`, {
                params: {
                    level,
                    start_date: startDate,
                    end_date: endDate,
                    location_uid: locationUid
                },
                timeout: 30000 // 30 second timeout
            });
            return response.data.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                logger_1.default.error({ error: error.message, response: error.response?.data }, 'Anomaly detection error');
                throw new Error(error.response?.data?.detail || 'Anomaly detection failed');
            }
            throw error;
        }
    }
}
exports.default = new ForecastService();
