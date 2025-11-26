import { config as loadEnv } from "dotenv";
import path from "path";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  DASHBOARD_DATA_SOURCE: z
    .enum(["synthetic", "dhis2", "hybrid", "postgres"])
    .default("synthetic"),
  DHIS2_BASE_URL: z.string().optional(),
  DHIS2_USERNAME: z.string().optional(),
  DHIS2_PASSWORD: z.string().optional(),
  DHIS2_VERIFY_SSL: z
    .enum(["true", "false"])
    .optional()
    .default("true"),
  DHIS2_TIMEOUT_MS: z.coerce.number().optional().default(15000),
  COUNTRY_CONFIG_PATH: z
    .string()
    .optional()
    .default(path.join(process.cwd(), "server", "config", "country-config.json")),
  // PostgreSQL configuration - REQUIRED for connecting to DHIS2 database
  POSTGRES_HOST: z.string().default("localhost"),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_DB: z.string().min(1, "POSTGRES_DB is required - must specify DHIS2 database name"),
  POSTGRES_USER: z.string().min(1, "POSTGRES_USER is required - must specify database username"),
  POSTGRES_PASSWORD: z.string().min(1, "POSTGRES_PASSWORD is required - must specify database password")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configuration", parsed.error.format());
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
