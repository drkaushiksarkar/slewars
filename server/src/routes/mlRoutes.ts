import { Router } from "express";
import { z } from "zod";
import { mlService } from "../services/ml/mlService";
import { TimeSeriesPoint } from "../types/dashboard";

const predictSchema = z.object({
  cases: z.number(),
  rainfall: z.number(),
  temperature: z.number(),
  humidity: z.number()
});

const anomalySchema = z.object({
  timeSeries: z
    .array(
      z.object({
        date: z.string(),
        cases: z.number(),
        rainfall: z.number().optional(),
        temperature: z.number().optional(),
        humidity: z.number().optional()
      })
    )
    .min(2)
});

export const mlRouter = Router();

mlRouter.post("/predict", async (req, res, next) => {
  try {
    const features = predictSchema.parse(req.body);
    const prediction = await mlService.predictRisk(features);
    res.json(prediction);
  } catch (error) {
    next(error);
  }
});

mlRouter.post("/anomalies", (req, res, next) => {
  try {
    const payload = anomalySchema.parse(req.body);
    const normalizedSeries = payload.timeSeries.map((point) => ({
      ...point,
      rainfall: point.rainfall ?? 0,
      temperature: point.temperature ?? 0,
      humidity: point.humidity ?? 0
    }));
    const anomalies = mlService.detectAnomalies(normalizedSeries as TimeSeriesPoint[]);
    res.json(anomalies);
  } catch (error) {
    next(error);
  }
});
