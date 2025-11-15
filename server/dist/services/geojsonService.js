"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.geojsonService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const logger_js_1 = __importDefault(require("./logger.js"));
const SLE_GEOJSON_PATH = path_1.default.join(process.cwd(), "server", "data", "sierra-leone-adm1.geojson");
class GeojsonService {
    constructor() {
        this.sleAdm1 = null;
    }
    async getSierraLeoneAdm1() {
        if (!this.sleAdm1) {
            try {
                const raw = await promises_1.default.readFile(SLE_GEOJSON_PATH, "utf-8");
                this.sleAdm1 = JSON.parse(raw);
            }
            catch (error) {
                logger_js_1.default.error({ error }, "Failed to load Sierra Leone ADM1 geojson");
                throw error;
            }
        }
        return this.sleAdm1;
    }
}
exports.geojsonService = new GeojsonService();
