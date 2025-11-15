import { app } from "./app.js";
import { env } from "./config/env.js";
import logger from "./services/logger.js";

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "API server listening");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});

process.on("SIGTERM", () => {
  logger.info("Received SIGTERM, shutting down gracefully");
  server.close(() => {
    process.exit(0);
  });
});
