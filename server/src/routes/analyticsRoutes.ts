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
    const locationUid = req.query.locationUid as string | undefined;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const diseaseId = req.query.diseaseId as string | undefined;

    logger.debug({ locationUid, days, diseaseId }, "GET /api/analytics/overview");

    const metrics = await analyticsService.getOverviewMetrics(locationUid, days, diseaseId);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
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
    const locationUid = req.query.locationUid as string | undefined;
    const diseaseId = req.query.diseaseId as string | undefined;

    logger.debug({ locationUid, diseaseId }, "GET /api/analytics/outbreak-detection");

    const alerts = await analyticsService.detectOutbreaks(locationUid, diseaseId);

    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  } catch (error) {
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
    const weeks = parseInt(req.query.weeks as string) || 12;
    const locationUid = req.query.locationUid as string | undefined;
    const diseaseId = req.query.diseaseId as string | undefined;

    logger.debug({ weeks, locationUid, diseaseId }, "GET /api/analytics/trends");

    const trends = await analyticsService.getTrendData(weeks, locationUid, diseaseId);

    res.json({
      success: true,
      data: trends,
      count: trends.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/heatmap
 * Get geographic heat map data
 * Query params: days (default: 90), startDate, endDate, disease, location
 */
analyticsRouter.get("/heatmap", async (req, res, next) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 90;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const disease = req.query.disease as string | undefined;
    const location = req.query.location as string | undefined;

    logger.debug({ days, startDate, endDate, disease, location }, "GET /api/analytics/heatmap");

    const heatmap = await analyticsService.getGeographicHeatMap(days, startDate, endDate, disease, location);

    res.json({
      success: true,
      data: heatmap,
      count: heatmap.length,
    });
  } catch (error) {
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
  } catch (error) {
    next(error);
  }
});
