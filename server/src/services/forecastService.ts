import axios from 'axios';
import { postgresService } from './postgresService';
import logger from './logger';

interface ForecastRequest {
  disease: string;
  location_uid: string;
  horizon?: number;
  auto_train?: boolean;
  force_retrain?: boolean;
}

interface TrainRequest {
  disease: string;
  location_uid: string;
  start_date?: string;
  end_date?: string;
}

class ForecastService {
  private mlServiceUrl: string;

  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  }

  /**
   * Generate forecast for a disease and location
   */
  async generateForecast(params: ForecastRequest): Promise<any> {
    try {
      const forceRetrain = params.force_retrain === true;
      logger.info(`Generating forecast for ${params.disease} in ${params.location_uid} (force_retrain: ${forceRetrain})`);

      const response = await axios.post(`${this.mlServiceUrl}/forecast`, {
        disease: params.disease,
        location_uid: params.location_uid,
        horizon: params.horizon || 4,
        auto_train: params.auto_train !== false,
        force_retrain: forceRetrain
      }, {
        timeout: forceRetrain ? 300000 : 60000 // 5 min for retrain, 1 min for inference
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error({ error: error.message, response: error.response?.data }, 'ML service error');
        throw new Error(error.response?.data?.detail || 'Forecast generation failed');
      }
      throw error;
    }
  }

  /**
   * Train forecasting model
   */
  async trainModel(params: TrainRequest): Promise<any> {
    try {
      logger.info(`Training model for ${params.disease} in ${params.location_uid}`);

      const response = await axios.post(`${this.mlServiceUrl}/train`, params, {
        timeout: 300000 // 5 minute timeout for training
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error({ error: error.message, response: error.response?.data }, 'ML service training error');
        throw new Error(error.response?.data?.detail || 'Model training failed');
      }
      throw error;
    }
  }

  /**
   * Get stored forecasts from database
   */
  async getStoredForecasts(
    disease: string,
    locationUid: string,
    forecastDate?: string
  ): Promise<any[]> {
    try {
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
        ? [disease, locationUid, forecastDate]
        : [disease, locationUid];

      const result = await postgresService.query(query, params);

      return result.rows;
    } catch (error) {
      logger.error({ error }, 'Error fetching stored forecasts');
      throw error;
    }
  }

  /**
   * Get latest forecast for a disease and location
   */
  async getLatestForecast(disease: string, locationUid: string): Promise<any> {
    try {
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

      const result = await postgresService.query(query, [disease, locationUid]);

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
      } catch (err) {
        logger.warn('Could not fetch data availability info');
      }

      return {
        disease,
        location_uid: locationUid,
        forecast_date: result.rows[0].forecast_date,
        data_availability: dataAvailability,
        predictions: result.rows.map((row: any) => ({
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
    } catch (error) {
      logger.error({ error }, 'Error fetching latest forecast');
      throw error;
    }
  }

  /**
   * Get model performance metrics
   */
  async getModelPerformance(disease: string, locationUid: string): Promise<any> {
    try {
      // Fallback to database directly (ML service has nested response)
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

      const result = await postgresService.query(query, [disease, locationUid]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error({ error }, 'Error fetching model performance');
      throw error;
    }
  }

  /**
   * Get all districts with available forecasts
   */
  async getDistrictsWithForecasts(disease?: string): Promise<any[]> {
    try {
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
          ${disease ? 'AND f.disease = $1' : ''}
        GROUP BY f.location_uid, ou.name, f.disease
        ORDER BY ou.name, f.disease
      `;

      const params = disease ? [disease] : [];
      const result = await postgresService.query(query, params);

      return result.rows;
    } catch (error) {
      logger.error({ error }, 'Error fetching districts with forecasts');
      throw error;
    }
  }

  /**
   * Batch generate forecasts for all districts
   */
  async batchForecastAllDistricts(disease: string, horizon: number = 4): Promise<any> {
    try {
      // Get all districts
      const districtsQuery = `
        SELECT uid, name
        FROM organisationunit
        WHERE hierarchylevel = 2
        ORDER BY name
      `;

      const districts = await postgresService.query(districtsQuery);

      logger.info(`Generating forecasts for ${disease} across ${districts.rows.length} districts`);

      // Call ML service batch forecast
      const response = await axios.post(`${this.mlServiceUrl}/forecast/batch`, {
        diseases: [disease],
        location_uids: districts.rows.map((d: any) => d.uid),
        horizon
      }, {
        timeout: 600000 // 10 minute timeout for batch
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error({ error: error.message }, 'Batch forecast error');
        throw new Error(error.response?.data?.detail || 'Batch forecast failed');
      }
      throw error;
    }
  }

  /**
   * Check ML service health
   */
  async checkMLServiceHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.mlServiceUrl}/health`, {
        timeout: 5000
      });
      return response.data.status === 'healthy';
    } catch (error) {
      logger.warn('ML service health check failed');
      return false;
    }
  }

  /**
   * Get risk analysis for all districts
   */
  async getRiskAnalysis(disease: string): Promise<any[]> {
    try {
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

      const result = await postgresService.query(query, [disease]);

      // Group by location
      const locationMap = new Map();

      result.rows.forEach((row: any) => {
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
    } catch (error) {
      logger.error({ error }, 'Error getting risk analysis');
      throw error;
    }
  }
}

export default new ForecastService();
