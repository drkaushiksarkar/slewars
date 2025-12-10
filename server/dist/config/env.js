"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = require("dotenv");
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
(0, dotenv_1.config)();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z
        .enum(["development", "test", "production"])
        .default("development"),
    PORT: zod_1.z.coerce.number().default(4000),
    DASHBOARD_DATA_SOURCE: zod_1.z
        .enum(["synthetic", "dhis2", "hybrid", "postgres"])
        .default("synthetic"),
    DHIS2_BASE_URL: zod_1.z.string().optional(),
    DHIS2_USERNAME: zod_1.z.string().optional(),
    DHIS2_PASSWORD: zod_1.z.string().optional(),
    DHIS2_VERIFY_SSL: zod_1.z
        .enum(["true", "false"])
        .optional()
        .default("true"),
    DHIS2_TIMEOUT_MS: zod_1.z.coerce.number().optional().default(15000),
    COUNTRY_CONFIG_PATH: zod_1.z
        .string()
        .optional()
        .default(path_1.default.join(process.cwd(), "server", "config", "country-config.json")),
    // PostgreSQL configuration - REQUIRED for connecting to DHIS2 database
    POSTGRES_HOST: zod_1.z.string().default("localhost"),
    POSTGRES_PORT: zod_1.z.coerce.number().default(5432),
    POSTGRES_DB: zod_1.z.string().min(1, "POSTGRES_DB is required - must specify DHIS2 database name"),
    POSTGRES_USER: zod_1.z.string().min(1, "POSTGRES_USER is required - must specify database username"),
    POSTGRES_PASSWORD: zod_1.z.string().min(1, "POSTGRES_PASSWORD is required - must specify database password")
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error("❌ Invalid environment configuration", parsed.error.format());
    throw new Error("Invalid environment configuration");
}
exports.env = parsed.data;
