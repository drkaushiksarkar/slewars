import { Router } from 'express';
import forecastService from '../services/forecastService';
import logger from '../services/logger';
const router = Router();
/**
 * POST /api/forecast/generate
 * Generate new forecast for disease and location
 */
router.post('/generate', async (req, res) => {
    try {
        const { disease, location_uid, horizon = 4, auto_train = true } = req.body;
        if (!disease || !location_uid) {
            return res.status(400).json({
                success: false,
                error: 'disease and location_uid are required'
            });
        }
        logger.info(`Forecast generation request: ${disease} in ${location_uid}`);
        const result = await forecastService.generateForecast({
            disease,
            location_uid,
            horizon,
            auto_train
        });
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        logger.error({ error }, 'Error in POST /api/forecast/generate');
        res.status(500).json({
            success: false,
            error: 'Failed to generate forecast',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * GET /api/forecast/:disease/:locationUid
 * Get latest forecast for disease and location
 */
router.get('/:disease/:locationUid', async (req, res) => {
    try {
        const { disease, locationUid } = req.params;
        const { regenerate } = req.query;
        logger.info(`Fetching forecast: ${disease} in ${locationUid}`);
        // If regenerate=true, generate new forecast
        if (regenerate === 'true') {
            const result = await forecastService.generateForecast({
                disease,
                location_uid: locationUid,
                horizon: 4,
                auto_train: true
            });
            return res.json({
                success: true,
                data: result.data,
                regenerated: true
            });
        }
        // Otherwise, get latest stored forecast
        const forecast = await forecastService.getLatestForecast(disease, locationUid);
        if (!forecast) {
            return res.status(404).json({
                success: false,
                error: 'No forecast found',
                message: 'No forecast available for this disease and location. Try with ?regenerate=true'
            });
        }
        res.json({
            success: true,
            data: forecast
        });
    }
    catch (error) {
        logger.error({ error }, 'Error in GET /api/forecast/:disease/:locationUid');
        res.status(500).json({
            success: false,
            error: 'Failed to fetch forecast',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * POST /api/forecast/train
 * Train forecasting model
 */
router.post('/train', async (req, res) => {
    try {
        const { disease, location_uid, start_date, end_date } = req.body;
        if (!disease || !location_uid) {
            return res.status(400).json({
                success: false,
                error: 'disease and location_uid are required'
            });
        }
        logger.info(`Model training request: ${disease} in ${location_uid}`);
        const result = await forecastService.trainModel({
            disease,
            location_uid,
            start_date,
            end_date
        });
        res.json(result);
    }
    catch (error) {
        logger.error({ error }, 'Error in POST /api/forecast/train');
        res.status(500).json({
            success: false,
            error: 'Failed to train model',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * GET /api/forecast/performance/:disease/:locationUid
 * Get model performance metrics
 */
router.get('/performance/:disease/:locationUid', async (req, res) => {
    try {
        const { disease, locationUid } = req.params;
        logger.info(`Fetching model performance: ${disease} in ${locationUid}`);
        const performance = await forecastService.getModelPerformance(disease, locationUid);
        if (!performance) {
            return res.status(404).json({
                success: false,
                error: 'No performance metrics found'
            });
        }
        res.json({
            success: true,
            data: performance
        });
    }
    catch (error) {
        logger.error({ error }, 'Error in GET /api/forecast/performance');
        res.status(500).json({
            success: false,
            error: 'Failed to fetch model performance',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * POST /api/forecast/batch
 * Generate forecasts for all districts
 */
router.post('/batch', async (req, res) => {
    try {
        const { disease, horizon = 4 } = req.body;
        if (!disease) {
            return res.status(400).json({
                success: false,
                error: 'disease is required'
            });
        }
        logger.info(`Batch forecast request for ${disease}`);
        const result = await forecastService.batchForecastAllDistricts(disease, horizon);
        res.json(result);
    }
    catch (error) {
        logger.error({ error }, 'Error in POST /api/forecast/batch');
        res.status(500).json({
            success: false,
            error: 'Failed to generate batch forecasts',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * GET /api/forecast/districts
 * Get all districts with available forecasts
 */
router.get('/districts', async (req, res) => {
    try {
        const { disease } = req.query;
        const districts = await forecastService.getDistrictsWithForecasts(disease);
        res.json({
            success: true,
            data: districts,
            count: districts.length
        });
    }
    catch (error) {
        logger.error({ error }, 'Error in GET /api/forecast/districts');
        res.status(500).json({
            success: false,
            error: 'Failed to fetch districts',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * GET /api/forecast/risk-analysis/:disease
 * Get risk analysis for all districts
 */
router.get('/risk-analysis/:disease', async (req, res) => {
    try {
        const { disease } = req.params;
        logger.info(`Risk analysis request for ${disease}`);
        const analysis = await forecastService.getRiskAnalysis(disease);
        res.json({
            success: true,
            data: analysis,
            count: analysis.length
        });
    }
    catch (error) {
        logger.error({ error }, 'Error in GET /api/forecast/risk-analysis');
        res.status(500).json({
            success: false,
            error: 'Failed to fetch risk analysis',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * GET /api/forecast/health
 * Check ML service health
 */
router.get('/health', async (req, res) => {
    try {
        const isHealthy = await forecastService.checkMLServiceHealth();
        res.json({
            success: true,
            ml_service_healthy: isHealthy,
            ml_service_url: process.env.ML_SERVICE_URL || 'http://localhost:8000'
        });
    }
    catch (error) {
        logger.error({ error }, 'Error in GET /api/forecast/health');
        res.status(500).json({
            success: false,
            error: 'Failed to check ML service health'
        });
    }
});
export default router;
