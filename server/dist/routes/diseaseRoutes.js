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
    }
    catch (error) {
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
    }
    catch (error) {
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
        const timeSeries = await diseaseService.getDiseaseTimeSeries(diseaseId, startDate, endDate, locationUid);
        res.json({
            success: true,
            data: timeSeries,
            count: timeSeries.length,
        });
    }
    catch (error) {
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
        const hierarchyLevel = parseInt(req.query.hierarchyLevel) || 2;
        logger.debug({ diseaseId, hierarchyLevel }, "GET /api/diseases/:diseaseId/locations");
        const locations = await diseaseService.getDiseaseCasesByLocation(diseaseId, hierarchyLevel);
        res.json({
            success: true,
            data: locations,
            count: locations.length,
        });
    }
    catch (error) {
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
        const locationUid = req.query.locationUid;
        const days = req.query.days ? parseInt(req.query.days) : undefined;
        const diseaseId = req.query.diseaseId;
        logger.debug({ locationUid, days, diseaseId }, "GET /api/diseases/breakdown/all");
        const breakdown = await diseaseService.getDiseaseBreakdown(locationUid, days, diseaseId);
        res.json({
            success: true,
            data: breakdown,
            count: breakdown.length,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/diseases/:diseaseId/facilities
 * Get facility performance data for a disease
 * Query params: locationUid, limit
 */
diseaseRouter.get("/:diseaseId/facilities", async (req, res, next) => {
    try {
        const { diseaseId } = req.params;
        const locationUid = req.query.locationUid;
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;
        logger.debug({ diseaseId, locationUid, limit }, "GET /api/diseases/:diseaseId/facilities");
        const facilities = await diseaseService.getFacilityPerformance(diseaseId, locationUid, limit);
        res.json({
            success: true,
            data: facilities,
            count: facilities.length,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/diseases/malaria/species
 * Get malaria species distribution
 * Query params: locationUid
 */
diseaseRouter.get("/malaria/species", async (req, res, next) => {
    try {
        const locationUid = req.query.locationUid;
        logger.debug({ locationUid }, "GET /api/diseases/malaria/species");
        const species = await diseaseService.getMalariaSpeciesDistribution(locationUid);
        res.json({
            success: true,
            data: species,
            count: species.length,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/diseases/:diseaseId/treatment
 * Get treatment timeline data (currently only for malaria)
 * Query params: locationUid
 */
diseaseRouter.get("/:diseaseId/treatment", async (req, res, next) => {
    try {
        const { diseaseId } = req.params;
        const locationUid = req.query.locationUid;
        logger.debug({ diseaseId, locationUid }, "GET /api/diseases/:diseaseId/treatment");
        const treatment = await diseaseService.getTreatmentTimeline(diseaseId, locationUid);
        res.json({
            success: true,
            data: treatment,
            count: treatment.length,
        });
    }
    catch (error) {
        next(error);
    }
});
