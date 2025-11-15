import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { env } from "./env.js";
import { CountryConfig, CountryConfigMap } from "../types/country.js";
import logger from "../services/logger.js";

const countrySchema = z.record(
  z.string(),
  z.object({
    id: z.string(),
    name: z.string(),
    flag: z.string(),
    languages: z.array(z.string()),
    timeZone: z.string(),
    currency: z.string(),
    diseases: z.array(z.string()),
    regions: z.array(z.string()),
    climateFactors: z.array(z.string()),
    healthSystemLevels: z.array(z.string()),
    emergencyContacts: z.record(z.string(), z.string()),
    thresholds: z.record(
      z.string(),
      z.object({
        high: z.number(),
        medium: z.number(),
        low: z.number()
      })
    ),
    map: z.object({
      center: z.tuple([z.number(), z.number()]),
      zoom: z.number()
    }),
    dhis2: z
      .object({
        orgUnit: z.string(),
        dataElements: z.array(z.string()),
        program: z.string().optional()
      })
      .optional()
  })
);

let cache: CountryConfigMap | null = null;

const resolveConfigPath = () => {
  if (env.COUNTRY_CONFIG_PATH) {
    return env.COUNTRY_CONFIG_PATH;
  }
  return path.join(process.cwd(), "server", "config", "country-config.json");
};

const loadConfigFile = async (): Promise<CountryConfigMap> => {
  const configPath = resolveConfigPath();
  const fileData = await fs.readFile(configPath, "utf-8");
  const parsed = JSON.parse(fileData);
  const data = countrySchema.parse(parsed) as CountryConfigMap;
  return data;
};

export const getCountryConfigs = async (): Promise<CountryConfigMap> => {
  if (!cache) {
    try {
      cache = await loadConfigFile();
      logger.info(
        { countryCount: Object.keys(cache).length },
        "Loaded country configuration"
      );
    } catch (error) {
      logger.error({ error }, "Failed to load country configuration");
      throw error;
    }
  }
  return cache;
};

export const getCountryConfig = async (
  countryId: string
): Promise<CountryConfig | undefined> => {
  const configs = await getCountryConfigs();
  return configs[countryId.toLowerCase()];
};
