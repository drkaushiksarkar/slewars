import { Pool } from "pg";
import { env } from "../config/env.js";
import logger from "./logger.js";
class PostgresService {
    constructor() {
        this.pool = null;
    }
    getPool() {
        if (!this.pool) {
            const config = {
                host: env.POSTGRES_HOST,
                port: env.POSTGRES_PORT,
                database: env.POSTGRES_DB,
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            };
            // Only add user/password if they are provided
            if (env.POSTGRES_USER) {
                config.user = env.POSTGRES_USER;
            }
            if (env.POSTGRES_PASSWORD) {
                config.password = env.POSTGRES_PASSWORD;
            }
            this.pool = new Pool(config);
            this.pool.on("error", (err) => {
                logger.error({ err }, "Unexpected error on idle PostgreSQL client");
            });
        }
        return this.pool;
    }
    async query(text, params) {
        const pool = this.getPool();
        const start = Date.now();
        try {
            const result = await pool.query(text, params);
            const duration = Date.now() - start;
            logger.debug({ duration, rows: result.rowCount }, "Executed PostgreSQL query");
            return result;
        }
        catch (error) {
            logger.error({ error }, "PostgreSQL query failed");
            throw error;
        }
    }
    async healthCheck() {
        try {
            await this.query("SELECT 1");
            return true;
        }
        catch (error) {
            logger.error({ error }, "PostgreSQL health check failed");
            return false;
        }
    }
    async close() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            logger.info("PostgreSQL connection pool closed");
        }
    }
    // DHIS2 specific queries
    async getDataElements(diseaseNames) {
        let query = `
      SELECT
        de.dataelementid,
        de.uid,
        de.name,
        de.shortname,
        de.code,
        de.description,
        de.valuetype,
        de.domaintype,
        de.aggregationtype
      FROM dataelement de
      WHERE de.name IS NOT NULL
    `;
        if (diseaseNames && diseaseNames.length > 0) {
            const diseasePattern = diseaseNames.map(d => `%${d}%`).join("|");
            query += ` AND (${diseaseNames.map((_, i) => `de.name ILIKE $${i + 1}`).join(" OR ")})`;
            const result = await this.query(query, diseaseNames.map(d => `%${d}%`));
            return result.rows;
        }
        const result = await this.query(query);
        return result.rows;
    }
    async getOrganisationUnits() {
        const query = `
      SELECT
        ou.organisationunitid,
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
        const result = await this.query(query);
        return result.rows;
    }
    async getDataValues(params) {
        let query = `
      SELECT
        dv.dataelementid,
        de.name as dataelementname,
        dv.periodid,
        p.startdate,
        p.enddate,
        dv.sourceid as orgunitid,
        ou.name as orgunitname,
        dv.value,
        dv.storedby,
        dv.lastupdated,
        dv.created,
        dv.comment,
        dv.followup,
        dv.deleted
      FROM datavalue dv
      LEFT JOIN dataelement de ON dv.dataelementid = de.dataelementid
      LEFT JOIN period p ON dv.periodid = p.periodid
      LEFT JOIN organisationunit ou ON dv.sourceid = ou.organisationunitid
      WHERE dv.deleted = false
    `;
        const queryParams = [];
        let paramIndex = 1;
        if (params.dataElementIds && params.dataElementIds.length > 0) {
            query += ` AND dv.dataelementid = ANY($${paramIndex}::int[])`;
            queryParams.push(params.dataElementIds);
            paramIndex++;
        }
        if (params.orgUnitIds && params.orgUnitIds.length > 0) {
            query += ` AND dv.sourceid = ANY($${paramIndex}::int[])`;
            queryParams.push(params.orgUnitIds);
            paramIndex++;
        }
        if (params.startDate) {
            query += ` AND p.startdate >= $${paramIndex}`;
            queryParams.push(params.startDate);
            paramIndex++;
        }
        if (params.endDate) {
            query += ` AND p.enddate <= $${paramIndex}`;
            queryParams.push(params.endDate);
            paramIndex++;
        }
        query += ` ORDER BY p.startdate DESC, de.name`;
        if (params.limit) {
            query += ` LIMIT $${paramIndex}`;
            queryParams.push(params.limit);
        }
        const result = await this.query(query, queryParams);
        return result.rows;
    }
    async getIndicators(diseaseNames) {
        let query = `
      SELECT
        i.indicatorid,
        i.uid,
        i.name,
        i.shortname,
        i.code,
        i.description,
        i.annualized,
        i.indicatortypeid,
        it.name as indicatortypename,
        i.numerator,
        i.numeratordescription,
        i.denominator,
        i.denominatordescription
      FROM indicator i
      LEFT JOIN indicatortype it ON i.indicatortypeid = it.indicatortypeid
      WHERE i.name IS NOT NULL
    `;
        if (diseaseNames && diseaseNames.length > 0) {
            query += ` AND (${diseaseNames.map((_, i) => `i.name ILIKE $${i + 1}`).join(" OR ")})`;
            const result = await this.query(query, diseaseNames.map(d => `%${d}%`));
            return result.rows;
        }
        const result = await this.query(query);
        return result.rows;
    }
    async getPrograms() {
        const query = `
      SELECT
        p.programid,
        p.uid,
        p.name,
        p.shortname,
        p.description,
        p.type as programtype
      FROM program p
      ORDER BY p.name
    `;
        const result = await this.query(query);
        return result.rows;
    }
    async getDiseaseStats(diseaseDataElementIds, orgUnitId) {
        let query = `
      SELECT
        de.name as disease,
        COUNT(DISTINCT dv.periodid) as total_periods,
        SUM(CAST(dv.value AS INTEGER)) as total_cases,
        AVG(CAST(dv.value AS INTEGER)) as avg_cases,
        MAX(CAST(dv.value AS INTEGER)) as max_cases,
        MIN(p.startdate) as earliest_date,
        MAX(p.enddate) as latest_date
      FROM datavalue dv
      JOIN dataelement de ON dv.dataelementid = de.dataelementid
      JOIN period p ON dv.periodid = p.periodid
      WHERE dv.deleted = false
        AND dv.dataelementid = ANY($1::int[])
        AND dv.value ~ '^[0-9]+$'
    `;
        const params = [diseaseDataElementIds];
        if (orgUnitId) {
            query += ` AND dv.sourceid = $2`;
            params.push(orgUnitId);
        }
        query += ` GROUP BY de.name ORDER BY total_cases DESC`;
        const result = await this.query(query, params);
        return result.rows;
    }
}
export const postgresService = new PostgresService();
