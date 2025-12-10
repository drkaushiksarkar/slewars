"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRouter = void 0;
const express_1 = require("express");
const analyticsService_js_1 = require("../services/analyticsService.js");
const logger_js_1 = __importDefault(require("../services/logger.js"));
exports.analyticsRouter = (0, express_1.Router)();
/**
 * GET /api/analytics/overview
 * Get overview metrics (KPIs)
 * Query params: locationUid, days, diseaseId
 */
exports.analyticsRouter.get("/overview", async (req, res, next) => {
    try {
        const locationUid = req.query.locationUid;
        const days = req.query.days ? parseInt(req.query.days) : 30;
        const diseaseId = req.query.diseaseId;
        logger_js_1.default.debug({ locationUid, days, diseaseId }, "GET /api/analytics/overview");
        const metrics = await analyticsService_js_1.analyticsService.getOverviewMetrics(locationUid, days, diseaseId);
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
exports.analyticsRouter.get("/outbreak-detection", async (req, res, next) => {
    try {
        const locationUid = req.query.locationUid;
        const diseaseId = req.query.diseaseId;
        logger_js_1.default.debug({ locationUid, diseaseId }, "GET /api/analytics/outbreak-detection");
        const alerts = await analyticsService_js_1.analyticsService.detectOutbreaks(locationUid, diseaseId);
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
exports.analyticsRouter.get("/trends", async (req, res, next) => {
    try {
        const weeks = parseInt(req.query.weeks) || 12;
        const locationUid = req.query.locationUid;
        const diseaseId = req.query.diseaseId;
        logger_js_1.default.debug({ weeks, locationUid, diseaseId }, "GET /api/analytics/trends");
        const trends = await analyticsService_js_1.analyticsService.getTrendData(weeks, locationUid, diseaseId);
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
 * Query params: days (default: 90), startDate, endDate, disease, location, adminLevel (2=District, 3=Chiefdom, 4=Facility)
 */
exports.analyticsRouter.get("/heatmap", async (req, res, next) => {
    try {
        const days = req.query.days ? parseInt(req.query.days) : 90;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const disease = req.query.disease;
        const location = req.query.location;
        const adminLevel = req.query.adminLevel ? parseInt(req.query.adminLevel) : 2;
        logger_js_1.default.debug({ days, startDate, endDate, disease, location, adminLevel }, "GET /api/analytics/heatmap");
        const heatmap = await analyticsService_js_1.analyticsService.getGeographicHeatMap(days, startDate, endDate, disease, location, adminLevel);
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
exports.analyticsRouter.get("/data-quality", async (_req, res, next) => {
    try {
        logger_js_1.default.debug("GET /api/analytics/data-quality");
        const quality = await analyticsService_js_1.analyticsService.getDataQualityMetrics();
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
