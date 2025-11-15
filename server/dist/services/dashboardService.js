import fs from "fs/promises";
import path from "path";
import NodeCache from "node-cache";
import { env } from "../config/env.js";
import { getCountryConfig } from "../config/countryConfig.js";
import { mlService } from "./ml/mlService.js";
import { dhis2Service } from "./dhis2Service.js";
import logger from "./logger.js";
const SAMPLE_DATA_FILE = path.join(process.cwd(), "server", "data", "sample-timeseries.json");
class DashboardService {
    constructor() {
        this.cache = new NodeCache({ stdTTL: 120 });
        this.syntheticData = null;
    }
    async getOverview(countryId, source = env.DASHBOARD_DATA_SOURCE) {
        const cacheKey = `overview:${countryId}:${source}`;
        const cached = this.cache.get(cacheKey);
        if (cached)
            return cached;
        const country = await getCountryConfig(countryId);
        if (!country) {
            throw new Error(`Unknown country configuration: ${countryId}`);
        }
        let series = await this.loadSyntheticSeries(countryId);
        let dataSource = "synthetic";
        if (source !== "synthetic") {
            try {
                const dhis2Series = await this.loadDhis2Series(country);
                if (dhis2Series.length) {
                    series = source === "hybrid" ? this.mergeSeries(series, dhis2Series) : dhis2Series;
                    dataSource = source;
                }
            }
            catch (error) {
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
        const payload = {
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
    async loadSyntheticSeries(countryId) {
        if (!this.syntheticData) {
            const raw = await fs.readFile(SAMPLE_DATA_FILE, "utf-8");
            this.syntheticData = JSON.parse(raw);
        }
        return this.syntheticData[countryId] ?? [];
    }
    async loadDhis2Series(country) {
        if (!country.dhis2)
            return [];
        try {
            const data = await dhis2Service.fetchAnalytics({
                dimension: [`dx:${country.dhis2.dataElements.join(";")}`, "pe:LAST_12_MONTHS"],
                filter: `ou:${country.dhis2.orgUnit}`,
                displayProperty: "NAME"
            });
            if (!data?.rows)
                return [];
            return data.rows.map((row) => ({
                date: row[1],
                cases: Number(row[2]),
                rainfall: Number(row[3] ?? 0),
                temperature: Number(row[4] ?? 0),
                humidity: Number(row[5] ?? 0)
            }));
        }
        catch (error) {
            logger.error({ error }, "Failed to fetch DHIS2 analytics");
            throw error;
        }
    }
    mergeSeries(baseline, dhis2Series) {
        const merged = {};
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
        return Object.values(merged).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    buildAlertStats(series, country, anomalies) {
        const total = series.reduce((sum, point) => sum + point.cases, 0);
        const active = anomalies.length;
        const resolved = Math.max(total - active * 5, 0);
        const trend = series.length > 1
            ? `${(((series.at(-1).cases - series.at(-2).cases) / Math.max(series.at(-2).cases, 1)) *
                100).toFixed(1)}%`
            : "0%";
        const byRegion = country.regions.reduce((acc, region, index) => {
            const point = series[index % series.length];
            acc[region] = point?.cases ?? 0;
            return acc;
        }, {});
        const byDisease = country.diseases.reduce((acc, disease, index) => {
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
    buildPredictionMetrics(prediction, country) {
        const overall = Math.round(prediction.riskScore * 100);
        const byDisease = country.diseases.reduce((acc, disease, index) => {
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
    buildAlerts(anomalies, prediction, country) {
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
                    predictiveFactors: prediction.contributingFactors.map(({ feature }) => `Elevated ${feature}`),
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
