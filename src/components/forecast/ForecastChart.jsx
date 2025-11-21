import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export default function ForecastChart({ forecast, height = 400 }) {
  const chartData = useMemo(() => {
    if (!forecast || !forecast.predictions) return null;

    // Get predictions
    const predictions = forecast.predictions;

    // Calculate chart dimensions
    const padding = { top: 40, right: 60, bottom: 60, left: 60 };
    const chartWidth = 800;
    const chartHeight = height - padding.top - padding.bottom;

    // Find min and max values for Y axis
    const allValues = predictions.flatMap(p => [
      p.predicted_cases,
      p.lower_bound,
      p.upper_bound
    ]);
    const minY = 0;
    const maxY = Math.max(...allValues) * 1.1; // Add 10% padding

    // Create scale functions
    const xScale = (index) => padding.left + (index * (chartWidth / (predictions.length - 1)));
    const yScale = (value) => padding.top + chartHeight - ((value - minY) / (maxY - minY)) * chartHeight;

    // Generate path data
    const predictedPath = predictions.map((p, i) => {
      const x = xScale(i);
      const y = yScale(p.predicted_cases);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');

    const upperBoundPath = predictions.map((p, i) => {
      const x = xScale(i);
      const y = yScale(p.upper_bound);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');

    const lowerBoundPath = predictions.map((p, i) => {
      const x = xScale(i);
      const y = yScale(p.lower_bound);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');

    // Create confidence interval area path
    const areaPath = [
      ...predictions.map((p, i) => {
        const x = xScale(i);
        const y = yScale(p.upper_bound);
        return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
      }),
      ...predictions.slice().reverse().map((p, i) => {
        const x = xScale(predictions.length - 1 - i);
        const y = yScale(p.lower_bound);
        return `L ${x} ${y}`;
      }),
      'Z'
    ].join(' ');

    // Generate Y axis ticks
    const yTicks = [];
    const tickCount = 5;
    for (let i = 0; i <= tickCount; i++) {
      const value = minY + (maxY - minY) * (i / tickCount);
      const y = yScale(value);
      yTicks.push({ value: Math.round(value), y });
    }

    return {
      predictions,
      predictedPath,
      upperBoundPath,
      lowerBoundPath,
      areaPath,
      xScale,
      yScale,
      yTicks,
      padding,
      chartWidth,
      chartHeight,
      minY,
      maxY
    };
  }, [forecast, height]);

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No forecast data available
      </div>
    );
  }

  const { predictions, predictedPath, areaPath, xScale, yScale, yTicks, padding, chartWidth, chartHeight } = chartData;

  return (
    <div className="w-full">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${height}`}
        className="overflow-visible"
      >
        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={tick.y}
              x2={padding.left + chartWidth}
              y2={tick.y}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 10}
              y={tick.y}
              textAnchor="end"
              dominantBaseline="middle"
              className="text-xs fill-gray-600"
            >
              {tick.value}
            </text>
          </g>
        ))}

        {/* Confidence interval area */}
        <motion.path
          d={areaPath}
          fill="url(#gradient)"
          opacity="0.3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 0.5 }}
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Predicted line */}
        <motion.path
          d={predictedPath}
          stroke="#3b82f6"
          strokeWidth="3"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />

        {/* Data points */}
        {predictions.map((p, i) => {
          const x = xScale(i);
          const y = yScale(p.predicted_cases);

          const riskColors = {
            LOW: '#10b981',
            MEDIUM: '#f59e0b',
            HIGH: '#ef4444'
          };

          return (
            <g key={i}>
              <motion.circle
                cx={x}
                cy={y}
                r="6"
                fill={riskColors[p.risk_level] || '#3b82f6'}
                stroke="white"
                strokeWidth="2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1, duration: 0.3 }}
              />

              {/* X-axis labels */}
              <text
                x={x}
                y={padding.top + chartHeight + 20}
                textAnchor="middle"
                className="text-xs fill-gray-600"
              >
                {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </text>

              {/* Risk level labels */}
              <text
                x={x}
                y={padding.top + chartHeight + 40}
                textAnchor="middle"
                className="text-xs font-semibold"
                fill={riskColors[p.risk_level] || '#3b82f6'}
              >
                {p.risk_level}
              </text>
            </g>
          );
        })}

        {/* Axis labels */}
        <text
          x={padding.left + chartWidth / 2}
          y={height - 5}
          textAnchor="middle"
          className="text-sm font-semibold fill-gray-700"
        >
          Forecast Date
        </text>

        <text
          x={15}
          y={padding.top + chartHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90, 15, ${padding.top + chartHeight / 2})`}
          className="text-sm font-semibold fill-gray-700"
        >
          Predicted Cases
        </text>

        {/* Legend */}
        <g transform={`translate(${chartWidth + padding.left - 150}, 20)`}>
          <rect x="0" y="0" width="12" height="12" fill="#3b82f6" />
          <text x="18" y="10" className="text-xs fill-gray-700">
            Predicted Cases
          </text>

          <rect x="0" y="20" width="12" height="12" fill="url(#gradient)" opacity="0.5" />
          <text x="18" y="30" className="text-xs fill-gray-700">
            95% Confidence Interval
          </text>
        </g>
      </svg>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mt-6">
        {predictions.map((p, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">
              {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="text-lg font-bold text-gray-900">
              {p.predicted_cases} cases
            </div>
            <div className="text-xs text-gray-500">
              Range: {p.lower_bound} - {p.upper_bound}
            </div>
            <div className={`text-xs font-semibold mt-1 ${
              p.risk_level === 'HIGH' ? 'text-red-600' :
              p.risk_level === 'MEDIUM' ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              Risk: {p.risk_level}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
