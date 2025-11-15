import { postgresService } from "./postgresService.js";
import logger from "./logger.js";

// Disease UIDs from DHIS2 Sierra Leone
const DISEASE_DATA_ELEMENTS = {
  malaria: {
    name: "Malaria",
    cases: "vq2qO3eTrNi",
    deaths: "r6nrJANOqMw",
    inpatient: "p4K11MFEWtw",
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

export interface DiseaseSummary {
  disease: string;
  totalCases: number;
  totalDeaths?: number;
  affectedFacilities: number;
  reportingPeriods: number;
  earliestDate: string;
  latestDate: string;
  avgCasesPerPeriod: number;
  peakCases: number;
}

export interface TimeSeriesData {
  disease: string;
  date: string;
  startDate: string;
  endDate: string;
  cases: number;
  facilitiesReporting: number;
}

export interface DiseaseBreakdown {
  disease: string;
  totalCases: number;
  facilitiesAffected: number;
  avgCasesPerPeriod: number;
  peakCases: number;
}

class DiseaseService {
  /**
   * Get list of all diseases with available data
   */
  async getAllDiseases(): Promise<{ id: string; name: string; uid: string }[]> {
    try {
      logger.debug("Fetching all diseases");

      const diseases = Object.entries(DISEASE_DATA_ELEMENTS).map(([id, config]) => ({
        id,
        name: config.name,
        uid: config.cases,
      }));

      return diseases;
    } catch (error) {
      logger.error({ error }, "Error fetching all diseases");
      throw error;
    }
  }

  /**
   * Get disease summary statistics
   */
  async getDiseaseSummary(diseaseId: string): Promise<DiseaseSummary | null> {
    try {
      logger.debug({ diseaseId }, "Fetching disease summary");

      const diseaseConfig = DISEASE_DATA_ELEMENTS[diseaseId as keyof typeof DISEASE_DATA_ELEMENTS];
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
      const deathsRow =
        "deaths" in diseaseConfig && diseaseConfig.deaths
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
    } catch (error) {
      logger.error({ error, diseaseId }, "Error fetching disease summary");
      throw error;
    }
  }

  /**
   * Get time series data for a disease
   */
  async getDiseaseTimeSeries(
    diseaseId: string,
    startDate?: string,
    endDate?: string,
    locationUid?: string
  ): Promise<TimeSeriesData[]> {
    try {
      logger.debug({ diseaseId, startDate, endDate, locationUid }, "Fetching disease time series");

      const diseaseConfig = DISEASE_DATA_ELEMENTS[diseaseId as keyof typeof DISEASE_DATA_ELEMENTS];
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

      const params: any[] = [diseaseConfig.cases];
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
    } catch (error) {
      logger.error({ error, diseaseId }, "Error fetching disease time series");
      throw error;
    }
  }

  /**
   * Get disease breakdown for all diseases (for overview)
   */
  async getDiseaseBreakdown(locationUid?: string, days?: number, diseaseId?: string): Promise<DiseaseBreakdown[]> {
    try {
      logger.debug({ locationUid, days, diseaseId }, "Fetching disease breakdown");

      // Build disease UIDs array based on filter
      let allCaseUIDs: string[];
      if (diseaseId && diseaseId !== 'all') {
        const diseaseConfig = DISEASE_DATA_ELEMENTS[diseaseId as keyof typeof DISEASE_DATA_ELEMENTS];
        allCaseUIDs = diseaseConfig ? [diseaseConfig.cases] : [];
      } else {
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

      const params: any[] = [];
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
    } catch (error) {
      logger.error({ error }, "Error fetching disease breakdown");
      throw error;
    }
  }

  /**
   * Get disease cases by location
   */
  async getDiseaseCasesByLocation(
    diseaseId: string,
    hierarchyLevel: number = 2 // 2 = districts
  ): Promise<any[]> {
    try {
      logger.debug({ diseaseId, hierarchyLevel }, "Fetching disease cases by location");

      const diseaseConfig = DISEASE_DATA_ELEMENTS[diseaseId as keyof typeof DISEASE_DATA_ELEMENTS];
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
    } catch (error) {
      logger.error({ error, diseaseId }, "Error fetching disease cases by location");
      throw error;
    }
  }
}

export const diseaseService = new DiseaseService();
