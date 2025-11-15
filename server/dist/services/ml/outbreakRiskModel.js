const FEATURE_KEYS = ["cases", "rainfall", "temperature", "humidity"];
const sigmoid = (value) => 1 / (1 + Math.exp(-value));
export class OutbreakRiskModel {
    constructor() {
        this.weights = Array(FEATURE_KEYS.length).fill(0.01);
        this.bias = 0;
        this.featureStats = null;
    }
    train(dataset, options = {}) {
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
            this.weights = this.weights.map((weight, index) => weight - learningRate * (weightGradients[index] / dataset.length));
            this.bias -= learningRate * (biasGradient / dataset.length);
        }
    }
    predict(features) {
        const normalized = this.normalizeFeatures(features);
        const score = sigmoid(this.dotProduct(normalized) + this.bias);
        return Number(score.toFixed(4));
    }
    predictWithExplanation(features) {
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
    getRiskLevel(score) {
        if (score >= 0.75)
            return "High";
        if (score >= 0.4)
            return "Medium";
        return "Low";
    }
    normalizeFeatures(features) {
        if (!this.featureStats) {
            return FEATURE_KEYS.map((key) => features[key] ?? 0);
        }
        return FEATURE_KEYS.map((key) => {
            const { mean, std } = this.featureStats[key];
            const value = features[key] ?? 0;
            return std === 0 ? value - mean : (value - mean) / std;
        });
    }
    calculateFeatureStats(dataset) {
        const stats = {};
        FEATURE_KEYS.forEach((key) => {
            const values = dataset.map((sample) => sample.features[key]);
            const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
            const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
            stats[key] = { mean, std: Math.sqrt(variance) || 1 };
        });
        return stats;
    }
    dotProduct(input) {
        return input.reduce((sum, value, index) => sum + value * this.weights[index], 0);
    }
}
