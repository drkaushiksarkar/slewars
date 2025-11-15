"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCountryConfig = exports.getCountryConfigs = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
const env_js_1 = require("./env.js");
const logger_js_1 = __importDefault(require("../services/logger.js"));
const countrySchema = zod_1.z.record(zod_1.z.string(), zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    flag: zod_1.z.string(),
    languages: zod_1.z.array(zod_1.z.string()),
    timeZone: zod_1.z.string(),
    currency: zod_1.z.string(),
    diseases: zod_1.z.array(zod_1.z.string()),
    regions: zod_1.z.array(zod_1.z.string()),
    climateFactors: zod_1.z.array(zod_1.z.string()),
    healthSystemLevels: zod_1.z.array(zod_1.z.string()),
    emergencyContacts: zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
    thresholds: zod_1.z.record(zod_1.z.string(), zod_1.z.object({
        high: zod_1.z.number(),
        medium: zod_1.z.number(),
        low: zod_1.z.number()
    })),
    map: zod_1.z.object({
        center: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]),
        zoom: zod_1.z.number()
    }),
    dhis2: zod_1.z
        .object({
        orgUnit: zod_1.z.string(),
        dataElements: zod_1.z.array(zod_1.z.string()),
        program: zod_1.z.string().optional()
    })
        .optional()
}));
let cache = null;
const resolveConfigPath = () => {
    if (env_js_1.env.COUNTRY_CONFIG_PATH) {
        return env_js_1.env.COUNTRY_CONFIG_PATH;
    }
    return path_1.default.join(process.cwd(), "server", "config", "country-config.json");
};
const loadConfigFile = async () => {
    const configPath = resolveConfigPath();
    const fileData = await promises_1.default.readFile(configPath, "utf-8");
    const parsed = JSON.parse(fileData);
    const data = countrySchema.parse(parsed);
    return data;
};
const getCountryConfigs = async () => {
    if (!cache) {
        try {
            cache = await loadConfigFile();
            logger_js_1.default.info({ countryCount: Object.keys(cache).length }, "Loaded country configuration");
        }
        catch (error) {
            logger_js_1.default.error({ error }, "Failed to load country configuration");
            throw error;
        }
    }
    return cache;
};
exports.getCountryConfigs = getCountryConfigs;
const getCountryConfig = async (countryId) => {
    const configs = await (0, exports.getCountryConfigs)();
    return configs[countryId.toLowerCase()];
};
exports.getCountryConfig = getCountryConfig;
