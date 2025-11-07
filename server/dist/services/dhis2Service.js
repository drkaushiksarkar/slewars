"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dhis2Service = void 0;
const axios_1 = __importDefault(require("axios"));
const https_1 = __importDefault(require("https"));
const env_1 = require("../config/env");
const logger_1 = __importDefault(require("./logger"));
class Dhis2Service {
    constructor() {
        this.client = null;
    }
    getClient() {
        if (!env_1.env.DHIS2_BASE_URL) {
            throw new Error("DHIS2_BASE_URL is not configured");
        }
        if (!this.client) {
            this.client = axios_1.default.create({
                baseURL: env_1.env.DHIS2_BASE_URL.replace(/\/$/, ""),
                timeout: env_1.env.DHIS2_TIMEOUT_MS,
                auth: env_1.env.DHIS2_USERNAME && env_1.env.DHIS2_PASSWORD
                    ? {
                        username: env_1.env.DHIS2_USERNAME,
                        password: env_1.env.DHIS2_PASSWORD
                    }
                    : undefined,
                httpsAgent: new https_1.default.Agent({
                    rejectUnauthorized: env_1.env.DHIS2_VERIFY_SSL === "true"
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
            logger_1.default.error({ error }, "DHIS2 health check failed");
            return { ok: false };
        }
    }
}
exports.dhis2Service = new Dhis2Service();
