"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const climateService_1 = __importDefault(require("../services/climateService"));
const logger_1 = __importDefault(require("../services/logger"));
const router = (0, express_1.Router)();
/**
 * GET /api/climate/:locationUid
 * Get climate data for a specific location
 * Query params:
 *   - startDate: Start date (YYYY-MM-DD)
 *   - endDate: End date (YYYY-MM-DD)
 *   - aggregation: 'day' | 'week' | 'month' (default: 'day')
 */
router.get('/:locationUid', async (req, res) => {
    try {
        const { locationUid } = req.params;
        const { startDate, endDate, aggregation = 'day' } = req.query;
        // Validate required parameters
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'startDate and endDate query parameters are required (format: YYYY-MM-DD)'
            });
        }
        logger_1.default.info(`Climate data request: ${locationUid}, ${startDate} to ${endDate}, aggregation: ${aggregation}`);
        let data;
        if (aggregation === 'week' || aggregation === 'month') {
            data = await climateService_1.default.getAggregatedClimateData(locationUid, startDate, endDate, aggregation);
        }
        else {
            data = await climateService_1.default.getClimateData(locationUid, startDate, endDate);
        }
        res.json({
            success: true,
            data,
            count: data.length,
            meta: {
                locationUid,
                startDate,
                endDate,
                aggregation
            }
        });
    }
    catch (error) {
        logger_1.default.error({ error }, 'Error in GET /api/climate/:locationUid');
        res.status(500).json({
            success: false,
            error: 'Failed to fetch climate data',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * GET /api/climate/:locationUid/statistics
 * Get climate statistics for a location
 */
router.get('/:locationUid/statistics', async (req, res) => {
    try {
        const { locationUid } = req.params;
        logger_1.default.info(`Climate statistics request: ${locationUid}`);
        const stats = await climateService_1.default.getClimateStatistics(locationUid);
        if (!stats) {
            return res.status(404).json({
                success: false,
                error: 'No climate data found for this location'
            });
        }
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        logger_1.default.error({ error }, 'Error in GET /api/climate/:locationUid/statistics');
        res.status(500).json({
            success: false,
            error: 'Failed to fetch climate statistics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * POST /api/climate/sync
 * Trigger climate data synchronization for all districts
 * Body:
 *   - startDate: Start date (YYYY-MM-DD)
 *   - endDate: End date (YYYY-MM-DD)
 */
router.post('/sync', async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'startDate and endDate are required in request body'
            });
        }
        logger_1.default.info(`Climate sync requested: ${startDate} to ${endDate}`);
        // Run sync in background (don't wait for completion)
        climateService_1.default.syncAllDistricts(startDate, endDate)
            .then(() => logger_1.default.info('Climate sync completed'))
            .catch(error => logger_1.default.error('Climate sync failed:', error));
        res.json({
            success: true,
            message: 'Climate data synchronization started',
            meta: {
                startDate,
                endDate
            }
        });
    }
    catch (error) {
        logger_1.default.error({ error }, 'Error in POST /api/climate/sync');
        res.status(500).json({
            success: false,
            error: 'Failed to start climate data sync',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * GET /api/climate/cache/status
 * Get cache status for all districts
 */
router.get('/cache/status', async (req, res) => {
    try {
        const query = `
      SELECT
        cd.location_uid,
        ou.name as location_name,
        COUNT(*) as records_count,
        MIN(cd.date) as earliest_date,
        MAX(cd.date) as latest_date,
        COUNT(DISTINCT cd.source) as sources_count,
        array_agg(DISTINCT cd.source) as sources
      FROM climate_data cd
      JOIN organisationunit ou ON cd.location_uid = ou.uid
      WHERE ou.hierarchylevel = 2
      GROUP BY cd.location_uid, ou.name
      ORDER BY ou.name
    `;
        // Use a local import to avoid circular dependencies
        const { postgresService } = await Promise.resolve().then(() => __importStar(require('../services/postgresService')));
        const result = await postgresService.query(query);
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    }
    catch (error) {
        logger_1.default.error({ error }, 'Error in GET /api/climate/cache/status');
        res.status(500).json({
            success: false,
            error: 'Failed to fetch cache status',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
