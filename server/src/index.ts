import { app } from "./app";
import { env } from "./config/env";
import logger from "./services/logger";

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
