"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const routes_1 = __importDefault(require("./routes"));
const logger_1 = __importDefault(require("./services/logger"));
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)({
    origin: "*"
}));
exports.app.use(express_1.default.json({ limit: "1mb" }));
exports.app.use("/api", routes_1.default);
exports.app.use((err, _req, res, _next) => {
    logger_1.default.error({ err }, "Unhandled error");
    res.status(500).json({ message: err.message || "Internal server error" });
});
