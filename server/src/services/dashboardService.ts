import fs from "fs/promises";
import path from "path";
import NodeCache from "node-cache";
import { env } from "../config/env";
import { getCountryConfig } from "../config/countryConfig";
import { mlService } from "./ml/mlService";
import { dhis2Service } from "./dhis2Service";
import logger from "./logger";
import {
  AlertDetail,
  OverviewPayload,
  TimeSeriesPoint
} from "../types/dashboard";
import { CountryConfig } from "../types/country";

type SampleDataset = Record<string, TimeSeriesPoint[]>;

const SAMPLE_DATA_FILE = path.join(
  process.cwd(),
  "server",
  "data",
  "sample-timeseries.json"
);

class DashboardService {
  private cache = new NodeCache({ stdTTL: 120 });
  private syntheticData: SampleDataset | null = null;

  public async getOverview(
    countryId: string,
    source: "synthetic" | "dhis2" | "hybrid" = env.DASHBOARD_DATA_SOURCE
  ): Promise<OverviewPayload> {
    const cacheKey = `overview:${countryId}:${source}`;
    const cached = this.cache.get<OverviewPayload>(cacheKey);
    if (cached) return cached;

    const country = await getCountryConfig(countryId);
    if (!country) {
      throw new Error(`Unknown country configuration: ${countryId}`);
    }

    let series = await this.loadSyntheticSeries(countryId);
    let dataSource: OverviewPayload["dataSource"] = "synthetic";

    if (source !== "synthetic") {
      try {
        const dhis2Series = await this.loadDhis2Series(country);
        if (dhis2Series.length) {
          series = source === "hybrid" ? this.mergeSeries(series, dhis2Series) : dhis2Series;
          dataSource = source;
        }
      } catch (error) {
        logger.warn({ error }, "Falling back to synthetic data");
      }
    }

    const latestPoint = series.at(-1);
    if (!latestPoint) {
      throw new Error("No time series data available");
    }

    const anomalies = mlService.detectAnomalies(series);
    const prediction = await mlService.predictRisk({
      cases: latestPoint.cases,
      rainfall: latestPoint.rainfall,
      temperature: latestPoint.temperature,
      humidity: latestPoint.humidity
    });

    const payload: OverviewPayload = {
      country,
      alertStats: this.buildAlertStats(series, country, anomalies),
      predictionMetrics: this.buildPredictionMetrics(prediction, country),
      alerts: this.buildAlerts(anomalies, prediction, country),
      timeSeries: series,
      lastUpdated: new Date().toISOString(),
      dataSource
    };

    this.cache.set(cacheKey, payload);
    return payload;
  }

  private async loadSyntheticSeries(countryId: string): Promise<TimeSeriesPoint[]> {
    if (!this.syntheticData) {
      const raw = await fs.readFile(SAMPLE_DATA_FILE, "utf-8");
      this.syntheticData = JSON.parse(raw) as SampleDataset;
    }
    return this.syntheticData[countryId] ?? [];
  }

  private async loadDhis2Series(country: CountryConfig): Promise<TimeSeriesPoint[]> {
    if (!country.dhis2) return [];
    try {
      const data = await dhis2Service.fetchAnalytics({
        dimension: [`dx:${country.dhis2.dataElements.join(";")}`, "pe:LAST_12_MONTHS"],
        filter: `ou:${country.dhis2.orgUnit}`,
        displayProperty: "NAME"
      });

      if (!data?.rows) return [];

      return data.rows.map((row: string[]) => ({
        date: row[1],
        cases: Number(row[2]),
        rainfall: Number(row[3] ?? 0),
        temperature: Number(row[4] ?? 0),
        humidity: Number(row[5] ?? 0)
      }));
    } catch (error) {
      logger.error({ error }, "Failed to fetch DHIS2 analytics");
      throw error;
    }
  }

