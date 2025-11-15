import { Router } from "express";
import { locationService } from "../services/locationService.js";
import logger from "../services/logger.js";

export const locationRouter = Router();

/**
 * GET /api/locations
 * Get organization unit hierarchy
 * Query params: level (optional)
 */
locationRouter.get("/", async (req, res, next) => {
  try {
    const { level } = req.query;
    logger.debug({ level }, "GET /api/locations");

    let locations;
    if (level) {
      locations = await locationService.getLocationsByLevel(parseInt(level as string));
    } else {
      locations = await locationService.getAllLocations();
    }

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
 * GET /api/locations/hierarchy
 * Get location hierarchy tree structure
 * Query params: rootUid (optional)
 */
locationRouter.get("/hierarchy", async (req, res, next) => {
  try {
    const { rootUid } = req.query;
    logger.debug({ rootUid }, "GET /api/locations/hierarchy");

    const hierarchy = await locationService.getLocationHierarchy(rootUid as string | undefined);

    res.json({
      success: true,
      data: hierarchy,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/locations/:uid
 * Get specific location details
 */
locationRouter.get("/:uid", async (req, res, next) => {
  try {
    const { uid } = req.params;
    logger.debug({ uid }, "GET /api/locations/:uid");

    const location = await locationService.getLocationByUid(uid);

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
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/locations/:uid/children
 * Get children of a location
 */
locationRouter.get("/:uid/children", async (req, res, next) => {
  try {
    const { uid } = req.params;
    logger.debug({ uid }, "GET /api/locations/:uid/children");

    const children = await locationService.getLocationChildren(uid);

    res.json({
      success: true,
      data: children,
      count: children.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/locations/:uid/data
 * Get disease data for a specific location
 * Query params: startDate, endDate
 */
locationRouter.get("/:uid/data", async (req, res, next) => {
  try {
    const { uid } = req.params;
    const { startDate, endDate } = req.query;
    logger.debug({ uid, startDate, endDate }, "GET /api/locations/:uid/data");

    const data = await locationService.getLocationData(
      uid,
      startDate as string | undefined,
      endDate as string | undefined
    );

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
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/locations/districts/comparison
 * Get district comparison data
 */
locationRouter.get("/districts/comparison", async (_req, res, next) => {
  try {
    logger.debug("GET /api/locations/districts/comparison");

    const comparison = await locationService.getDistrictComparison();

    res.json({
      success: true,
      data: comparison,
      count: comparison.length,
    });
  } catch (error) {
    next(error);
  }
});
