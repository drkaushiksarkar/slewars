import pino from "pino";
import { env } from "../config/env.js";
const logger = pino({
    transport: env.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "SYS:standard",
                ignore: "pid,hostname"
            }
        }
        : undefined,
    level: env.NODE_ENV === "production" ? "info" : "debug"
});
export default logger;