  private mergeSeries(
    baseline: TimeSeriesPoint[],
    dhis2Series: TimeSeriesPoint[]
  ): TimeSeriesPoint[] {
    const merged: Record<string, TimeSeriesPoint> = {};
    baseline.forEach((point) => {
      merged[point.date] = { ...point };
    });
    dhis2Series.forEach((point) => {
      merged[point.date] = {
        ...merged[point.date],
        ...point,
        cases: Math.max(point.cases, merged[point.date]?.cases ?? 0)
      };
    });
    return Object.values(merged).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  private buildAlertStats(
    series: TimeSeriesPoint[],
    country: CountryConfig,
    anomalies: ReturnType<typeof mlService.detectAnomalies>
  ) {
    const total = series.reduce((sum, point) => sum + point.cases, 0);
    const active = anomalies.length;
    const resolved = Math.max(total - active * 5, 0);
    const trend =
      series.length > 1
        ? `${(
            ((series.at(-1)!.cases - series.at(-2)!.cases) / Math.max(series.at(-2)!.cases, 1)) *
            100
          ).toFixed(1)}%`
        : "0%";

    const byRegion = country.regions.reduce<Record<string, number>>((acc, region, index) => {
      const point = series[index % series.length];
      acc[region] = point?.cases ?? 0;
      return acc;
    }, {});

    const byDisease = country.diseases.reduce<Record<string, number>>((acc, disease, index) => {
      const point = series[(series.length - 1 - index + series.length) % series.length];
      acc[disease] = point?.cases ?? 0;
      return acc;
    }, {});

    return {
      total,
      active,
      resolved,
      trend,
      byDisease,
      byRegion
    };
  }

  private buildPredictionMetrics(
    prediction: Awaited<ReturnType<typeof mlService.predictRisk>>,
    country: CountryConfig
  ) {
    const overall = Math.round(prediction.riskScore * 100);
    const byDisease = country.diseases.reduce<Record<string, number>>((acc, disease, index) => {
      const modifier = 1 - index * 0.05;
      acc[disease] = Math.max(50, Math.min(95, Math.round(overall * modifier)));
      return acc;
    }, {});

    return {
      overall,
      byDisease,
      confusionMatrix: {
        truePositive: Math.round(overall * 2),
        falsePositive: Math.round((100 - overall) * 0.5),
        trueNegative: Math.round(overall * 1.5),
        falseNegative: Math.round((100 - overall) * 0.3)
      }
    };
  }

  private buildAlerts(
    anomalies: ReturnType<typeof mlService.detectAnomalies>,
    prediction: Awaited<ReturnType<typeof mlService.predictRisk>>,
    country: CountryConfig
  ): AlertDetail[] {
    if (!anomalies.length) {
      return [
        {
          id: "baseline",
          disease: country.diseases[0],
          severity: prediction.riskLevel,
          region: country.regions[0],
          cases: Math.round(prediction.riskScore * 200),
          trend: `${Math.round(prediction.riskScore * 100)}%`,
          confidence: Math.round(prediction.riskScore * 100),
          predictiveFactors: prediction.contributingFactors.map(
            ({ feature }) => `Elevated ${feature}`
          ),
          timeline: [],
          recommendations: [
            {
              action: "Enhance surveillance",
              priority: prediction.riskLevel,
              impact: Math.round(prediction.riskScore * 100)
            }
          ]
        }
      ];
    }

    return anomalies.map((anomaly, index) => ({
      id: `alert-${index}`,
      disease: country.diseases[index % country.diseases.length],
      severity: anomaly.severity,
      region: country.regions[index % country.regions.length],
      cases: anomaly.cases,
      trend: `${Math.round(anomaly.deviation * 100)}%`,
      confidence: Math.min(99, Math.round(prediction.riskScore * 100)),
      predictiveFactors: prediction.contributingFactors
        .slice(0, 3)
        .map(({ feature }) => `${feature} spike`),
      timeline: [
        { date: anomaly.date, cases: anomaly.cases - 15 },
        { date: anomaly.date, cases: anomaly.cases }
      ],
      recommendations: [
        {
          action: "Deploy rapid response team",
          priority: "High",
          impact: 85
        },
        {
          action: "Community awareness",
          priority: "Medium",
          impact: 70
        }
      ]
    }));
  }
}

export const dashboardService = new DashboardService();
