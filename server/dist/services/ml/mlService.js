import fs from "fs/promises";
import path from "path";
import logger from "../logger.js";
import { OutbreakRiskModel } from "./outbreakRiskModel.js";
import { SeasonalAnomalyModel } from "./anomalyModel.js";
const TRAINING_FILE = path.join(process.cwd(), "server", "data", "training", "outbreak-training.json");
class MLService {
    constructor() {
        this.riskModel = new OutbreakRiskModel();
        this.anomalyModel = new SeasonalAnomalyModel(4, 2.5);
        this.readyPromise = this.trainFromDisk();
    }
    async trainFromDisk() {
        try {
            const raw = await fs.readFile(TRAINING_FILE, "utf-8");
            const dataset = JSON.parse(raw);
            this.riskModel.train(dataset);
            logger.info({ sampleCount: dataset.length }, "Trained outbreak risk model");
        }
        catch (error) {
            logger.error({ error }, "Failed to train outbreak risk model");
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
export const mlService = new MLService();
