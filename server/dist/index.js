"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = require("./app.js");
const env_js_1 = require("./config/env.js");
const logger_js_1 = __importDefault(require("./services/logger.js"));
const server = app_js_1.app.listen(env_js_1.env.PORT, () => {
    logger_js_1.default.info({ port: env_js_1.env.PORT }, "API server listening");
});
process.on("unhandledRejection", (reason) => {
    logger_js_1.default.error({ reason }, "Unhandled promise rejection");
});
process.on("SIGTERM", () => {
    logger_js_1.default.info("Received SIGTERM, shutting down gracefully");
    server.close(() => {
        process.exit(0);
    });
});
