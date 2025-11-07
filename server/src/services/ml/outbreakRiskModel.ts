type FeatureKey = "cases" | "rainfall" | "temperature" | "humidity";

export interface TrainingSample {
  features: Record<FeatureKey, number>;
  label: number;
}

export interface PredictionResult {
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High";
  contributingFactors: { feature: FeatureKey; weight: number }[];
}

const FEATURE_KEYS: FeatureKey[] = ["cases", "rainfall", "temperature", "humidity"];

const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));

export class OutbreakRiskModel {
  private weights: number[] = Array(FEATURE_KEYS.length).fill(0.01);
  private bias = 0;
  private featureStats: Record<FeatureKey, { mean: number; std: number }> | null =
    null;

  public train(
    dataset: TrainingSample[],
    options: { learningRate?: number; epochs?: number } = {}
  ): void {
    const { learningRate = 0.0005, epochs = 400 } = options;
    if (!dataset.length) {
      return;
    }

    this.featureStats = this.calculateFeatureStats(dataset);

    for (let epoch = 0; epoch < epochs; epoch += 1) {
      const weightGradients = Array(this.weights.length).fill(0);
      let biasGradient = 0;

      dataset.forEach((sample) => {
        const input = this.normalizeFeatures(sample.features);
        const linearOutput = this.dotProduct(input) + this.bias;
        const prediction = sigmoid(linearOutput);
        const error = prediction - sample.label;

        FEATURE_KEYS.forEach((_, index) => {
          weightGradients[index] += error * input[index];
        });
        biasGradient += error;
      });

      this.weights = this.weights.map(
        (weight, index) => weight - learningRate * (weightGradients[index] / dataset.length)
      );
      this.bias -= learningRate * (biasGradient / dataset.length);
    }
  }

  public predict(features: Record<FeatureKey, number>): number {
    const normalized = this.normalizeFeatures(features);
    const score = sigmoid(this.dotProduct(normalized) + this.bias);
    return Number(score.toFixed(4));
  }

  public predictWithExplanation(features: Record<FeatureKey, number>): PredictionResult {
    const normalized = this.normalizeFeatures(features);
    const score = sigmoid(this.dotProduct(normalized) + this.bias);
    const contributions = FEATURE_KEYS.map((feature, index) => ({
      feature,
      weight: Number((this.weights[index] * normalized[index]).toFixed(4))
    }));

    return {
      riskScore: Number(score.toFixed(4)),
      riskLevel: this.getRiskLevel(score),
      contributingFactors: contributions.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    };
  }

  private getRiskLevel(score: number): PredictionResult["riskLevel"] {
    if (score >= 0.75) return "High";
    if (score >= 0.4) return "Medium";
    return "Low";
  }

  private normalizeFeatures(features: Record<FeatureKey, number>): number[] {
    if (!this.featureStats) {
      return FEATURE_KEYS.map((key) => features[key] ?? 0);
    }
    return FEATURE_KEYS.map((key) => {
      const { mean, std } = this.featureStats![key];
      const value = features[key] ?? 0;
      return std === 0 ? value - mean : (value - mean) / std;
    });
  }

  private calculateFeatureStats(dataset: TrainingSample[]): Record<
    FeatureKey,
    { mean: number; std: number }
  > {
    const stats = {} as Record<FeatureKey, { mean: number; std: number }>;

    FEATURE_KEYS.forEach((key) => {
      const values = dataset.map((sample) => sample.features[key]);
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      const variance =
        values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
      stats[key] = { mean, std: Math.sqrt(variance) || 1 };
    });

    return stats;
  }

  private dotProduct(input: number[]): number {
    return input.reduce((sum, value, index) => sum + value * this.weights[index], 0);
  }
}
