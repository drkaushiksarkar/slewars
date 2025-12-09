import { postgresService } from "./postgresService.js";
import logger from "./logger.js";
class LocationService {
    /**
     * Get all organization units
     */
    async getAllLocations() {
        try {
            logger.debug("Fetching all locations");
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
            const result = await postgresService.query(query);
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
            logger.error({ error }, "Error fetching all locations");
            throw error;
        }
    }
    /**
     * Get organization units by hierarchy level
     */
    async getLocationsByLevel(level) {
        try {
            logger.debug({ level }, "Fetching locations by level");
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
            const result = await postgresService.query(query, [level]);
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
            logger.error({ error, level }, "Error fetching locations by level");
            throw error;
        }
    }
    /**
     * Get a specific location by UID
     */
    async getLocationByUid(uid) {
        try {
            logger.debug({ uid }, "Fetching location by UID");
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
            const result = await postgresService.query(query, [uid]);
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
            logger.error({ error, uid }, "Error fetching location by UID");
            throw error;
        }
    }
    /**
     * Get children of a location
     */
    async getLocationChildren(uid) {
        try {
            logger.debug({ uid }, "Fetching location children");
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
            const result = await postgresService.query(query, [uid]);
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
            logger.error({ error, uid }, "Error fetching location children");
            throw error;
        }
    }
    /**
     * Get location hierarchy (tree structure)
     */
    async getLocationHierarchy(rootUid) {
        try {
            logger.debug({ rootUid }, "Fetching location hierarchy");
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
            const result = await postgresService.query(query, params);
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
            logger.error({ error, rootUid }, "Error fetching location hierarchy");
            throw error;
        }
    }
    /**
     * Get disease data for a specific location
     */
    async getLocationData(uid, startDate, endDate) {
        try {
            logger.debug({ uid, startDate, endDate }, "Fetching location data");
            // First get the location details
            const location = await this.getLocationByUid(uid);
            if (!location) {
                return null;
            }
            // Disease case and death data element UIDs
            const caseUIDs = ['vq2qO3eTrNi', 'YazgqXbizv1', 'Cj5rTc9nEvl', 'XWU1Huh0Luy', 'UsSUX0cpKsH', 'NCteyX2xpMf'];
            const deathUIDs = ['r6nrJANOqMw', 'f7n9E0hX8qk', 'Yy9NtNfwYZJ', 'USBq0VHSkZq', 'eY5ehpbEsB7'];
            const diseaseUIDs = [...caseUIDs, ...deathUIDs];
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
          AND de.uid = ANY($2::text[])
      `;
            const params = [uid, diseaseUIDs];
            let paramIndex = 3;
            // Use overlap logic to include monthly/weekly periods
            if (startDate && endDate) {
                query += ` AND p.startdate <= $${paramIndex + 1} AND p.enddate >= $${paramIndex}`;
                params.push(startDate, endDate);
                paramIndex += 2;
            }
            else if (startDate) {
                query += ` AND p.enddate >= $${paramIndex}`;
                params.push(startDate);
                paramIndex++;
            }
            else if (endDate) {
                query += ` AND p.startdate <= $${paramIndex}`;
                params.push(endDate);
                paramIndex++;
            }
            query += `
        GROUP BY de.name
        ORDER BY cases DESC
      `;
            const result = await postgresService.query(query, params);
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
            logger.error({ error, uid }, "Error fetching location data");
            throw error;
        }
    }
    /**
     * Get district comparison data
     */
    async getDistrictComparison() {
        try {
            logger.debug("Fetching district comparison data");
            // Disease case data element UIDs
            const diseaseUIDs = ['vq2qO3eTrNi', 'YazgqXbizv1', 'Cj5rTc9nEvl', 'XWU1Huh0Luy', 'UsSUX0cpKsH', 'NCteyX2xpMf'];
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
        LEFT JOIN dataelement de ON dv.dataelementid = de.dataelementid AND dv.deleted = false AND de.uid = ANY($1::text[])
        WHERE ou.hierarchylevel = 2
        GROUP BY ou.uid, ou.name, ou.geometry
        ORDER BY total_cases DESC
      `;
            const result = await postgresService.query(query, [diseaseUIDs]);
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
            logger.error({ error }, "Error fetching district comparison data");
            throw error;
        }
    }
    /**
     * Get facility-level data with performance metrics
     */
    async getFacilityPerformance(districtUid, startDate, endDate, diseaseFilter) {
        try {
            logger.debug({ districtUid, startDate, endDate, diseaseFilter }, "Fetching facility performance data");
            // Disease case and death data element UIDs - filter by specific disease if provided
            let caseUIDs = ['vq2qO3eTrNi', 'YazgqXbizv1', 'Cj5rTc9nEvl', 'XWU1Huh0Luy', 'UsSUX0cpKsH', 'NCteyX2xpMf'];
            let deathUIDs = ['r6nrJANOqMw', 'f7n9E0hX8qk', 'Yy9NtNfwYZJ', 'USBq0VHSkZq', 'eY5ehpbEsB7'];
            if (diseaseFilter && diseaseFilter !== 'all') {
                // For specific disease, get only that disease's UIDs
                const diseaseMap = {
                    'malaria': { case: 'vq2qO3eTrNi', death: 'r6nrJANOqMw' },
                    'measles': { case: 'YazgqXbizv1', death: 'f7n9E0hX8qk' },
                    'typhoid': { case: 'Cj5rTc9nEvl', death: 'Yy9NtNfwYZJ' },
                    'yellowFever': { case: 'XWU1Huh0Luy', death: 'USBq0VHSkZq' },
                    'cholera': { case: 'UsSUX0cpKsH', death: 'eY5ehpbEsB7' },
                    'lassaFever': { case: 'NCteyX2xpMf', death: '' },
                };
                const diseaseUIDs = diseaseMap[diseaseFilter];
                if (diseaseUIDs) {
                    caseUIDs = [diseaseUIDs.case];
                    deathUIDs = diseaseUIDs.death ? [diseaseUIDs.death] : [];
                }
            }
            let query = `
        WITH facility_data AS (
          SELECT
            ou.organisationunitid,
            ou.uid,
            ou.name as facility_name,
            parent.name as district_name,
            parent.uid as district_uid,
            ou.hierarchylevel,
            SUM(CASE WHEN dv.value ~ '^[0-9]+$' AND de.uid = ANY($1::text[]) THEN CAST(dv.value AS INTEGER) ELSE 0 END) as total_cases,
            SUM(CASE WHEN dv.value ~ '^[0-9]+$' AND de.uid = ANY($2::text[]) THEN CAST(dv.value AS INTEGER) ELSE 0 END) as total_deaths,
            MAX(dv.lastupdated) as last_report_date,
            COUNT(DISTINCT dv.periodid) as reporting_periods,
            COUNT(DISTINCT de.dataelementid) as data_elements_reported
          FROM organisationunit ou
          LEFT JOIN organisationunit parent ON ou.parentid = parent.organisationunitid
          LEFT JOIN datavalue dv ON dv.sourceid = ou.organisationunitid AND dv.deleted = false
          LEFT JOIN dataelement de ON dv.dataelementid = de.dataelementid
          LEFT JOIN period p ON dv.periodid = p.periodid
          WHERE ou.hierarchylevel = 4
      `;
            const params = [caseUIDs, deathUIDs];
            let paramIndex = 3;
            if (districtUid) {
                query += ` AND parent.uid = $${paramIndex}`;
                params.push(districtUid);
                paramIndex++;
            }
            // Use overlap logic to include monthly/weekly periods
            if (startDate && endDate) {
                query += ` AND p.startdate <= $${paramIndex + 1} AND p.enddate >= $${paramIndex}`;
                params.push(startDate, endDate);
                paramIndex += 2;
            }
            else if (startDate) {
                query += ` AND p.enddate >= $${paramIndex}`;
                params.push(startDate);
                paramIndex++;
            }
            else if (endDate) {
                query += ` AND p.startdate <= $${paramIndex}`;
                params.push(endDate);
                paramIndex++;
            }
            query += `
          GROUP BY ou.organisationunitid, ou.uid, ou.name, parent.name, parent.uid, ou.hierarchylevel
        )
        SELECT
          uid,
          facility_name,
          district_name,
          district_uid,
          hierarchylevel,
          total_cases,
          total_deaths,
          CASE
            WHEN total_cases > 0 THEN ROUND((total_deaths::DECIMAL / total_cases::DECIMAL) * 100, 2)
            ELSE 0
          END as case_fatality_rate,
          last_report_date,
          reporting_periods,
          data_elements_reported,
          CASE
            WHEN last_report_date > NOW() - INTERVAL '7 days' THEN 'Active'
            WHEN last_report_date > NOW() - INTERVAL '30 days' THEN 'Delayed'
            ELSE 'Inactive'
          END as status,
          CASE
            WHEN last_report_date IS NULL THEN NULL
            ELSE EXTRACT(EPOCH FROM (NOW() - last_report_date)) / 86400
          END as days_since_report
        FROM facility_data
        ORDER BY total_cases DESC, facility_name
        LIMIT 500
      `;
            const result = await postgresService.query(query, params);
            return result.rows.map((row) => ({
                uid: row.uid,
                facilityName: row.facility_name,
                districtName: row.district_name,
                districtUid: row.district_uid,
                hierarchyLevel: row.hierarchylevel,
                totalCases: parseInt(row.total_cases) || 0,
                totalDeaths: parseInt(row.total_deaths) || 0,
                caseFatalityRate: parseFloat(row.case_fatality_rate) || 0,
                lastReportDate: row.last_report_date,
                reportingPeriods: parseInt(row.reporting_periods) || 0,
                dataElementsReported: parseInt(row.data_elements_reported) || 0,
                status: row.status,
                daysSinceReport: row.days_since_report ? Math.floor(parseFloat(row.days_since_report)) : null,
            }));
        }
        catch (error) {
            logger.error({ error }, "Error fetching facility performance data");
            throw error;
        }
    }
    /**
     * Get chiefdom-level data for a district
     */
    async getChiefdomData(districtUid, startDate, endDate) {
        try {
            logger.debug({ districtUid, startDate, endDate }, "Fetching chiefdom data");
            // Disease case data element UIDs
            const diseaseUIDs = ['vq2qO3eTrNi', 'YazgqXbizv1', 'Cj5rTc9nEvl', 'XWU1Huh0Luy', 'UsSUX0cpKsH', 'NCteyX2xpMf'];
            let query = `
        SELECT
          ou.uid,
          ou.name as chiefdom_name,
          ST_AsGeoJSON(ou.geometry) as geometry,
          SUM(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as total_cases,
          COUNT(DISTINCT dv.sourceid) as facilities_count,
          COUNT(DISTINCT de.dataelementid) as disease_types
        FROM organisationunit district
        JOIN organisationunit ou ON ou.parentid = district.organisationunitid
        LEFT JOIN datavalue dv ON dv.sourceid IN (
          SELECT child.organisationunitid
          FROM organisationunit child
          WHERE child.path LIKE '%' || ou.uid || '%'
        )
        LEFT JOIN dataelement de ON dv.dataelementid = de.dataelementid AND dv.deleted = false AND de.uid = ANY($2::text[])
      `;
            const params = [districtUid, diseaseUIDs];
            let paramIndex = 3;
            if (startDate || endDate) {
                query += ` LEFT JOIN period p ON dv.periodid = p.periodid`;
            }
            query += `
        WHERE district.uid = $1
          AND ou.hierarchylevel = 3
      `;
            // Use overlap logic to include monthly/weekly periods
            if (startDate && endDate) {
                query += ` AND p.startdate <= $${paramIndex + 1} AND p.enddate >= $${paramIndex}`;
                params.push(startDate, endDate);
                paramIndex += 2;
            }
            else if (startDate) {
                query += ` AND p.enddate >= $${paramIndex}`;
                params.push(startDate);
                paramIndex++;
            }
            else if (endDate) {
                query += ` AND p.startdate <= $${paramIndex}`;
                params.push(endDate);
                paramIndex++;
            }
            query += `
        GROUP BY ou.uid, ou.name, ou.geometry
        ORDER BY total_cases DESC
      `;
            const result = await postgresService.query(query, params);
            return result.rows.map((row) => ({
                uid: row.uid,
                chiefdomName: row.chiefdom_name,
                geometry: row.geometry ? JSON.parse(row.geometry) : null,
                totalCases: parseInt(row.total_cases) || 0,
                facilitiesCount: parseInt(row.facilities_count) || 0,
                diseaseTypes: parseInt(row.disease_types) || 0,
            }));
        }
        catch (error) {
            logger.error({ error, districtUid }, "Error fetching chiefdom data");
            throw error;
        }
    }
}
export const locationService = new LocationService();
