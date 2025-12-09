import axios from "axios";
import https from "https";
import { env } from "../config/env.js";
import logger from "./logger.js";
class Dhis2Service {
    constructor() {
        this.client = null;
    }
    getClient() {
        if (!env.DHIS2_BASE_URL) {
            throw new Error("DHIS2_BASE_URL is not configured");
        }
        if (!this.client) {
            this.client = axios.create({
                baseURL: env.DHIS2_BASE_URL.replace(/\/$/, ""),
                timeout: env.DHIS2_TIMEOUT_MS,
                auth: env.DHIS2_USERNAME && env.DHIS2_PASSWORD
                    ? {
                        username: env.DHIS2_USERNAME,
                        password: env.DHIS2_PASSWORD
                    }
                    : undefined,
                httpsAgent: new https.Agent({
                    rejectUnauthorized: env.DHIS2_VERIFY_SSL === "true"
                })
            });
        }
        return this.client;
    }
    async fetchAnalytics(params) {
        const client = this.getClient();
        const response = await client.get("/analytics", { params });
        return response.data;
    }
    async fetchEvents(programId, params) {
        const client = this.getClient();
        const response = await client.get(`/events/${programId}`, { params });
        return response.data;
    }
    async healthCheck() {
        try {
            const client = this.getClient();
            const response = await client.get("/system/info");
            return { ok: true, info: response.data };
        }
        catch (error) {
            logger.error({ error }, "DHIS2 health check failed");
            return { ok: false };
        }
    }
}
export const dhis2Service = new Dhis2Service();
