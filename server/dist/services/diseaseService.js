import { postgresService } from "./postgresService.js";
import logger from "./logger.js";
// Disease categories
export const DISEASE_CATEGORIES = {
    VECTOR_BORNE: "Vector-Borne",
    WATER_BORNE: "Water-Borne & Diarrheal",
    AIR_BORNE: "Air-Borne & Respiratory",
    NEGLECTED_TROPICAL: "Neglected Tropical Diseases",
    VACCINE_PREVENTABLE: "Vaccine-Preventable",
    OTHER_INFECTIONS: "Other Infections & NCDs",
    VIRAL_HEMORRHAGIC: "Viral Hemorrhagic",
};
// Disease UIDs from DHIS2 Sierra Leone
export const DISEASE_DATA_ELEMENTS = {
    // Vector-Borne (4 diseases)
    malariaIDSR: {
        name: "IDSR Malaria",
        cases: "vq2qO3eTrNi",
        deaths: "r6nrJANOqMw",
        category: DISEASE_CATEGORIES.VECTOR_BORNE,
    },
    yellowFeverIDSR: {
        name: "IDSR Yellow Fever",
        cases: "noIzB569hTM",
        deaths: "USBq0VHSkZq",
        category: DISEASE_CATEGORIES.VECTOR_BORNE,
    },
    yellowFever: {
        name: "Yellow Fever",
        cases: "XWU1Huh0Luy",
        deaths: "USBq0VHSkZq",
        category: DISEASE_CATEGORIES.VECTOR_BORNE,
    },
    plague: {
        name: "IDSR Plague",
        cases: "HS9zqaBdOQ4",
        deaths: "lXolhoWewYH",
        category: DISEASE_CATEGORIES.VECTOR_BORNE,
    },
    // Water-Borne & Diarrheal (5 diseases)
    diarrhoeaNoDehydration: {
        name: "Diarrhoea without Severe Dehydration",
        cases: "U3jd8zVFKxY",
        category: DISEASE_CATEGORIES.WATER_BORNE,
    },
    diarrhoeaDysentery: {
        name: "Diarrhoea with Blood (Dysentery)",
        cases: "nymNRxmnj4z",
        deaths: "Ix2HsbDMLea",
        category: DISEASE_CATEGORIES.WATER_BORNE,
    },
    diarrhoeaSevere: {
        name: "Diarrhoea with Severe Dehydration",
        cases: "UfZcabJUVcZ",
        category: DISEASE_CATEGORIES.WATER_BORNE,
    },
    typhoid: {
        name: "Typhoid Fever",
        cases: "Cj5rTc9nEvl",
        deaths: "Yy9NtNfwYZJ",
        category: DISEASE_CATEGORIES.WATER_BORNE,
    },
    cholera: {
        name: "IDSR Cholera",
        cases: "UsSUX0cpKsH",
        deaths: "eY5ehpbEsB7",
        category: DISEASE_CATEGORIES.WATER_BORNE,
    },
    // Air-Borne & Respiratory (6 diseases)
    ariPneumonia: {
        name: "ARI Treated with Antibiotics (Pneumonia)",
        cases: "iKGjnOOaPlE",
        category: DISEASE_CATEGORIES.AIR_BORNE,
    },
    ariCough: {
        name: "ARI Treated without Antibiotics (Cough)",
        cases: "Cm4XUw6VAxv",
        category: DISEASE_CATEGORIES.AIR_BORNE,
    },
    measlesIDSR: {
        name: "IDSR Measles",
        cases: "YazgqXbizv1",
        deaths: "f7n9E0hX8qk",
        category: DISEASE_CATEGORIES.AIR_BORNE,
    },
    measles: {
        name: "Measles",
        cases: "GCvqIM3IzN0",
        deaths: "f7n9E0hX8qk",
        category: DISEASE_CATEGORIES.AIR_BORNE,
    },
    tuberculosis: {
        name: "Tuberculosis",
        cases: "z9dYcQ2DlBG",
        category: DISEASE_CATEGORIES.AIR_BORNE,
    },
    meningitis: {
        name: "Meningitis/Severe Bacterial Infection",
        cases: "JFFUt8yR2iW",
        deaths: "MSZuQ1mTsia",
        category: DISEASE_CATEGORIES.AIR_BORNE,
    },
    // Neglected Tropical Diseases (4 diseases)
    wormInfestation: {
        name: "Worm Infestation",
        cases: "Usk9Asj5DED",
        category: DISEASE_CATEGORIES.NEGLECTED_TROPICAL,
    },
    schistosomiasis: {
        name: "Schistosomiasis",
        cases: "Y7Oq71I3ASg",
        category: DISEASE_CATEGORIES.NEGLECTED_TROPICAL,
    },
    onchocerciasis: {
        name: "Onchocerciasis",
        cases: "DrEOxW8mbbh",
        category: DISEASE_CATEGORIES.NEGLECTED_TROPICAL,
    },
    yaws: {
        name: "Yaws",
        cases: "FF3Ev33BuCh",
        category: DISEASE_CATEGORIES.NEGLECTED_TROPICAL,
    },
    // Vaccine-Preventable (3 diseases - measles counted in Air-Borne)
    tetanus: {
        name: "Tetanus (not incl. 0-28 days)",
        cases: "Uoj2wmnr5Dw",
        deaths: "hM4ya5T2AqX",
        category: DISEASE_CATEGORIES.VACCINE_PREVENTABLE,
    },
    neonatalTetanus: {
        name: "Neonatal Tetanus",
        cases: "wcwbN1jR0ar",
        deaths: "Vp12ncSU1Av",
        category: DISEASE_CATEGORIES.VACCINE_PREVENTABLE,
    },
    afp: {
        name: "Acute Flaccid Paralysis (AFP)",
        cases: "FQ2o8UBlcrS",
        deaths: "FTRrcoaog83",
        category: DISEASE_CATEGORIES.VACCINE_PREVENTABLE,
    },
    // Other Infections & NCDs (5 diseases)
    allOther: {
        name: "All Other",
        cases: "A2VfEfPflHV",
        category: DISEASE_CATEGORIES.OTHER_INFECTIONS,
    },
    skinInfection: {
        name: "Skin Infection",
        cases: "Y4cFzB4A9ZQ",
        category: DISEASE_CATEGORIES.OTHER_INFECTIONS,
    },
    malnutrition: {
        name: "Clinical Malnutrition",
        cases: "TBbCcJfZ91x",
        category: DISEASE_CATEGORIES.OTHER_INFECTIONS,
    },
    eyeInfection: {
        name: "Eye Infection",
        cases: "BQI18TPLR7W",
        category: DISEASE_CATEGORIES.OTHER_INFECTIONS,
    },
    otitisMedia: {
        name: "Otitis Media",
        cases: "DWLCM68Q7Zl",
        category: DISEASE_CATEGORIES.OTHER_INFECTIONS,
    },
    // Viral Hemorrhagic (1 disease)
    lassaFever: {
        name: "Lassa Fever",
        cases: "NCteyX2xpMf",
        category: DISEASE_CATEGORIES.VIRAL_HEMORRHAGIC,
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
                category: config.category,
            }));
            return diseases;
        }
        catch (error) {
            logger.error({ error }, "Error fetching all diseases");
            throw error;
        }
    }
    /**
     * Helper function to extract disease group name from full disease name
     */
    extractDiseaseGroup(diseaseName) {
        // Normalize the name for grouping
        const name = diseaseName.toLowerCase();
        // Define disease group patterns
        if (name.includes('diarrhoea'))
            return 'Diarrhoea';
        if (name.includes('ari '))
            return 'ARI';
        if (name.includes('measles'))
            return 'Measles';
        if (name.includes('yellow fever'))
            return 'Yellow Fever';
        if (name.includes('sti '))
            return 'STI';
        if (name.includes('tetanus'))
            return 'Tetanus';
        // For diseases without variants, use the disease name itself
        return diseaseName;
    }
    /**
     * Get diseases grouped by category with disease group hierarchy
     */
    async getDiseasesByCategory() {
        try {
            logger.debug("Fetching diseases grouped by category with disease groups");
            const diseasesByCategory = {};
            Object.entries(DISEASE_DATA_ELEMENTS).forEach(([id, config]) => {
                if (!diseasesByCategory[config.category]) {
                    diseasesByCategory[config.category] = [];
                }
                const diseaseGroup = this.extractDiseaseGroup(config.name);
                diseasesByCategory[config.category].push({
                    id,
                    name: config.name,
                    uid: config.cases,
                    group: diseaseGroup,
                });
            });
            return diseasesByCategory;
        }
        catch (error) {
            logger.error({ error }, "Error fetching diseases by category");
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
          AND p.startdate <= NOW()
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
          AND p.startdate <= NOW()
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
     * Get Disease Breakdown by Category for all diseases (for overview)
     * Returns data grouped by category to ensure all 7 categories are always shown
     */
    async getDiseaseBreakdown(locationUid, days, diseaseId) {
        try {
            logger.debug({ locationUid, days, diseaseId }, "Fetching Disease Breakdown by Category");
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
          AND p.startdate <= NOW()
      `;
            params.push(allCaseUIDs);
            paramIndex++;
            if (days) {
                query += ` AND p.startdate >= NOW() - INTERVAL '${days} days' AND p.startdate <= NOW()`;
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
            logger.error({ error }, "Error fetching Disease Breakdown by Category");
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
            MAX(p.enddate) as last_report_date
          FROM datavalue dv
          JOIN dataelement de ON dv.dataelementid = de.dataelementid
          JOIN organisationunit ou ON dv.sourceid = ou.organisationunitid
          JOIN period p ON dv.periodid = p.periodid
          LEFT JOIN organisationunit parent_ou ON ou.parentid = parent_ou.organisationunitid
          WHERE dv.deleted = false
            AND ou.hierarchylevel = 4
            AND de.uid = ANY($1::text[])
            AND dv.value IS NOT NULL
            AND p.startdate <= NOW()
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
}
export const diseaseService = new DiseaseService();
