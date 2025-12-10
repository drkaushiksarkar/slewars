"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mlRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const mlService_js_1 = require("../services/ml/mlService.js");
const predictSchema = zod_1.z.object({
    cases: zod_1.z.number(),
    rainfall: zod_1.z.number(),
    temperature: zod_1.z.number(),
    humidity: zod_1.z.number()
});
const anomalySchema = zod_1.z.object({
    timeSeries: zod_1.z
        .array(zod_1.z.object({
        date: zod_1.z.string(),
        cases: zod_1.z.number(),
        rainfall: zod_1.z.number().optional(),
        temperature: zod_1.z.number().optional(),
        humidity: zod_1.z.number().optional()
    }))
        .min(2)
});
exports.mlRouter = (0, express_1.Router)();
exports.mlRouter.post("/predict", async (req, res, next) => {
    try {
        const features = predictSchema.parse(req.body);
        const prediction = await mlService_js_1.mlService.predictRisk(features);
        res.json(prediction);
    }
    catch (error) {
        next(error);
    }
});
exports.mlRouter.post("/anomalies", (req, res, next) => {
    try {
        const payload = anomalySchema.parse(req.body);
        const normalizedSeries = payload.timeSeries.map((point) => ({
            ...point,
            rainfall: point.rainfall ?? 0,
            temperature: point.temperature ?? 0,
            humidity: point.humidity ?? 0
        }));
        const anomalies = mlService_js_1.mlService.detectAnomalies(normalizedSeries);
        res.json(anomalies);
    }
    catch (error) {
        next(error);
    }
});
