import { postgresService } from "./postgresService.js";
import logger from "./logger.js";
// Disease UIDs from DHIS2 Sierra Leone
const DISEASE_DATA_ELEMENTS = {
    malaria: {
        name: "Malaria",
        cases: "vq2qO3eTrNi",
        deaths: "r6nrJANOqMw",
        inpatient: "p4K11MFEWtw",
        // Malaria species UIDs
        pf: "jt8mzqlDEjd", // P. falciparum
        pv: "ImgnHPhcNYE", // P. vivax
        po: "E2K6KluoF7L", // P. ovale
        pm: "sJ23PICb6Fy", // P. malariae
        pk: "HUPFagklWaN", // P. knowlesi (if available)
        // Treatment UIDs
        treated_act_24hrs: "AFM5H0wNq3t",
        treated_act_after_24hrs: "smYVxAw2lLO",
        rdt_positive: "wZwzzRnr9N4",
        rdt_negative: "Qk9nnX0i7lZ",
    },
    measles: {
        name: "Measles",
        cases: "YazgqXbizv1",
        deaths: "f7n9E0hX8qk",
        newCases: "GCvqIM3IzN0",
    },
    typhoid: {
        name: "Typhoid Fever",
        cases: "Cj5rTc9nEvl",
        deaths: "Yy9NtNfwYZJ",
    },
    yellowFever: {
        name: "Yellow Fever",
        cases: "XWU1Huh0Luy",
        deaths: "USBq0VHSkZq",
    },
    cholera: {
        name: "Cholera",
        cases: "UsSUX0cpKsH",
        deaths: "eY5ehpbEsB7",
    },
    lassaFever: {
        name: "Lassa Fever",
        cases: "NCteyX2xpMf",
    },
};
class DiseaseService {
    /**
     * Get list of all diseases with available data
     */
    async getAllDiseases() {
        try {
            logger.debug("Fetching all diseases");
            const diseases = Object.entries(DISEASE_DATA_ELEMENTS).map(([id, config]) => ({
                id,
                name: config.name,
                uid: config.cases,
            }));
            return diseases;
        }
        catch (error) {
            logger.error({ error }, "Error fetching all diseases");
            throw error;
        }
    }
    /**
     * Get disease summary statistics
     */
    async getDiseaseSummary(diseaseId) {
        try {
            logger.debug({ diseaseId }, "Fetching disease summary");
            const diseaseConfig = DISEASE_DATA_ELEMENTS[diseaseId];
            if (!diseaseConfig) {
                logger.warn({ diseaseId }, "Disease not found");
                return null;
            }
            // Get data element IDs
            const dataElementUIDs = [diseaseConfig.cases];
            if ("deaths" in diseaseConfig && diseaseConfig.deaths) {
                dataElementUIDs.push(diseaseConfig.deaths);
            }
            const query = `
        SELECT
          de.uid,
          de.name as element_name,
          COUNT(DISTINCT dv.periodid) as reporting_periods,
          COUNT(DISTINCT dv.sourceid) as affected_facilities,
          SUM(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as total_value,
          AVG(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as avg_value,
          MAX(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as max_value,
          MIN(p.startdate) as earliest_date,
          MAX(p.enddate) as latest_date
        FROM datavalue dv
        JOIN dataelement de ON dv.dataelementid = de.dataelementid
        JOIN period p ON dv.periodid = p.periodid
        WHERE dv.deleted = false
          AND de.uid = ANY($1::text[])
          AND dv.value IS NOT NULL
        GROUP BY de.uid, de.name
      `;
            const result = await postgresService.query(query, [dataElementUIDs]);
            if (result.rows.length === 0) {
                return null;
            }
            const casesRow = result.rows.find((r) => r.uid === diseaseConfig.cases);
            const deathsRow = "deaths" in diseaseConfig && diseaseConfig.deaths
                ? result.rows.find((r) => r.uid === diseaseConfig.deaths)
                : null;
            if (!casesRow) {
                return null;
            }
            return {
                disease: diseaseConfig.name,
                totalCases: parseInt(casesRow.total_value) || 0,
                totalDeaths: deathsRow ? parseInt(deathsRow.total_value) || 0 : undefined,
                affectedFacilities: parseInt(casesRow.affected_facilities) || 0,
                reportingPeriods: parseInt(casesRow.reporting_periods) || 0,
                earliestDate: casesRow.earliest_date,
                latestDate: casesRow.latest_date,
                avgCasesPerPeriod: parseFloat(casesRow.avg_value) || 0,
                peakCases: parseInt(casesRow.max_value) || 0,
            };
        }
        catch (error) {
            logger.error({ error, diseaseId }, "Error fetching disease summary");
            throw error;
        }
    }
    /**
     * Get time series data for a disease
     */
    async getDiseaseTimeSeries(diseaseId, startDate, endDate, locationUid) {
        try {
            logger.debug({ diseaseId, startDate, endDate, locationUid }, "Fetching disease time series");
            const diseaseConfig = DISEASE_DATA_ELEMENTS[diseaseId];
            if (!diseaseConfig) {
                logger.warn({ diseaseId }, "Disease not found");
                return [];
            }
            let query = `
        SELECT
          p.startdate,
          p.enddate,
          SUM(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as cases,
          COUNT(DISTINCT dv.sourceid) as facilities_reporting
        FROM datavalue dv
        JOIN dataelement de ON dv.dataelementid = de.dataelementid
        JOIN period p ON dv.periodid = p.periodid
      `;
            const params = [diseaseConfig.cases];
            let paramIndex = 2;
            if (locationUid) {
                query += `
          JOIN organisationunit ou ON dv.sourceid = ou.organisationunitid
        `;
            }
            query += `
        WHERE dv.deleted = false
          AND de.uid = $1
          AND dv.value IS NOT NULL
      `;
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
            if (locationUid) {
                query += ` AND ou.path LIKE '%' || $${paramIndex} || '%'`;
                params.push(locationUid);
                paramIndex++;
            }
            query += `
        GROUP BY p.periodid, p.startdate, p.enddate
        ORDER BY p.startdate ASC
      `;
            const result = await postgresService.query(query, params);
            return result.rows.map((row) => ({
                disease: diseaseConfig.name,
                date: row.startdate,
                startDate: row.startdate,
                endDate: row.enddate,
                cases: parseInt(row.cases) || 0,
                facilitiesReporting: parseInt(row.facilities_reporting) || 0,
            }));
        }
        catch (error) {
            logger.error({ error, diseaseId }, "Error fetching disease time series");
            throw error;
        }
    }
    /**
     * Get disease breakdown for all diseases (for overview)
     */
    async getDiseaseBreakdown(locationUid, days, diseaseId) {
        try {
            logger.debug({ locationUid, days, diseaseId }, "Fetching disease breakdown");
            // Build disease UIDs array based on filter
            let allCaseUIDs;
            if (diseaseId && diseaseId !== 'all') {
                const diseaseConfig = DISEASE_DATA_ELEMENTS[diseaseId];
                allCaseUIDs = diseaseConfig ? [diseaseConfig.cases] : [];
            }
            else {
                allCaseUIDs = Object.values(DISEASE_DATA_ELEMENTS).map((d) => d.cases);
            }
            if (allCaseUIDs.length === 0) {
                return [];
            }
            let query = `
        SELECT
          de.uid,
          de.name as disease,
          SUM(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as total_cases,
          COUNT(DISTINCT dv.sourceid) as facilities_affected,
          AVG(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as avg_cases_per_period,
          MAX(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as peak_cases
        FROM datavalue dv
        JOIN dataelement de ON dv.dataelementid = de.dataelementid
        JOIN period p ON dv.periodid = p.periodid
      `;
            const params = [];
            let paramIndex = 1;
            if (locationUid && locationUid !== 'all') {
                query += `
        JOIN organisationunit ou ON dv.sourceid = ou.organisationunitid
        `;
            }
            query += `
        WHERE dv.deleted = false
          AND de.uid = ANY($${paramIndex}::text[])
          AND dv.value IS NOT NULL
      `;
            params.push(allCaseUIDs);
            paramIndex++;
            if (days) {
                query += ` AND p.enddate >= NOW() - INTERVAL '${days} days'`;
            }
            if (locationUid && locationUid !== 'all') {
                query += ` AND ou.path LIKE '%' || $${paramIndex} || '%'`;
                params.push(locationUid);
                paramIndex++;
            }
            query += `
        GROUP BY de.uid, de.name
        ORDER BY total_cases DESC
      `;
            const result = await postgresService.query(query, params);
            return result.rows.map((row) => ({
                disease: row.disease,
                totalCases: parseInt(row.total_cases) || 0,
                facilitiesAffected: parseInt(row.facilities_affected) || 0,
                avgCasesPerPeriod: parseFloat(row.avg_cases_per_period) || 0,
                peakCases: parseInt(row.peak_cases) || 0,
            }));
        }
        catch (error) {
            logger.error({ error }, "Error fetching disease breakdown");
            throw error;
        }
    }
    /**
     * Get disease cases by location
     */
    async getDiseaseCasesByLocation(diseaseId, hierarchyLevel = 2 // 2 = districts
    ) {
        try {
            logger.debug({ diseaseId, hierarchyLevel }, "Fetching disease cases by location");
            const diseaseConfig = DISEASE_DATA_ELEMENTS[diseaseId];
            if (!diseaseConfig) {
                logger.warn({ diseaseId }, "Disease not found");
                return [];
            }
            const query = `
        SELECT
          ou.uid,
          ou.name as location_name,
          ou.hierarchylevel,
          ST_AsGeoJSON(ou.geometry) as geometry,
          SUM(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as total_cases,
          COUNT(DISTINCT dv.periodid) as reporting_periods
        FROM datavalue dv
        JOIN dataelement de ON dv.dataelementid = de.dataelementid
        JOIN organisationunit ou ON dv.sourceid = ou.organisationunitid
        WHERE dv.deleted = false
          AND de.uid = $1
          AND ou.hierarchylevel = $2
          AND dv.value IS NOT NULL
        GROUP BY ou.organisationunitid, ou.uid, ou.name, ou.hierarchylevel, ou.geometry
        ORDER BY total_cases DESC
      `;
            const result = await postgresService.query(query, [diseaseConfig.cases, hierarchyLevel]);
            return result.rows.map((row) => ({
                uid: row.uid,
                locationName: row.location_name,
                hierarchyLevel: row.hierarchylevel,
                geometry: row.geometry ? JSON.parse(row.geometry) : null,
                totalCases: parseInt(row.total_cases) || 0,
                reportingPeriods: parseInt(row.reporting_periods) || 0,
            }));
        }
        catch (error) {
            logger.error({ error, diseaseId }, "Error fetching disease cases by location");
            throw error;
        }
    }
    /**
     * Get facility performance data for a disease
     */
    async getFacilityPerformance(diseaseId, locationUid, limit = 50) {
        try {
            logger.debug({ diseaseId, locationUid, limit }, "Fetching facility performance");
            const diseaseConfig = DISEASE_DATA_ELEMENTS[diseaseId];
            if (!diseaseConfig) {
                logger.warn({ diseaseId }, "Disease not found");
                return [];
            }
            // Build UIDs array for cases and deaths
            const dataElementUIDs = [diseaseConfig.cases];
            const deathsUid = "deaths" in diseaseConfig && diseaseConfig.deaths ? diseaseConfig.deaths : null;
            if (deathsUid) {
                dataElementUIDs.push(deathsUid);
            }
            let query = `
        WITH facility_cases AS (
          SELECT
            ou.organisationunitid,
            ou.uid,
            ou.name as facility_name,
            parent_ou.name as district,
            de.uid as data_element_uid,
            SUM(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as total_value,
            MAX(dv.lastupdated) as last_report_date
          FROM datavalue dv
          JOIN dataelement de ON dv.dataelementid = de.dataelementid
          JOIN organisationunit ou ON dv.sourceid = ou.organisationunitid
          LEFT JOIN organisationunit parent_ou ON ou.parentid = parent_ou.organisationunitid
          WHERE dv.deleted = false
            AND ou.hierarchylevel = 4
            AND de.uid = ANY($1::text[])
            AND dv.value IS NOT NULL
      `;
            const params = [dataElementUIDs];
            let paramIndex = 2;
            if (locationUid) {
                query += ` AND ou.path LIKE '%' || $${paramIndex} || '%'`;
                params.push(locationUid);
                paramIndex++;
            }
            query += `
          GROUP BY ou.organisationunitid, ou.uid, ou.name, parent_ou.name, de.uid
        )
        SELECT
          fc.uid as facility_uid,
          fc.facility_name,
          fc.district,
          COALESCE(MAX(CASE WHEN fc.data_element_uid = $${paramIndex} THEN fc.total_value ELSE 0 END), 0) as cases,
          COALESCE(MAX(CASE WHEN fc.data_element_uid = $${paramIndex + 1} THEN fc.total_value ELSE 0 END), 0) as deaths,
          MAX(fc.last_report_date) as last_report_date
        FROM facility_cases fc
        GROUP BY fc.organisationunitid, fc.uid, fc.facility_name, fc.district
        HAVING COALESCE(MAX(CASE WHEN fc.data_element_uid = $${paramIndex} THEN fc.total_value ELSE 0 END), 0) > 0
        ORDER BY cases DESC
        LIMIT $${paramIndex + 2}
      `;
            params.push(diseaseConfig.cases);
            params.push(deathsUid || diseaseConfig.cases); // Use cases UID if deaths not available
            params.push(limit);
            const result = await postgresService.query(query, params);
            return result.rows.map((row) => {
                const cases = parseInt(row.cases) || 0;
                const deaths = parseInt(row.deaths) || 0;
                const cfr = cases > 0 ? (deaths / cases) * 100 : 0;
                const lastReportDate = row.last_report_date;
                const daysSinceReport = lastReportDate
                    ? Math.floor((Date.now() - new Date(lastReportDate).getTime()) / (1000 * 60 * 60 * 24))
                    : 999;
                let status = "Active";
                if (daysSinceReport > 30) {
                    status = "Inactive";
                }
                else if (daysSinceReport > 14) {
                    status = "Delayed";
                }
                return {
                    facilityUid: row.facility_uid,
                    facilityName: row.facility_name,
                    district: row.district || "Unknown",
                    cases,
                    deaths,
                    cfr: parseFloat(cfr.toFixed(2)),
                    lastReportDate: lastReportDate || "Unknown",
                    status,
                };
            });
        }
        catch (error) {
            logger.error({ error, diseaseId }, "Error fetching facility performance");
            throw error;
        }
    }
    /**
     * Get malaria species distribution
     */
    async getMalariaSpeciesDistribution(locationUid) {
        try {
            logger.debug({ locationUid }, "Fetching malaria species distribution");
            const malariaConfig = DISEASE_DATA_ELEMENTS.malaria;
            const speciesUIDs = [malariaConfig.pf, malariaConfig.pv, malariaConfig.po, malariaConfig.pm];
            let query = `
        WITH species_data AS (
          SELECT
            de.shortname as species,
            de.name as full_name,
            SUM(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as cases
          FROM datavalue dv
          JOIN dataelement de ON dv.dataelementid = de.dataelementid
      `;
            const params = [speciesUIDs];
            let paramIndex = 2;
            if (locationUid) {
                query += `
          JOIN organisationunit ou ON dv.sourceid = ou.organisationunitid
        `;
            }
            query += `
          WHERE dv.deleted = false
            AND de.uid = ANY($1::text[])
            AND dv.value IS NOT NULL
      `;
            if (locationUid) {
                query += ` AND ou.path LIKE '%' || $${paramIndex} || '%'`;
                params.push(locationUid);
                paramIndex++;
            }
            query += `
          GROUP BY de.uid, de.shortname, de.name
        )
        SELECT
          species,
          full_name,
          cases,
          ROUND(cases * 100.0 / NULLIF(SUM(cases) OVER (), 0), 2) as percentage
        FROM species_data
        WHERE cases > 0
        ORDER BY cases DESC
      `;
            const result = await postgresService.query(query, params);
            return result.rows.map((row) => ({
                species: row.species || row.full_name || "Unknown",
                cases: parseInt(row.cases) || 0,
                percentage: parseFloat(row.percentage) || 0,
            }));
        }
        catch (error) {
            logger.error({ error }, "Error fetching malaria species distribution");
            throw error;
        }
    }
    /**
     * Get treatment timeline data (for Malaria)
     */
    async getTreatmentTimeline(diseaseId, locationUid) {
        try {
            logger.debug({ diseaseId, locationUid }, "Fetching treatment timeline");
            if (diseaseId !== "malaria") {
                logger.warn({ diseaseId }, "Treatment timeline only available for malaria");
                return [];
            }
            const malariaConfig = DISEASE_DATA_ELEMENTS.malaria;
            const treatmentUIDs = [malariaConfig.treated_act_24hrs, malariaConfig.treated_act_after_24hrs];
            let query = `
        WITH treatment_data AS (
          SELECT
            de.name as category,
            SUM(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as cases
          FROM datavalue dv
          JOIN dataelement de ON dv.dataelementid = de.dataelementid
      `;
            const params = [treatmentUIDs];
            let paramIndex = 2;
            if (locationUid) {
                query += `
          JOIN organisationunit ou ON dv.sourceid = ou.organisationunitid
        `;
            }
            query += `
          WHERE dv.deleted = false
            AND de.uid = ANY($1::text[])
            AND dv.value IS NOT NULL
      `;
            if (locationUid) {
                query += ` AND ou.path LIKE '%' || $${paramIndex} || '%'`;
                params.push(locationUid);
                paramIndex++;
            }
            query += `
          GROUP BY de.uid, de.name
        )
        SELECT
          category,
          cases,
          ROUND(cases * 100.0 / NULLIF(SUM(cases) OVER (), 0), 2) as percentage
        FROM treatment_data
        WHERE cases > 0
        ORDER BY cases DESC
      `;
            const result = await postgresService.query(query, params);
            return result.rows.map((row) => ({
                category: row.category || "Unknown",
                cases: parseInt(row.cases) || 0,
                percentage: parseFloat(row.percentage) || 0,
            }));
        }
        catch (error) {
            logger.error({ error, diseaseId }, "Error fetching treatment timeline");
            throw error;
        }
    }
}
export const diseaseService = new DiseaseService();
