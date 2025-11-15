"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsService = void 0;
const postgresService_js_1 = require("./postgresService.js");
const logger_js_1 = __importDefault(require("./logger.js"));
class AnalyticsService {
    /**
     * Get overview metrics (KPIs)
     */
    async getOverviewMetrics(locationUid, days = 30, diseaseId) {
        try {
            logger_js_1.default.debug({ locationUid, days, diseaseId }, "Fetching overview metrics");
            // Build case UIDs array based on disease filter
            const caseUIDs = diseaseId && diseaseId !== 'all'
                ? this.getDiseaseUIDsByName(diseaseId, 'cases')
                : ['vq2qO3eTrNi', 'YazgqXbizv1', 'Cj5rTc9nEvl', 'XWU1Huh0Luy', 'UsSUX0cpKsH', 'NCteyX2xpMf'];
            const deathUIDs = diseaseId && diseaseId !== 'all'
                ? this.getDiseaseUIDsByName(diseaseId, 'deaths')
                : ['r6nrJANOqMw', 'f7n9E0hX8qk', 'Yy9NtNfwYZJ', 'USBq0VHSkZq', 'eY5ehpbEsB7'];
            // Get total cases
            let casesQuery = `
        SELECT
          SUM(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as total_cases,
          COUNT(DISTINCT dv.sourceid) as affected_facilities,
          COUNT(DISTINCT dv.periodid) as reporting_periods
        FROM datavalue dv
        JOIN dataelement de ON dv.dataelementid = de.dataelementid
        JOIN period p ON dv.periodid = p.periodid
      `;
            const casesParams = [];
            let paramIndex = 1;
            if (locationUid && locationUid !== 'all') {
                casesQuery += `
        JOIN organisationunit ou ON dv.sourceid = ou.organisationunitid
        `;
            }
            casesQuery += `
        WHERE dv.deleted = false
          AND de.uid = ANY($${paramIndex}::text[])
          AND dv.value IS NOT NULL
          AND p.enddate >= NOW() - INTERVAL '${days} days'
      `;
            casesParams.push(caseUIDs);
            paramIndex++;
            if (locationUid && locationUid !== 'all') {
                casesQuery += ` AND ou.path LIKE '%' || $${paramIndex} || '%'`;
                casesParams.push(locationUid);
                paramIndex++;
            }
            const casesResult = await postgresService_js_1.postgresService.query(casesQuery, casesParams);
            // Get total deaths
            let deathsQuery = `
        SELECT
          SUM(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as total_deaths
        FROM datavalue dv
        JOIN dataelement de ON dv.dataelementid = de.dataelementid
        JOIN period p ON dv.periodid = p.periodid
      `;
            const deathsParams = [];
            paramIndex = 1;
            if (locationUid && locationUid !== 'all') {
                deathsQuery += `
        JOIN organisationunit ou ON dv.sourceid = ou.organisationunitid
        `;
            }
            deathsQuery += `
        WHERE dv.deleted = false
          AND de.uid = ANY($${paramIndex}::text[])
          AND dv.value IS NOT NULL
          AND p.enddate >= NOW() - INTERVAL '${days} days'
      `;
            deathsParams.push(deathUIDs);
            paramIndex++;
            if (locationUid && locationUid !== 'all') {
                deathsQuery += ` AND ou.path LIKE '%' || $${paramIndex} || '%'`;
                deathsParams.push(locationUid);
                paramIndex++;
            }
            const deathsResult = await postgresService_js_1.postgresService.query(deathsQuery, deathsParams);
            // Get active alerts
            const alerts = await this.detectOutbreaks(locationUid, diseaseId);
            const activeAlerts = alerts.filter((a) => a.alertLevel !== "NORMAL").length;
            // Get high risk districts (those with critical or warning alerts)
            let highRiskDistrictsQuery = `
        SELECT COUNT(DISTINCT ou.uid) as high_risk_count
        FROM (
          SELECT DISTINCT dv.sourceid
          FROM datavalue dv
          JOIN dataelement de ON dv.dataelementid = de.dataelementid
          JOIN period p ON dv.periodid = p.periodid
          WHERE dv.deleted = false
            AND p.enddate >= NOW() - INTERVAL '7 days'
            AND dv.value ~ '^[0-9]+$'
            AND de.uid = ANY($1::text[])
          GROUP BY dv.sourceid, de.dataelementid
          HAVING SUM(CAST(dv.value AS INTEGER)) > 100
        ) as high_facilities
        JOIN organisationunit ou ON high_facilities.sourceid = ou.organisationunitid
      `;
            const highRiskParams = [caseUIDs];
            paramIndex = 2;
            if (locationUid && locationUid !== 'all') {
                highRiskDistrictsQuery += ` WHERE ou.path LIKE '%' || $${paramIndex} || '%' AND ou.hierarchylevel = 2`;
                highRiskParams.push(locationUid);
                paramIndex++;
            }
            else {
                highRiskDistrictsQuery += ` WHERE ou.hierarchylevel = 2`;
            }
            const highRiskResult = await postgresService_js_1.postgresService.query(highRiskDistrictsQuery, highRiskParams);
            return {
                totalCases: parseInt(casesResult.rows[0]?.total_cases) || 0,
                totalDeaths: parseInt(deathsResult.rows[0]?.total_deaths) || 0,
                activeAlerts,
                highRiskDistricts: parseInt(highRiskResult.rows[0]?.high_risk_count) || 0,
                affectedFacilities: parseInt(casesResult.rows[0]?.affected_facilities) || 0,
                reportingPeriods: parseInt(casesResult.rows[0]?.reporting_periods) || 0,
            };
        }
        catch (error) {
            logger_js_1.default.error({ error }, "Error fetching overview metrics");
            throw error;
        }
    }
    /**
     * Helper to get disease UIDs by name
     */
    getDiseaseUIDsByName(diseaseId, type) {
        const diseaseMap = {
            malaria: { cases: 'vq2qO3eTrNi', deaths: 'r6nrJANOqMw' },
            measles: { cases: 'YazgqXbizv1', deaths: 'f7n9E0hX8qk' },
            typhoid: { cases: 'Cj5rTc9nEvl', deaths: 'Yy9NtNfwYZJ' },
            'typhoid fever': { cases: 'Cj5rTc9nEvl', deaths: 'Yy9NtNfwYZJ' },
            'yellow fever': { cases: 'XWU1Huh0Luy', deaths: 'USBq0VHSkZq' },
            yellowfever: { cases: 'XWU1Huh0Luy', deaths: 'USBq0VHSkZq' },
            cholera: { cases: 'UsSUX0cpKsH', deaths: 'eY5ehpbEsB7' },
            'lassa fever': { cases: 'NCteyX2xpMf' },
            lassafever: { cases: 'NCteyX2xpMf' },
        };
        const disease = diseaseMap[diseaseId.toLowerCase()];
        if (!disease)
            return [];
        if (type === 'deaths' && disease.deaths) {
            return [disease.deaths];
        }
        return [disease.cases];
    }
    /**
     * Detect outbreaks using statistical thresholds
     */
    async detectOutbreaks(locationUid, diseaseId) {
        try {
            logger_js_1.default.debug({ locationUid, diseaseId }, "Detecting outbreaks");
            // Build disease UIDs array based on filter
            const caseUIDs = diseaseId && diseaseId !== 'all'
                ? this.getDiseaseUIDsByName(diseaseId, 'cases')
                : ['vq2qO3eTrNi', 'YazgqXbizv1', 'Cj5rTc9nEvl', 'XWU1Huh0Luy', 'UsSUX0cpKsH', 'NCteyX2xpMf'];
            const query = `
        WITH recent_cases AS (
          SELECT
            de.dataelementid,
            de.name as disease,
            ou.name as location,
            ou.uid as location_uid,
            ou.hierarchylevel,
            ou.parentid,
            SUM(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as cases_7d,
            COUNT(DISTINCT dv.sourceid) as facilities
          FROM datavalue dv
          JOIN dataelement de ON dv.dataelementid = de.dataelementid
          JOIN period p ON dv.periodid = p.periodid
          JOIN organisationunit ou ON dv.sourceid = ou.organisationunitid
          WHERE dv.deleted = false
            AND p.enddate >= NOW() - INTERVAL '7 days'
            AND dv.value IS NOT NULL
            AND ou.hierarchylevel = 2
            AND de.uid = ANY($1::text[])
            ${locationUid && locationUid !== 'all' ? `AND ou.path LIKE '%' || $2 || '%'` : ''}
          GROUP BY de.dataelementid, de.name, ou.organisationunitid, ou.name, ou.uid, ou.hierarchylevel, ou.parentid
        ),
        historical_baseline AS (
          SELECT
            de.dataelementid,
            dv.sourceid,
            AVG(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as avg_cases,
            STDDEV(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as stddev_cases
          FROM datavalue dv
          JOIN dataelement de ON dv.dataelementid = de.dataelementid
          JOIN period p ON dv.periodid = p.periodid
          WHERE dv.deleted = false
            AND p.enddate < NOW() - INTERVAL '7 days'
            AND p.enddate >= NOW() - INTERVAL '6 months'
            AND dv.value IS NOT NULL
            AND de.uid = ANY($1::text[])
          GROUP BY de.dataelementid, dv.sourceid
        )
        SELECT
          rc.disease,
          rc.location,
          rc.location_uid,
          rc.cases_7d,
          COALESCE(AVG(hb.avg_cases), 0) as baseline,
          CASE
            WHEN AVG(hb.avg_cases) > 0 THEN
              ((rc.cases_7d - AVG(hb.avg_cases)) / AVG(hb.avg_cases) * 100)
            ELSE NULL
          END as percent_change,
          CASE
            WHEN rc.cases_7d > (AVG(hb.avg_cases) + 2 * AVG(hb.stddev_cases)) THEN 'CRITICAL'
            WHEN rc.cases_7d > (AVG(hb.avg_cases) + AVG(hb.stddev_cases)) THEN 'WARNING'
            ELSE 'NORMAL'
          END as alert_level,
          AVG(hb.avg_cases) + AVG(hb.stddev_cases) as threshold
        FROM recent_cases rc
        LEFT JOIN historical_baseline hb ON rc.dataelementid = hb.dataelementid
        GROUP BY rc.disease, rc.location, rc.location_uid, rc.cases_7d, rc.dataelementid
        HAVING rc.cases_7d > (AVG(hb.avg_cases) + AVG(hb.stddev_cases)) OR AVG(hb.avg_cases) IS NULL
        ORDER BY alert_level DESC, percent_change DESC NULLS LAST
      `;
            const params = locationUid && locationUid !== 'all' ? [caseUIDs, locationUid] : [caseUIDs];
            const result = await postgresService_js_1.postgresService.query(query, params);
            return result.rows.map((row) => ({
                disease: row.disease,
                location: row.location,
                locationUid: row.location_uid,
                cases7d: parseInt(row.cases_7d) || 0,
                baseline: parseFloat(row.baseline) || 0,
                percentChange: parseFloat(row.percent_change) || 0,
                alertLevel: row.alert_level,
                threshold: parseFloat(row.threshold) || 0,
            }));
        }
        catch (error) {
            logger_js_1.default.error({ error }, "Error detecting outbreaks");
            throw error;
        }
    }
    /**
     * Get trend data (weekly aggregation)
     */
    async getTrendData(weeks = 12, locationUid, diseaseId) {
        try {
            logger_js_1.default.debug({ weeks, locationUid, diseaseId }, "Fetching trend data");
            // Build disease UIDs array based on filter
            const caseUIDs = diseaseId && diseaseId !== 'all'
                ? this.getDiseaseUIDsByName(diseaseId, 'cases')
                : ['vq2qO3eTrNi', 'YazgqXbizv1', 'Cj5rTc9nEvl', 'XWU1Huh0Luy', 'UsSUX0cpKsH', 'NCteyX2xpMf'];
            let query = `
        SELECT
          DATE_TRUNC('week', p.startdate)::date as week,
          de.name as disease,
          SUM(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as cases
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
          AND p.startdate >= NOW() - INTERVAL '${weeks} weeks'
          AND dv.value IS NOT NULL
          AND de.uid = ANY($${paramIndex}::text[])
      `;
            params.push(caseUIDs);
            paramIndex++;
            if (locationUid && locationUid !== 'all') {
                query += ` AND ou.path LIKE '%' || $${paramIndex} || '%'`;
                params.push(locationUid);
                paramIndex++;
            }
            query += `
        GROUP BY week, de.name
        ORDER BY week, de.name
      `;
            const result = await postgresService_js_1.postgresService.query(query, params);
            return result.rows.map((row) => ({
                week: row.week,
                disease: row.disease,
                cases: parseInt(row.cases) || 0,
            }));
        }
        catch (error) {
            logger_js_1.default.error({ error }, "Error fetching trend data");
            throw error;
        }
    }
    /**
     * Get geographic heat map data
     */
    async getGeographicHeatMap() {
        try {
            logger_js_1.default.debug("Fetching geographic heat map data");
            const query = `
        WITH district_cases AS (
          SELECT
            ou.organisationunitid,
            ou.uid,
            ou.name as district_name,
            ST_AsGeoJSON(ou.geometry) as geometry,
            de.name as disease,
            SUM(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as cases
          FROM datavalue dv
          JOIN dataelement de ON dv.dataelementid = de.dataelementid
          JOIN organisationunit ou ON dv.sourceid = ou.organisationunitid
          WHERE dv.deleted = false
            AND ou.hierarchylevel = 2
            AND dv.value IS NOT NULL
          GROUP BY ou.organisationunitid, ou.uid, ou.name, ou.geometry, de.name
        )
        SELECT
          dc.uid,
          dc.district_name,
          dc.geometry,
          SUM(dc.cases) as total_cases,
          json_object_agg(dc.disease, dc.cases) as cases_by_disease
        FROM district_cases dc
        GROUP BY dc.uid, dc.district_name, dc.geometry
        ORDER BY total_cases DESC
      `;
            const result = await postgresService_js_1.postgresService.query(query);
            return result.rows.map((row) => {
                const totalCases = parseInt(row.total_cases) || 0;
                const casesByDisease = row.cases_by_disease || {};
                // Find dominant disease
                let dominantDisease = "";
                let maxCases = 0;
                Object.entries(casesByDisease).forEach(([disease, cases]) => {
                    const caseCount = parseInt(String(cases)) || 0;
                    if (caseCount > maxCases) {
                        maxCases = caseCount;
                        dominantDisease = disease;
                    }
                });
                // Determine risk level based on total cases
                let riskLevel = "LOW";
                if (totalCases > 10000)
                    riskLevel = "HIGH";
                else if (totalCases > 5000)
                    riskLevel = "MEDIUM";
                return {
                    uid: row.uid,
                    districtName: row.district_name,
                    geometry: row.geometry ? JSON.parse(row.geometry) : null,
                    totalCases,
                    casesByDisease,
                    dominantDisease,
                    riskLevel,
                };
            });
        }
        catch (error) {
            logger_js_1.default.error({ error }, "Error fetching geographic heat map data");
            throw error;
        }
    }
    /**
     * Get data quality metrics
     */
    async getDataQualityMetrics() {
        try {
            logger_js_1.default.debug("Fetching data quality metrics");
            const query = `
        WITH expected_reports AS (
          SELECT
            ou.organisationunitid,
            ou.name,
            parent.name as district,
            COUNT(DISTINCT p.periodid) as expected_periods
          FROM organisationunit ou
          JOIN organisationunit parent ON ou.parentid = parent.organisationunitid
          CROSS JOIN period p
          WHERE ou.hierarchylevel = 4
            AND parent.hierarchylevel = 2
            AND p.startdate >= NOW() - INTERVAL '12 months'
            AND p.enddate < NOW()
          GROUP BY ou.organisationunitid, ou.name, parent.name
        ),
        actual_reports AS (
          SELECT
            dv.sourceid,
            COUNT(DISTINCT dv.periodid) as actual_periods,
            AVG(EXTRACT(EPOCH FROM (dv.lastupdated - p.enddate)) / 86400) as avg_delay_days
          FROM datavalue dv
          JOIN period p ON dv.periodid = p.periodid
          WHERE dv.deleted = false
            AND p.startdate >= NOW() - INTERVAL '12 months'
          GROUP BY dv.sourceid
        )
        SELECT
          er.district,
          COUNT(er.organisationunitid) as total_facilities,
          ROUND(AVG(COALESCE(ar.actual_periods, 0) * 100.0 / er.expected_periods), 1) as completeness_pct,
          ROUND(AVG(COALESCE(ar.avg_delay_days, 0)), 1) as avg_delay_days,
          COUNT(*) FILTER (WHERE COALESCE(ar.actual_periods, 0) * 100.0 / er.expected_periods >= 80) as compliant_facilities
        FROM expected_reports er
        LEFT JOIN actual_reports ar ON er.organisationunitid = ar.sourceid
        GROUP BY er.district
        ORDER BY completeness_pct DESC
      `;
            const result = await postgresService_js_1.postgresService.query(query);
            return result.rows.map((row) => ({
                district: row.district,
                totalFacilities: parseInt(row.total_facilities) || 0,
                completenessPct: parseFloat(row.completeness_pct) || 0,
                avgDelayDays: parseFloat(row.avg_delay_days) || 0,
                compliantFacilities: parseInt(row.compliant_facilities) || 0,
            }));
        }
        catch (error) {
            logger_js_1.default.error({ error }, "Error fetching data quality metrics");
            throw error;
        }
    }
}
exports.analyticsService = new AnalyticsService();
