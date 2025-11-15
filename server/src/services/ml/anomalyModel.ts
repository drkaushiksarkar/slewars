import { TimeSeriesPoint } from "../../types/dashboard.js";

export interface AnomalyResult {
  date: string;
  cases: number;
  deviation: number;
  severity: "Low" | "Medium" | "High";
}

export class SeasonalAnomalyModel {
  constructor(private windowSize = 3, private threshold = 2) {}

  public detect(series: TimeSeriesPoint[]): AnomalyResult[] {
    if (series.length < this.windowSize) return [];

    const anomalies: AnomalyResult[] = [];
    const values = series.map((point) => point.cases);

    series.forEach((point, index) => {
      if (index < this.windowSize) return;
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

  private mean(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private std(values: number[], mean: number): number {
    const variance =
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }

  private severityFromZScore(zScore: number): AnomalyResult["severity"] {
    if (zScore >= 3) return "High";
    if (zScore >= 2.5) return "Medium";
    return "Low";
  }
}
