import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * ClimateSankeyDiagram - Shows impact of climate variables on disease transmission
 * @param {Array} climateData - Climate data array
 * @param {Array} diseaseData - Disease timeseries data
 * @param {Object} selectedDisease - Selected disease object
 */
const ClimateSankeyDiagram = ({ climateData = [], diseaseData = [], selectedDisease = null }) => {
  const [hoveredFlow, setHoveredFlow] = useState(null);

  // Calculate correlations between climate variables and disease cases
  const correlations = useMemo(() => {
    if (!climateData || climateData.length === 0 || !diseaseData || diseaseData.length === 0) {
      return null;
    }

    // Create a map of disease cases by date
    const diseaseCasesMap = {};
    diseaseData.forEach(item => {
      const date = new Date(item.startDate).toISOString().split('T')[0];
      diseaseCasesMap[date] = item.cases || 0;
    });

    // Merge climate and disease data
    const mergedData = climateData.map(climateItem => {
      const date = new Date(climateItem.date || climateItem.period).toISOString().split('T')[0];
      return {
        temp: parseFloat(climateItem.temperature_mean || climateItem.avg_temperature || 0),
        precip: parseFloat(climateItem.precipitation || climateItem.total_precipitation || 0),
        humidity: parseFloat(climateItem.humidity || climateItem.avg_humidity || 0),
        cases: diseaseCasesMap[date] || 0
      };
    }).filter(d => d.temp && d.cases !== undefined);

    if (mergedData.length < 3) return null;

    // Calculate Pearson correlation coefficient
    const calculateCorrelation = (x, y) => {
      const n = x.length;
      if (n === 0) return 0;

      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
      const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
      const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

      const numerator = n * sumXY - sumX * sumY;
      const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

      return denominator === 0 ? 0 : numerator / denominator;
    };

    const temps = mergedData.map(d => d.temp);
    const precips = mergedData.map(d => d.precip);
    const humidities = mergedData.map(d => d.humidity);
    const cases = mergedData.map(d => d.cases);

    // Calculate correlations with lag consideration (2 weeks forward)
    const lagOffset = Math.min(2, Math.floor(temps.length / 4));
    const tempCorr = calculateCorrelation(temps.slice(0, -lagOffset), cases.slice(lagOffset));
    const precipCorr = calculateCorrelation(precips.slice(0, -lagOffset), cases.slice(lagOffset));
    const humidityCorr = calculateCorrelation(humidities.slice(0, -lagOffset), cases.slice(lagOffset));

    // Calculate relative contributions (normalized absolute values)
    const totalAbsCorr = Math.abs(tempCorr) + Math.abs(precipCorr) + Math.abs(humidityCorr);

    return {
      temperature: {
        correlation: tempCorr,
        contribution: totalAbsCorr > 0 ? (Math.abs(tempCorr) / totalAbsCorr) * 100 : 33.3,
        impact: tempCorr > 0 ? 'positive' : 'negative'
      },
      rainfall: {
        correlation: precipCorr,
        contribution: totalAbsCorr > 0 ? (Math.abs(precipCorr) / totalAbsCorr) * 100 : 33.3,
        impact: precipCorr > 0 ? 'positive' : 'negative'
      },
      humidity: {
        correlation: humidityCorr,
        contribution: totalAbsCorr > 0 ? (Math.abs(humidityCorr) / totalAbsCorr) * 100 : 33.3,
        impact: humidityCorr > 0 ? 'positive' : 'negative'
      }
    };
  }, [climateData, diseaseData]);

  if (!correlations || !selectedDisease) {
    return null;
  }

  const width = 700;
  const height = 300;

  // Define source nodes (climate variables) - using soft, muted colors matching dashboard
  const sources = [
    {
      id: 'temp',
      label: 'Temperature',
      y: 60,
      color: 'rgb(251, 113, 133)', // rose-400
      lightColor: 'rgb(254, 205, 211)', // rose-200
      data: correlations.temperature
    },
    {
      id: 'rain',
      label: 'Rainfall',
      y: 150,
      color: 'rgb(96, 165, 250)', // blue-400
      lightColor: 'rgb(191, 219, 254)', // blue-200
      data: correlations.rainfall
    },
    {
      id: 'humidity',
      label: 'Humidity',
      y: 240,
      color: 'rgb(250, 204, 21)', // yellow-400
      lightColor: 'rgb(254, 240, 138)', // yellow-200
      data: correlations.humidity
    }
  ];

  // Target node (disease)
  const targetY = height / 2;
  const sourceX = 200;
  const targetX = width - 200;

  // Calculate flow heights based on contribution
  const flows = sources.map((source, index) => {
    const contribution = source.data.contribution;
    const flowHeight = Math.max(12, (contribution / 100) * 100); // Height proportional to contribution

    return {
      source,
      sourceY: source.y,
      targetY,
      height: flowHeight,
      contribution,
      correlation: source.data.correlation,
      isPositive: source.data.impact === 'positive'
    };
  });

  // Generate smooth Bezier curve path for Sankey
  const generateSankeyPath = (x1, y1, x2, y2, height) => {
    const midX = (x1 + x2) / 2;

    return `
      M ${x1} ${y1 - height / 2}
      C ${midX} ${y1 - height / 2}, ${midX} ${y2 - height / 2}, ${x2} ${y2 - height / 2}
      L ${x2} ${y2 + height / 2}
      C ${midX} ${y2 + height / 2}, ${midX} ${y1 + height / 2}, ${x1} ${y1 + height / 2}
      Z
    `;
  };

  // Adjust target heights to stack flows
  let cumulativeTargetOffset = -flows.reduce((sum, f) => sum + f.height, 0) / 2;
  const adjustedFlows = flows.map(flow => {
    const adjustedTargetY = targetY + cumulativeTargetOffset + flow.height / 2;
    cumulativeTargetOffset += flow.height;
    return { ...flow, adjustedTargetY };
  });

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Climate Impact Analysis</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Correlation between climate variables and {selectedDisease.name} transmission
        </p>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          {/* Gradients for flows */}
          {adjustedFlows.map((flow, index) => (
            <linearGradient key={`gradient-${index}`} id={`flow-gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={flow.source.color} stopOpacity="0.5" />
              <stop offset="100%" stopColor={flow.isPositive ? 'rgb(134, 239, 172)' : 'rgb(252, 165, 165)'} stopOpacity="0.4" />
            </linearGradient>
          ))}
        </defs>

        {/* Animated flows */}
        {adjustedFlows.map((flow, index) => (
          <g key={`flow-${index}`}>
            {/* Main flow path */}
            <motion.path
              d={generateSankeyPath(
                sourceX,
                flow.sourceY,
                targetX,
                flow.adjustedTargetY,
                flow.height
              )}
              fill={`url(#flow-gradient-${index})`}
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{
                opacity: hoveredFlow === index ? 0.8 : 0.5,
                pathLength: 1
              }}
              transition={{
                opacity: { duration: 0.2 },
                pathLength: { duration: 1, delay: index * 0.1, ease: "easeInOut" }
              }}
              onMouseEnter={() => setHoveredFlow(index)}
              onMouseLeave={() => setHoveredFlow(null)}
              style={{ cursor: 'pointer' }}
            />

            {/* Hover tooltip */}
            {hoveredFlow === index && (
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <rect
                  x={(sourceX + targetX) / 2 - 45}
                  y={(flow.sourceY + flow.adjustedTargetY) / 2 - 22}
                  width="90"
                  height="44"
                  fill="white"
                  stroke="currentColor"
                  strokeWidth="1"
                  rx="6"
                  className="stroke-border"
                  filter="drop-shadow(0 2px 8px rgba(0,0,0,0.1))"
                />
                <text
                  x={(sourceX + targetX) / 2}
                  y={(flow.sourceY + flow.adjustedTargetY) / 2 - 6}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="700"
                  fill="currentColor"
                  className="text-foreground"
                >
                  {flow.contribution.toFixed(1)}%
                </text>
                <text
                  x={(sourceX + targetX) / 2}
                  y={(flow.sourceY + flow.adjustedTargetY) / 2 + 10}
                  textAnchor="middle"
                  fontSize="11"
                  fill="currentColor"
                  className="text-muted-foreground"
                >
                  r = {flow.correlation.toFixed(3)}
                </text>
              </motion.g>
            )}
          </g>
        ))}

        {/* Source labels (left side) */}
        {sources.map((source, index) => (
          <motion.g
            key={`source-${source.id}`}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
          >
            {/* Color indicator */}
            <circle
              cx={sourceX - 20}
              cy={source.y}
              r="4"
              fill={source.color}
            />
            {/* Label */}
            <text
              x={sourceX - 32}
              y={source.y + 4}
              textAnchor="end"
              fontSize="14"
              fontWeight="500"
              fill="currentColor"
              className="text-foreground"
            >
              {source.label}
            </text>
          </motion.g>
        ))}

        {/* Target label (right side) */}
        <motion.g
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
        >
          <text
            x={targetX + 32}
            y={targetY - 4}
            textAnchor="start"
            fontSize="14"
            fontWeight="500"
            fill="currentColor"
            className="text-foreground"
          >
            {selectedDisease.name}
          </text>
          <text
            x={targetX + 32}
            y={targetY + 12}
            textAnchor="start"
            fontSize="11"
            fill="currentColor"
            className="text-muted-foreground"
          >
            Disease Cases
          </text>
        </motion.g>
      </svg>

      {/* Info cards */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {sources.map((source) => (
          <div key={source.id} className="p-3 bg-muted/30 rounded-md border border-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground">{source.label}</span>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: source.color }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              {source.data.impact === 'positive' ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className="text-xs text-muted-foreground">
                {source.data.contribution.toFixed(1)}% impact
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClimateSankeyDiagram;
