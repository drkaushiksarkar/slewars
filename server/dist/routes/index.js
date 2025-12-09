import { Router } from "express";
import { configRouter } from "./configRoutes.js";
import { dataRouter } from "./dataRoutes.js";
import { mlRouter } from "./mlRoutes.js";
import { dhis2Router } from "./dhis2Routes.js";
import { diseaseRouter } from "./diseaseRoutes.js";
import { locationRouter } from "./locationRoutes.js";
import { analyticsRouter } from "./analyticsRoutes.js";
import climateRouter from "./climateRoutes.js";
import forecastRouter from "./forecastRoutes.js";
import { postgresService } from "../services/postgresService.js";
import logger from "../services/logger.js";
const router = Router();
// Health check endpoint
router.get("/health", async (_req, res) => {
    try {
        const dbHealthy = await postgresService.healthCheck();
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
        logger.error({ error }, "Health check failed");
        res.status(503).json({
            status: "unhealthy",
            timestamp: new Date().toISOString(),
            error: "Health check failed",
        });
    }
});
// Existing routes
router.use("/config", configRouter);
router.use("/data", dataRouter);
router.use("/ml", mlRouter);
router.use("/dhis2", dhis2Router);
// New Phase 1 routes
router.use("/diseases", diseaseRouter);
router.use("/locations", locationRouter);
router.use("/analytics", analyticsRouter);
// Phase 5 routes - Climate data integration
router.use("/climate", climateRouter);
// Phase 6 routes - Disease forecasting
router.use("/forecast", forecastRouter);
export default router;
