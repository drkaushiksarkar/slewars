"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.locationRouter = void 0;
const express_1 = require("express");
const locationService_js_1 = require("../services/locationService.js");
const logger_js_1 = __importDefault(require("../services/logger.js"));
exports.locationRouter = (0, express_1.Router)();
/**
 * GET /api/locations
 * Get organization unit hierarchy
 * Query params: level (optional)
 */
exports.locationRouter.get("/", async (req, res, next) => {
    try {
        const { level } = req.query;
        logger_js_1.default.debug({ level }, "GET /api/locations");
        let locations;
        if (level) {
            locations = await locationService_js_1.locationService.getLocationsByLevel(parseInt(level));
        }
        else {
            locations = await locationService_js_1.locationService.getAllLocations();
        }
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
 * GET /api/locations/hierarchy
 * Get location hierarchy tree structure
 * Query params: rootUid (optional)
 */
exports.locationRouter.get("/hierarchy", async (req, res, next) => {
    try {
        const { rootUid } = req.query;
        logger_js_1.default.debug({ rootUid }, "GET /api/locations/hierarchy");
        const hierarchy = await locationService_js_1.locationService.getLocationHierarchy(rootUid);
        res.json({
            success: true,
            data: hierarchy,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/locations/:uid
 * Get specific location details
 */
exports.locationRouter.get("/:uid", async (req, res, next) => {
    try {
        const { uid } = req.params;
        logger_js_1.default.debug({ uid }, "GET /api/locations/:uid");
        const location = await locationService_js_1.locationService.getLocationByUid(uid);
        if (!location) {
            return res.status(404).json({
                success: false,
                message: `Location '${uid}' not found`,
            });
        }
        res.json({
            success: true,
            data: location,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/locations/:uid/children
 * Get children of a location
 */
exports.locationRouter.get("/:uid/children", async (req, res, next) => {
    try {
        const { uid } = req.params;
        logger_js_1.default.debug({ uid }, "GET /api/locations/:uid/children");
        const children = await locationService_js_1.locationService.getLocationChildren(uid);
        res.json({
            success: true,
            data: children,
            count: children.length,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/locations/:uid/data
 * Get disease data for a specific location
 * Query params: startDate, endDate
 */
exports.locationRouter.get("/:uid/data", async (req, res, next) => {
    try {
        const { uid } = req.params;
        const { startDate, endDate } = req.query;
        logger_js_1.default.debug({ uid, startDate, endDate }, "GET /api/locations/:uid/data");
        const data = await locationService_js_1.locationService.getLocationData(uid, startDate, endDate);
        if (!data) {
            return res.status(404).json({
                success: false,
                message: `Location '${uid}' not found`,
            });
        }
        res.json({
            success: true,
            data,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/locations/districts/comparison
 * Get district comparison data
 */
exports.locationRouter.get("/districts/comparison", async (_req, res, next) => {
    try {
        logger_js_1.default.debug("GET /api/locations/districts/comparison");
        const comparison = await locationService_js_1.locationService.getDistrictComparison();
        res.json({
            success: true,
            data: comparison,
            count: comparison.length,
        });
    }
    catch (error) {
        next(error);
    }
});
