import express from "express";
import cors from "cors";
import routes from "./routes/index.js";
import logger from "./services/logger.js";
export const app = express();
app.use(cors({
    origin: "*"
}));
app.use(express.json({ limit: "1mb" }));
app.use("/api", routes);
app.use((err, _req, res, _next) => {
    logger.error({ err }, "Unhandled error");
    res.status(500).json({ message: err.message || "Internal server error" });
});
