"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeasonalAnomalyModel = void 0;
class SeasonalAnomalyModel {
    constructor(windowSize = 3, threshold = 2) {
        this.windowSize = windowSize;
        this.threshold = threshold;
    }
    detect(series) {
        if (series.length < this.windowSize)
            return [];
        const anomalies = [];
        const values = series.map((point) => point.cases);
        series.forEach((point, index) => {
            if (index < this.windowSize)
                return;
            const window = values.slice(index - this.windowSize, index);
            const mean = this.mean(window);
            const std = this.std(window, mean) || 1;
            const zScore = Math.abs(point.cases - mean) / std;
            if (zScore >= this.threshold) {
                anomalies.push({
                    date: point.date,
                    cases: point.cases,
                    deviation: Number((zScore).toFixed(2)),
                    severity: this.severityFromZScore(zScore)
                });
            }
        });
        return anomalies;
    }
    mean(values) {
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }
    std(values, mean) {
        const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
        return Math.sqrt(variance);
    }
    severityFromZScore(zScore) {
        if (zScore >= 3)
            return "High";
        if (zScore >= 2.5)
            return "Medium";
        return "Low";
    }
}
exports.SeasonalAnomalyModel = SeasonalAnomalyModel;
