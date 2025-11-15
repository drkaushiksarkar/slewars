import fs from "fs/promises";
import path from "path";
import logger from "../logger.js";
import { OutbreakRiskModel, TrainingSample, PredictionResult } from "./outbreakRiskModel.js";
import { SeasonalAnomalyModel, AnomalyResult } from "./anomalyModel.js";
import { TimeSeriesPoint } from "../../types/dashboard.js";

const TRAINING_FILE = path.join(
  process.cwd(),
  "server",
  "data",
  "training",
  "outbreak-training.json"
);

class MLService {
  private riskModel = new OutbreakRiskModel();
  private anomalyModel = new SeasonalAnomalyModel(4, 2.5);
  private readyPromise: Promise<void>;

  constructor() {
    this.readyPromise = this.trainFromDisk();
  }

  private async trainFromDisk(): Promise<void> {
    try {
      const raw = await fs.readFile(TRAINING_FILE, "utf-8");
      const dataset = JSON.parse(raw) as TrainingSample[];
      this.riskModel.train(dataset);
      logger.info({ sampleCount: dataset.length }, "Trained outbreak risk model");
    } catch (error) {
      logger.error({ error }, "Failed to train outbreak risk model");
      throw error;
    }
  }

  private async ensureReady() {
    await this.readyPromise;
  }

  public async predictRisk(
    features: TrainingSample["features"]
  ): Promise<PredictionResult> {
    await this.ensureReady();
    return this.riskModel.predictWithExplanation(features);
  }

  public detectAnomalies(series: TimeSeriesPoint[]): AnomalyResult[] {
    return this.anomalyModel.detect(series);
  }
}

export const mlService = new MLService();
