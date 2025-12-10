"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsService = void 0;
const postgresService_js_1 = require("./postgresService.js");
const logger_js_1 = __importDefault(require("./logger.js"));
const diseaseService_js_1 = require("./diseaseService.js");
class AnalyticsService {
    /**
     * Get overview metrics (KPIs)
     */
    async getOverviewMetrics(locationUid, days = 30, diseaseId) {
        try {
            logger_js_1.default.debug({ locationUid, days, diseaseId }, "Fetching overview metrics");
            // Build case UIDs array based on disease filter
            // Use ALL diseases for accurate overview metrics
            const allCaseUIDs = Object.values(diseaseService_js_1.DISEASE_DATA_ELEMENTS).map((d) => d.cases);
            const allDeathUIDs = Object.values(diseaseService_js_1.DISEASE_DATA_ELEMENTS)
                .filter((d) => 'deaths' in d && d.deaths)
                .map((d) => 'deaths' in d ? d.deaths : '')
                .filter(Boolean);
            const caseUIDs = diseaseId && diseaseId !== 'all'
                ? this.getDiseaseUIDsByName(diseaseId, 'cases')
                : allCaseUIDs;
            const deathUIDs = diseaseId && diseaseId !== 'all'
                ? this.getDiseaseUIDsByName(diseaseId, 'deaths')
                : allDeathUIDs;
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
          AND p.startdate >= NOW() - INTERVAL '${days} days'
          AND p.startdate <= NOW()
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
          AND p.startdate >= NOW() - INTERVAL '${days} days'
          AND p.startdate <= NOW()
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
            // Get high risk districts using seasonal baseline calculation
            // Uses same week of year from past 2 years, matching DiseaseTrend component's approach
            // Districts are flagged if they exceed ANY of the three baseline methods:
            // 1. 95th Percentile, 2. Mean + 2SD, 3. Median + 2*IQR (Endemic Channel)
            let highRiskDistrictsQuery = `
        WITH district_extraction AS (
          -- Extract district UIDs from all organization units
          SELECT
            ou.organisationunitid,
            CASE
              WHEN ou.hierarchylevel = 2 THEN ou.uid
              WHEN ou.hierarchylevel > 2 THEN split_part(ou.path, '/', 3)
              ELSE NULL
            END as district_uid
          FROM organisationunit ou
          WHERE ou.hierarchylevel >= 2
        ),
        current_week AS (
          -- Get current week of year for seasonal matching
          SELECT EXTRACT(WEEK FROM NOW()) as week_of_year
        ),
        recent_cases_by_district AS (
          -- Get recent cases (last 7 days) aggregated by district
          SELECT
            de.district_uid,
            dv.dataelementid,
            SUM(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as recent_cases
          FROM datavalue dv
          JOIN dataelement de_elem ON dv.dataelementid = de_elem.dataelementid
          JOIN period p ON dv.periodid = p.periodid
          JOIN district_extraction de ON dv.sourceid = de.organisationunitid
          WHERE dv.deleted = false
            AND p.startdate >= NOW() - INTERVAL '7 days'
            AND p.startdate <= NOW()
            AND dv.value IS NOT NULL
            AND de_elem.uid = ANY($1::text[])
            AND de.district_uid IS NOT NULL
          GROUP BY de.district_uid, dv.dataelementid
        ),
        historical_seasonal_data AS (
          -- Get historical data from same week ±1 week over past 2 years (excluding last 7 days)
          SELECT
            de.district_uid,
            dv.dataelementid,
            CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END as cases
          FROM datavalue dv
          JOIN dataelement de_elem ON dv.dataelementid = de_elem.dataelementid
          JOIN period p ON dv.periodid = p.periodid
          JOIN district_extraction de ON dv.sourceid = de.organisationunitid
          CROSS JOIN current_week cw
          WHERE dv.deleted = false
            AND p.enddate < NOW() - INTERVAL '7 days'
            AND p.startdate >= NOW() - INTERVAL '2 years'
            AND dv.value IS NOT NULL
            AND de_elem.uid = ANY($1::text[])
            AND de.district_uid IS NOT NULL
            -- Match same week ±1 week from previous years
            AND ABS(EXTRACT(WEEK FROM p.startdate) - cw.week_of_year) <= 1
        ),
        baseline_calculations AS (
          -- Calculate all three baseline methods for each district-disease combination
          SELECT
            district_uid,
            dataelementid,
            -- Method 1: Mean + 2*SD
            AVG(cases) + (2 * STDDEV(cases)) as baseline_mean_2sd,
            -- Method 2: 95th Percentile
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY cases) as baseline_95percentile,
            -- Method 3: Median + 2*IQR (Endemic Channel)
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cases) +
              (2 * (PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cases) -
                    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY cases))) as baseline_endemic_channel
          FROM historical_seasonal_data
          GROUP BY district_uid, dataelementid
          HAVING COUNT(*) >= 4  -- Need at least 4 historical data points for meaningful baseline
        ),
        high_risk_comparison AS (
          -- Compare recent cases against all three baselines
          -- District is high-risk if it exceeds ANY of the three baseline methods
          SELECT DISTINCT
            rc.district_uid
          FROM recent_cases_by_district rc
          LEFT JOIN baseline_calculations bc
            ON rc.district_uid = bc.district_uid
            AND rc.dataelementid = bc.dataelementid
          WHERE
            -- Exceeds 95th Percentile baseline
            rc.recent_cases > COALESCE(bc.baseline_95percentile, 0)
            -- OR exceeds Mean + 2SD baseline
            OR rc.recent_cases > COALESCE(bc.baseline_mean_2sd, 0)
            -- OR exceeds Endemic Channel baseline
            OR rc.recent_cases > COALESCE(bc.baseline_endemic_channel, 0)
            -- OR no historical data but recent cases are significant (>50)
            OR (bc.baseline_mean_2sd IS NULL AND rc.recent_cases > 50)
        )
        SELECT COUNT(DISTINCT hrc.district_uid) as high_risk_count
        FROM high_risk_comparison hrc
        JOIN organisationunit ou ON hrc.district_uid = ou.uid
        WHERE ou.hierarchylevel = 2
      `;
            const highRiskParams = [caseUIDs];
            paramIndex = 2;
            if (locationUid && locationUid !== 'all') {
                highRiskDistrictsQuery += ` AND ou.path LIKE '%' || $${paramIndex} || '%'`;
                highRiskParams.push(locationUid);
                paramIndex++;
            }
            const highRiskResult = await postgresService_js_1.postgresService.query(highRiskDistrictsQuery, highRiskParams);
            // Get total districts count for national risk calculation
            let totalDistrictsQuery = `
        SELECT COUNT(DISTINCT ou.uid) as total_districts
        FROM organisationunit ou
        WHERE ou.hierarchylevel = 2
      `;
            const totalDistrictsParams = [];
            if (locationUid && locationUid !== 'all') {
                totalDistrictsQuery += ` AND ou.path LIKE '%' || $1 || '%'`;
                totalDistrictsParams.push(locationUid);
            }
            const totalDistrictsResult = await postgresService_js_1.postgresService.query(totalDistrictsQuery, totalDistrictsParams);
            return {
                totalCases: parseInt(casesResult.rows[0]?.total_cases) || 0,
                totalDeaths: parseInt(deathsResult.rows[0]?.total_deaths) || 0,
                activeAlerts,
                highRiskDistricts: parseInt(highRiskResult.rows[0]?.high_risk_count) || 0,
                totalDistricts: parseInt(totalDistrictsResult.rows[0]?.total_districts) || 0,
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
     * Helper to get disease UIDs by name or ID
     */
    getDiseaseUIDsByName(diseaseId, type) {
        const diseaseMap = {
            // Standard names
            malaria: { cases: 'vq2qO3eTrNi', deaths: 'r6nrJANOqMw' },
            measles: { cases: 'YazgqXbizv1', deaths: 'f7n9E0hX8qk' },
            typhoid: { cases: 'Cj5rTc9nEvl', deaths: 'Yy9NtNfwYZJ' },
            'typhoid fever': { cases: 'Cj5rTc9nEvl', deaths: 'Yy9NtNfwYZJ' },
            'yellow fever': { cases: 'XWU1Huh0Luy', deaths: 'USBq0VHSkZq' },
            yellowfever: { cases: 'XWU1Huh0Luy', deaths: 'USBq0VHSkZq' },
            cholera: { cases: 'UsSUX0cpKsH', deaths: 'eY5ehpbEsB7' },
            'lassa fever': { cases: 'NCteyX2xpMf' },
            lassafever: { cases: 'NCteyX2xpMf' },
            // IDSR disease IDs
            malariaidsr: { cases: 'vq2qO3eTrNi', deaths: 'r6nrJANOqMw' },
            measlesidsr: { cases: 'YazgqXbizv1', deaths: 'f7n9E0hX8qk' },
            typhoidfeveridsr: { cases: 'Cj5rTc9nEvl', deaths: 'Yy9NtNfwYZJ' },
            yellowfeveridsr: { cases: 'XWU1Huh0Luy', deaths: 'USBq0VHSkZq' },
            choleraidsr: { cases: 'UsSUX0cpKsH', deaths: 'eY5ehpbEsB7' },
        };
        const disease = diseaseMap[diseaseId.toLowerCase()];
        if (!disease) {
            // If not found, return empty array - will show all diseases
            logger_js_1.default.warn({ diseaseId }, 'Disease ID not found in mapping, showing all diseases');
            return [];
        }
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
            AND p.startdate >= NOW() - INTERVAL '7 days'
            AND p.startdate <= NOW()
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
     * Supports different administrative levels: 2 (District/ADM2), 3 (Chiefdom/ADM3), 4 (Facility/ADM4)
     */
    async getGeographicHeatMap(days = 90, startDate, endDate, diseaseFilter, locationFilter, adminLevel = 2) {
        try {
            logger_js_1.default.debug({ days, startDate, endDate, diseaseFilter, locationFilter, adminLevel }, "Fetching geographic heat map data");
            // Disease case data element UIDs - filter by specific disease if provided
            let diseaseUIDs = ['vq2qO3eTrNi', 'YazgqXbizv1', 'Cj5rTc9nEvl', 'XWU1Huh0Luy', 'UsSUX0cpKsH', 'NCteyX2xpMf'];
            if (diseaseFilter && diseaseFilter !== 'all') {
                diseaseUIDs = this.getDiseaseUIDsByName(diseaseFilter, 'cases');
            }
            // Build time filter condition using overlap logic to include monthly/weekly periods
            let timeFilter = '';
            const params = [diseaseUIDs];
            let paramIndex = 2;
            if (startDate && endDate) {
                // Include periods that overlap with the date range
                timeFilter = `AND p.startdate <= $${paramIndex + 1} AND p.enddate >= $${paramIndex}`;
                params.push(startDate, endDate);
            }
            else {
                timeFilter = `AND p.startdate >= NOW() - INTERVAL '${days} days' AND p.startdate <= NOW()`;
            }
            // Determine which path part to extract based on target admin level
            const getLocationUidExpression = (targetLevel) => {
                // Path format: /country_uid/district_uid/chiefdom_uid/facility_uid
                // Level 2 (district) = part 3, Level 3 (chiefdom) = part 4, Level 4 (facility) = part 5
                const pathPart = targetLevel + 1;
                return `
          CASE
            WHEN ou.hierarchylevel = ${targetLevel} THEN ou.uid
            WHEN ou.hierarchylevel > ${targetLevel} THEN split_part(ou.path, '/', ${pathPart})
            ELSE NULL
          END
        `;
            };
            let query = `
        WITH time_filtered_cases AS (
          -- First filter by time and disease data elements to reduce dataset
          SELECT
            dv.sourceid,
            dv.dataelementid,
            dv.value
          FROM datavalue dv
          JOIN period p ON dv.periodid = p.periodid
          JOIN dataelement de ON dv.dataelementid = de.dataelementid
          WHERE dv.deleted = false
            AND dv.value IS NOT NULL
            AND dv.value ~ '^[0-9]+$'
            AND de.uid = ANY($1::text[])
            ${timeFilter}
        ),
        location_mapping AS (
          -- Map all facilities to target administrative level
          SELECT DISTINCT
            tfc.sourceid,
            ${getLocationUidExpression(adminLevel)} as location_uid
          FROM time_filtered_cases tfc
          JOIN organisationunit ou ON tfc.sourceid = ou.organisationunitid
          WHERE ou.hierarchylevel >= ${adminLevel}
            AND ${getLocationUidExpression(adminLevel)} IS NOT NULL
        ),
        location_cases AS (
          -- Aggregate cases by location and disease
          SELECT
            lm.location_uid,
            de.name as disease,
            SUM(CAST(tfc.value AS INTEGER)) as cases,
            COUNT(DISTINCT lm.sourceid) as facilities_count
          FROM time_filtered_cases tfc
          JOIN location_mapping lm ON tfc.sourceid = lm.sourceid
          JOIN dataelement de ON tfc.dataelementid = de.dataelementid
          GROUP BY lm.location_uid, de.name
        )
        SELECT
          ou.uid,
          ou.name as location_name,
          ou.hierarchylevel,
          ST_AsGeoJSON(ou.geometry) as geometry,
          COALESCE(SUM(lc.cases), 0) as total_cases,
          COUNT(DISTINCT lc.disease) as disease_types,
          COALESCE(MAX(lc.facilities_count), 0) as facilities_reporting,
          COALESCE(json_object_agg(lc.disease, lc.cases) FILTER (WHERE lc.disease IS NOT NULL), '{}'::json) as cases_by_disease
        FROM organisationunit ou
        LEFT JOIN location_cases lc ON ou.uid = lc.location_uid
        WHERE ou.hierarchylevel = ${adminLevel}
      `;
            // Add location filter if specified (filter to parent location or specific location)
            if (locationFilter && locationFilter !== 'all') {
                query += ` AND (ou.uid = $${params.length + 1} OR ou.path LIKE '%' || $${params.length + 1} || '%')`;
                params.push(locationFilter);
            }
            query += `
        GROUP BY ou.uid, ou.name, ou.hierarchylevel, ou.geometry
        HAVING SUM(lc.cases) > 0
        ORDER BY total_cases DESC
      `;
            const result = await postgresService_js_1.postgresService.query(query, params);
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
                // Determine risk level based on total cases (adjust thresholds by admin level)
                let riskLevel = "LOW";
                const highThreshold = adminLevel === 2 ? 10000 : adminLevel === 3 ? 5000 : 1000;
                const mediumThreshold = adminLevel === 2 ? 5000 : adminLevel === 3 ? 2500 : 500;
                if (totalCases > highThreshold)
                    riskLevel = "HIGH";
                else if (totalCases > mediumThreshold)
                    riskLevel = "MEDIUM";
                return {
                    uid: row.uid,
                    districtName: row.location_name,
                    hierarchyLevel: row.hierarchylevel,
                    geometry: row.geometry ? JSON.parse(row.geometry) : null,
                    totalCases,
                    diseaseTypes: parseInt(row.disease_types) || 0,
                    facilitiesReporting: parseInt(row.facilities_reporting) || 0,
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
