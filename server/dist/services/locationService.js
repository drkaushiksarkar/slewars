"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.locationService = void 0;
const postgresService_js_1 = require("./postgresService.js");
const logger_js_1 = __importDefault(require("./logger.js"));
class LocationService {
    /**
     * Get all organization units
     */
    async getAllLocations() {
        try {
            logger_js_1.default.debug("Fetching all locations");
            const query = `
        SELECT
          ou.uid,
          ou.name,
          ou.shortname,
          ou.code,
          ou.path,
          ou.hierarchylevel,
          ou.parentid,
          ou.description,
          ST_AsGeoJSON(ou.geometry) as geometry
        FROM organisationunit ou
        ORDER BY ou.hierarchylevel, ou.name
      `;
            const result = await postgresService_js_1.postgresService.query(query);
            return result.rows.map((row) => ({
                uid: row.uid,
                name: row.name,
                shortName: row.shortname,
                code: row.code,
                path: row.path,
                hierarchyLevel: row.hierarchylevel,
                parentId: row.parentid,
                description: row.description,
                geometry: row.geometry ? JSON.parse(row.geometry) : null,
            }));
        }
        catch (error) {
            logger_js_1.default.error({ error }, "Error fetching all locations");
            throw error;
        }
    }
    /**
     * Get organization units by hierarchy level
     */
    async getLocationsByLevel(level) {
        try {
            logger_js_1.default.debug({ level }, "Fetching locations by level");
            const query = `
        SELECT
          ou.uid,
          ou.name,
          ou.shortname,
          ou.code,
          ou.path,
          ou.hierarchylevel,
          ou.parentid,
          parent.uid as parent_uid,
          ou.description,
          ST_AsGeoJSON(ou.geometry) as geometry
        FROM organisationunit ou
        LEFT JOIN organisationunit parent ON ou.parentid = parent.organisationunitid
        WHERE ou.hierarchylevel = $1
        ORDER BY ou.name
      `;
            const result = await postgresService_js_1.postgresService.query(query, [level]);
            return result.rows.map((row) => ({
                uid: row.uid,
                name: row.name,
                shortName: row.shortname,
                code: row.code,
                path: row.path,
                hierarchyLevel: row.hierarchylevel,
                parentId: row.parentid,
                parentUid: row.parent_uid,
                description: row.description,
                geometry: row.geometry ? JSON.parse(row.geometry) : null,
            }));
        }
        catch (error) {
            logger_js_1.default.error({ error, level }, "Error fetching locations by level");
            throw error;
        }
    }
    /**
     * Get a specific location by UID
     */
    async getLocationByUid(uid) {
        try {
            logger_js_1.default.debug({ uid }, "Fetching location by UID");
            const query = `
        SELECT
          ou.uid,
          ou.name,
          ou.shortname,
          ou.code,
          ou.path,
          ou.hierarchylevel,
          ou.parentid,
          parent.uid as parent_uid,
          ou.description,
          ST_AsGeoJSON(ou.geometry) as geometry
        FROM organisationunit ou
        LEFT JOIN organisationunit parent ON ou.parentid = parent.organisationunitid
        WHERE ou.uid = $1
      `;
            const result = await postgresService_js_1.postgresService.query(query, [uid]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            return {
                uid: row.uid,
                name: row.name,
                shortName: row.shortname,
                code: row.code,
                path: row.path,
                hierarchyLevel: row.hierarchylevel,
                parentId: row.parentid,
                parentUid: row.parent_uid,
                description: row.description,
                geometry: row.geometry ? JSON.parse(row.geometry) : null,
            };
        }
        catch (error) {
            logger_js_1.default.error({ error, uid }, "Error fetching location by UID");
            throw error;
        }
    }
    /**
     * Get children of a location
     */
    async getLocationChildren(uid) {
        try {
            logger_js_1.default.debug({ uid }, "Fetching location children");
            const query = `
        SELECT
          child.uid,
          child.name,
          child.shortname,
          child.code,
          child.path,
          child.hierarchylevel,
          child.parentid,
          child.description,
          ST_AsGeoJSON(child.geometry) as geometry
        FROM organisationunit parent
        JOIN organisationunit child ON child.parentid = parent.organisationunitid
        WHERE parent.uid = $1
        ORDER BY child.name
      `;
            const result = await postgresService_js_1.postgresService.query(query, [uid]);
            return result.rows.map((row) => ({
                uid: row.uid,
                name: row.name,
                shortName: row.shortname,
                code: row.code,
                path: row.path,
                hierarchyLevel: row.hierarchylevel,
                parentId: row.parentid,
                description: row.description,
                geometry: row.geometry ? JSON.parse(row.geometry) : null,
            }));
        }
        catch (error) {
            logger_js_1.default.error({ error, uid }, "Error fetching location children");
            throw error;
        }
    }
    /**
     * Get location hierarchy (tree structure)
     */
    async getLocationHierarchy(rootUid) {
        try {
            logger_js_1.default.debug({ rootUid }, "Fetching location hierarchy");
            // First, get all locations
            let query = `
        SELECT
          ou.organisationunitid,
          ou.uid,
          ou.name,
          ou.hierarchylevel,
          ou.parentid,
          ST_AsGeoJSON(ou.geometry) as geometry
        FROM organisationunit ou
      `;
            const params = [];
            if (rootUid) {
                query += ` WHERE ou.uid = $1 OR ou.path LIKE '%' || (SELECT uid FROM organisationunit WHERE uid = $1) || '%'`;
                params.push(rootUid);
            }
            query += ` ORDER BY ou.hierarchylevel, ou.name`;
            const result = await postgresService_js_1.postgresService.query(query, params);
            // Build the tree structure
            const locationsMap = new Map();
            const roots = [];
            result.rows.forEach((row) => {
                const location = {
                    uid: row.uid,
                    name: row.name,
                    level: row.hierarchylevel,
                    children: [],
                    geometry: row.geometry ? JSON.parse(row.geometry) : null,
                };
                locationsMap.set(row.organisationunitid, location);
            });
            result.rows.forEach((row) => {
                const location = locationsMap.get(row.organisationunitid);
                if (location) {
                    if (row.parentid) {
                        const parent = locationsMap.get(row.parentid);
                        if (parent) {
                            parent.children.push(location);
                        }
                        else {
                            roots.push(location);
                        }
                    }
                    else {
                        roots.push(location);
                    }
                }
            });
            return roots;
        }
        catch (error) {
            logger_js_1.default.error({ error, rootUid }, "Error fetching location hierarchy");
            throw error;
        }
    }
    /**
     * Get disease data for a specific location
     */
    async getLocationData(uid, startDate, endDate) {
        try {
            logger_js_1.default.debug({ uid, startDate, endDate }, "Fetching location data");
            // First get the location details
            const location = await this.getLocationByUid(uid);
            if (!location) {
                return null;
            }
            // Build query to get all disease data for this location
            let query = `
        SELECT
          de.name as disease,
          SUM(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as cases
        FROM datavalue dv
        JOIN dataelement de ON dv.dataelementid = de.dataelementid
        JOIN period p ON dv.periodid = p.periodid
        JOIN organisationunit ou ON dv.sourceid = ou.organisationunitid
        WHERE dv.deleted = false
          AND ou.uid = $1
          AND dv.value IS NOT NULL
      `;
            const params = [uid];
            let paramIndex = 2;
            if (startDate) {
                query += ` AND p.startdate >= $${paramIndex}`;
                params.push(startDate);
                paramIndex++;
            }
            if (endDate) {
                query += ` AND p.enddate <= $${paramIndex}`;
                params.push(endDate);
                paramIndex++;
            }
            query += `
        GROUP BY de.name
        ORDER BY cases DESC
      `;
            const result = await postgresService_js_1.postgresService.query(query, params);
            const diseases = result.rows.map((row) => ({
                disease: row.disease,
                cases: parseInt(row.cases) || 0,
            }));
            const totalCases = diseases.reduce((sum, d) => sum + d.cases, 0);
            const totalDeaths = diseases
                .filter((d) => d.disease.toLowerCase().includes("death"))
                .reduce((sum, d) => sum + d.cases, 0);
            return {
                uid: location.uid,
                name: location.name,
                hierarchyLevel: location.hierarchyLevel,
                totalCases,
                totalDeaths,
                diseases,
            };
        }
        catch (error) {
            logger_js_1.default.error({ error, uid }, "Error fetching location data");
            throw error;
        }
    }
    /**
     * Get district comparison data
     */
    async getDistrictComparison() {
        try {
            logger_js_1.default.debug("Fetching district comparison data");
            const query = `
        SELECT
          ou.uid,
          ou.name as district_name,
          ST_AsGeoJSON(ou.geometry) as geometry,
          COUNT(DISTINCT de.dataelementid) as disease_types,
          SUM(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as total_cases,
          COUNT(DISTINCT dv.sourceid) as facilities_reporting
        FROM organisationunit ou
        LEFT JOIN datavalue dv ON dv.sourceid IN (
          SELECT child.organisationunitid
          FROM organisationunit child
          WHERE child.path LIKE '%' || ou.uid || '%'
        )
        LEFT JOIN dataelement de ON dv.dataelementid = de.dataelementid AND dv.deleted = false
        WHERE ou.hierarchylevel = 2
        GROUP BY ou.uid, ou.name, ou.geometry
        ORDER BY total_cases DESC
      `;
            const result = await postgresService_js_1.postgresService.query(query);
            return result.rows.map((row) => ({
                uid: row.uid,
                districtName: row.district_name,
                geometry: row.geometry ? JSON.parse(row.geometry) : null,
                diseaseTypes: parseInt(row.disease_types) || 0,
                totalCases: parseInt(row.total_cases) || 0,
                facilitiesReporting: parseInt(row.facilities_reporting) || 0,
            }));
        }
        catch (error) {
            logger_js_1.default.error({ error }, "Error fetching district comparison data");
            throw error;
        }
    }
}
exports.locationService = new LocationService();
