import { Router } from "express";
import { diseaseService } from "../services/diseaseService.js";
import logger from "../services/logger.js";

export const diseaseRouter = Router();

/**
 * GET /api/diseases
 * List all diseases with available data
 */
diseaseRouter.get("/", async (_req, res, next) => {
  try {
    logger.debug("GET /api/diseases");
    const diseases = await diseaseService.getAllDiseases();
    res.json({
      success: true,
      data: diseases,
      count: diseases.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/diseases/:diseaseId/summary
 * Get disease summary statistics
 */
diseaseRouter.get("/:diseaseId/summary", async (req, res, next) => {
  try {
    const { diseaseId } = req.params;
    logger.debug({ diseaseId }, "GET /api/diseases/:diseaseId/summary");

    const summary = await diseaseService.getDiseaseSummary(diseaseId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: `Disease '${diseaseId}' not found`,
      });
    }

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/diseases/:diseaseId/timeseries
 * Get time series data for a disease
 * Query params: startDate, endDate, locationUid
 */
diseaseRouter.get("/:diseaseId/timeseries", async (req, res, next) => {
  try {
    const { diseaseId } = req.params;
    const { startDate, endDate, locationUid } = req.query;

    logger.debug({ diseaseId, startDate, endDate, locationUid }, "GET /api/diseases/:diseaseId/timeseries");

    const timeSeries = await diseaseService.getDiseaseTimeSeries(
      diseaseId,
      startDate as string | undefined,
      endDate as string | undefined,
      locationUid as string | undefined
    );

    res.json({
      success: true,
      data: timeSeries,
      count: timeSeries.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/diseases/:diseaseId/locations
 * Get disease cases by location
 * Query params: hierarchyLevel (default: 2 for districts)
 */
diseaseRouter.get("/:diseaseId/locations", async (req, res, next) => {
  try {
    const { diseaseId } = req.params;
    const hierarchyLevel = parseInt(req.query.hierarchyLevel as string) || 2;

    logger.debug({ diseaseId, hierarchyLevel }, "GET /api/diseases/:diseaseId/locations");

    const locations = await diseaseService.getDiseaseCasesByLocation(diseaseId, hierarchyLevel);

    res.json({
      success: true,
      data: locations,
      count: locations.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/diseases/breakdown
 * Get disease breakdown for all diseases
 * Query params: locationUid, days, diseaseId
 */
diseaseRouter.get("/breakdown/all", async (req, res, next) => {
  try {
    const locationUid = req.query.locationUid as string | undefined;
    const days = req.query.days ? parseInt(req.query.days as string) : undefined;
    const diseaseId = req.query.diseaseId as string | undefined;

    logger.debug({ locationUid, days, diseaseId }, "GET /api/diseases/breakdown/all");

    const breakdown = await diseaseService.getDiseaseBreakdown(locationUid, days, diseaseId);

    res.json({
      success: true,
      data: breakdown,
      count: breakdown.length,
    });
  } catch (error) {
    next(error);
  }
});
