"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.diseaseRouter = void 0;
const express_1 = require("express");
const diseaseService_js_1 = require("../services/diseaseService.js");
const logger_js_1 = __importDefault(require("../services/logger.js"));
exports.diseaseRouter = (0, express_1.Router)();
/**
 * GET /api/diseases
 * List all diseases with available data
 */
exports.diseaseRouter.get("/", async (_req, res, next) => {
    try {
        logger_js_1.default.debug("GET /api/diseases");
        const diseases = await diseaseService_js_1.diseaseService.getAllDiseases();
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
exports.diseaseRouter.get("/:diseaseId/summary", async (req, res, next) => {
    try {
        const { diseaseId } = req.params;
        logger_js_1.default.debug({ diseaseId }, "GET /api/diseases/:diseaseId/summary");
        const summary = await diseaseService_js_1.diseaseService.getDiseaseSummary(diseaseId);
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
exports.diseaseRouter.get("/:diseaseId/timeseries", async (req, res, next) => {
    try {
        const { diseaseId } = req.params;
        const { startDate, endDate, locationUid } = req.query;
        logger_js_1.default.debug({ diseaseId, startDate, endDate, locationUid }, "GET /api/diseases/:diseaseId/timeseries");
        const timeSeries = await diseaseService_js_1.diseaseService.getDiseaseTimeSeries(diseaseId, startDate, endDate, locationUid);
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
exports.diseaseRouter.get("/:diseaseId/locations", async (req, res, next) => {
    try {
        const { diseaseId } = req.params;
        const hierarchyLevel = parseInt(req.query.hierarchyLevel) || 2;
        logger_js_1.default.debug({ diseaseId, hierarchyLevel }, "GET /api/diseases/:diseaseId/locations");
        const locations = await diseaseService_js_1.diseaseService.getDiseaseCasesByLocation(diseaseId, hierarchyLevel);
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
exports.diseaseRouter.get("/breakdown/all", async (req, res, next) => {
    try {
        const locationUid = req.query.locationUid;
        const days = req.query.days ? parseInt(req.query.days) : undefined;
        const diseaseId = req.query.diseaseId;
        logger_js_1.default.debug({ locationUid, days, diseaseId }, "GET /api/diseases/breakdown/all");
        const breakdown = await diseaseService_js_1.diseaseService.getDiseaseBreakdown(locationUid, days, diseaseId);
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
