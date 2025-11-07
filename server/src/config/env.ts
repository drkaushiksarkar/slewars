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
    .enum(["synthetic", "dhis2", "hybrid"])
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
    .default(path.join(process.cwd(), "server", "config", "country-config.json"))
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configuration", parsed.error.format());
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
