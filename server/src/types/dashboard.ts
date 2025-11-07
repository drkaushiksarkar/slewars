import { CountryConfig } from "./country";

export interface TimeSeriesPoint {
  date: string;
  cases: number;
  rainfall: number;
  temperature: number;
  humidity: number;
}

export interface AlertRecommendation {
  action: string;
  priority: "High" | "Medium" | "Low";
  impact: number;
}

export interface AlertTimelinePoint {
  date: string;
  cases: number;
}

export interface AlertDetail {
  id: string;
  disease: string;
  severity: "High" | "Medium" | "Low";
  region: string;
  cases: number;
  trend: string;
  confidence: number;
  predictiveFactors: string[];
  timeline: AlertTimelinePoint[];
  recommendations: AlertRecommendation[];
}

export interface AlertStats {
  total: number;
  active: number;
  resolved: number;
  trend: string;
  byDisease: Record<string, number>;
  byRegion: Record<string, number>;
}

export interface PredictionMetrics {
  overall: number;
  byDisease: Record<string, number>;
  confusionMatrix: {
    truePositive: number;
    falsePositive: number;
    trueNegative: number;
    falseNegative: number;
  };
}

export interface OverviewPayload {
  country: CountryConfig;
  alertStats: AlertStats;
  predictionMetrics: PredictionMetrics;
  alerts: AlertDetail[];
  timeSeries: TimeSeriesPoint[];
  lastUpdated: string;
  dataSource: "synthetic" | "dhis2" | "hybrid";
}
