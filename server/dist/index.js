"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const logger_1 = __importDefault(require("./services/logger"));
const server = app_1.app.listen(env_1.env.PORT, () => {
    logger_1.default.info({ port: env_1.env.PORT }, "API server listening");
});
process.on("unhandledRejection", (reason) => {
    logger_1.default.error({ reason }, "Unhandled promise rejection");
});
process.on("SIGTERM", () => {
    logger_1.default.info("Received SIGTERM, shutting down gracefully");
    server.close(() => {
        process.exit(0);
    });
});
