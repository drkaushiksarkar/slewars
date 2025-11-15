import { Router } from "express";
import { analyticsService } from "../services/analyticsService.js";
import logger from "../services/logger.js";
export const analyticsRouter = Router();
/**
 * GET /api/analytics/overview
 * Get overview metrics (KPIs)
 * Query params: locationUid, days, diseaseId
 */
analyticsRouter.get("/overview", async (req, res, next) => {
    try {
        const locationUid = req.query.locationUid;
        const days = req.query.days ? parseInt(req.query.days) : 30;
        const diseaseId = req.query.diseaseId;
        logger.debug({ locationUid, days, diseaseId }, "GET /api/analytics/overview");
        const metrics = await analyticsService.getOverviewMetrics(locationUid, days, diseaseId);
        res.json({
            success: true,
            data: metrics,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/analytics/outbreak-detection
 * Detect current outbreaks using statistical thresholds
 * Query params: locationUid, diseaseId
 */
analyticsRouter.get("/outbreak-detection", async (req, res, next) => {
    try {
        const locationUid = req.query.locationUid;
        const diseaseId = req.query.diseaseId;
        logger.debug({ locationUid, diseaseId }, "GET /api/analytics/outbreak-detection");
        const alerts = await analyticsService.detectOutbreaks(locationUid, diseaseId);
        res.json({
            success: true,
            data: alerts,
            count: alerts.length,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/analytics/trends
 * Get disease trends over time
 * Query params: weeks (default: 12), locationUid, diseaseId
 */
analyticsRouter.get("/trends", async (req, res, next) => {
    try {
        const weeks = parseInt(req.query.weeks) || 12;
        const locationUid = req.query.locationUid;
        const diseaseId = req.query.diseaseId;
        logger.debug({ weeks, locationUid, diseaseId }, "GET /api/analytics/trends");
        const trends = await analyticsService.getTrendData(weeks, locationUid, diseaseId);
        res.json({
            success: true,
            data: trends,
            count: trends.length,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/analytics/heatmap
 * Get geographic heat map data
 */
analyticsRouter.get("/heatmap", async (_req, res, next) => {
    try {
        logger.debug("GET /api/analytics/heatmap");
        const heatmap = await analyticsService.getGeographicHeatMap();
        res.json({
            success: true,
            data: heatmap,
            count: heatmap.length,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/analytics/data-quality
 * Get data quality metrics
 */
analyticsRouter.get("/data-quality", async (_req, res, next) => {
    try {
        logger.debug("GET /api/analytics/data-quality");
        const quality = await analyticsService.getDataQualityMetrics();
        res.json({
            success: true,
            data: quality,
            count: quality.length,
        });
    }
    catch (error) {
        next(error);
    }
});
