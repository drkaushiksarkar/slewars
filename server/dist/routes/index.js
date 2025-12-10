"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const configRoutes_js_1 = require("./configRoutes.js");
const dataRoutes_js_1 = require("./dataRoutes.js");
const mlRoutes_js_1 = require("./mlRoutes.js");
const dhis2Routes_js_1 = require("./dhis2Routes.js");
const diseaseRoutes_js_1 = require("./diseaseRoutes.js");
const locationRoutes_js_1 = require("./locationRoutes.js");
const analyticsRoutes_js_1 = require("./analyticsRoutes.js");
const climateRoutes_js_1 = __importDefault(require("./climateRoutes.js"));
const forecastRoutes_js_1 = __importDefault(require("./forecastRoutes.js"));
const postgresService_js_1 = require("../services/postgresService.js");
const logger_js_1 = __importDefault(require("../services/logger.js"));
const router = (0, express_1.Router)();
// Health check endpoint
router.get("/health", async (_req, res) => {
    try {
        const dbHealthy = await postgresService_js_1.postgresService.healthCheck();
        const status = dbHealthy ? "healthy" : "unhealthy";
        res.status(dbHealthy ? 200 : 503).json({
            status,
            timestamp: new Date().toISOString(),
            database: dbHealthy ? "connected" : "disconnected",
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || "development",
        });
    }
    catch (error) {
        logger_js_1.default.error({ error }, "Health check failed");
        res.status(503).json({
            status: "unhealthy",
            timestamp: new Date().toISOString(),
            error: "Health check failed",
        });
    }
});
// Existing routes
router.use("/config", configRoutes_js_1.configRouter);
router.use("/data", dataRoutes_js_1.dataRouter);
router.use("/ml", mlRoutes_js_1.mlRouter);
router.use("/dhis2", dhis2Routes_js_1.dhis2Router);
// New Phase 1 routes
router.use("/diseases", diseaseRoutes_js_1.diseaseRouter);
router.use("/locations", locationRoutes_js_1.locationRouter);
router.use("/analytics", analyticsRoutes_js_1.analyticsRouter);
// Phase 5 routes - Climate data integration
router.use("/climate", climateRoutes_js_1.default);
// Phase 6 routes - Disease forecasting
router.use("/forecast", forecastRoutes_js_1.default);
exports.default = router;
