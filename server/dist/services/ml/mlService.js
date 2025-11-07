"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mlService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../logger"));
const outbreakRiskModel_1 = require("./outbreakRiskModel");
const anomalyModel_1 = require("./anomalyModel");
const TRAINING_FILE = path_1.default.join(process.cwd(), "server", "data", "training", "outbreak-training.json");
class MLService {
    constructor() {
        this.riskModel = new outbreakRiskModel_1.OutbreakRiskModel();
        this.anomalyModel = new anomalyModel_1.SeasonalAnomalyModel(4, 2.5);
        this.readyPromise = this.trainFromDisk();
    }
    async trainFromDisk() {
        try {
            const raw = await promises_1.default.readFile(TRAINING_FILE, "utf-8");
            const dataset = JSON.parse(raw);
            this.riskModel.train(dataset);
            logger_1.default.info({ sampleCount: dataset.length }, "Trained outbreak risk model");
        }
        catch (error) {
            logger_1.default.error({ error }, "Failed to train outbreak risk model");
            throw error;
        }
    }
    async ensureReady() {
        await this.readyPromise;
    }
    async predictRisk(features) {
        await this.ensureReady();
        return this.riskModel.predictWithExplanation(features);
    }
    detectAnomalies(series) {
        return this.anomalyModel.detect(series);
    }
}
exports.mlService = new MLService();
