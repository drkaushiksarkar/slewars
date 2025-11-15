import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * ClimateChart - Displays temperature and precipitation trends
 * @param {Array} data - Climate data array
 * @param {string} type - 'temperature' | 'precipitation' | 'humidity'
 */
const ClimateChart = ({ data, type = 'temperature' }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    let values, label, color, unit;

    switch (type) {
      case 'temperature':
        values = data.map(d => d.temperature_mean || d.avg_temperature);
        label = 'Temperature';
        color = '#f59e0b'; // amber
        unit = '°C';
        break;
      case 'precipitation':
        values = data.map(d => d.precipitation || d.total_precipitation);
        label = 'Precipitation';
        color = '#3b82f6'; // blue
        unit = 'mm';
        break;
      case 'humidity':
        values = data.map(d => d.humidity || d.avg_humidity);
        label = 'Humidity';
        color = '#10b981'; // green
        unit = '%';
        break;
      default:
        return null;
    }

    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue;

    return {
      values,
      label,
      color,
      unit,
      maxValue,
      minValue,
      range
    };
  }, [data, type]);

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No climate data available</p>
      </div>
    );
  }

  const { values, label, color, unit, maxValue, minValue, range } = chartData;
  const chartWidth = 600;
  const chartHeight = 200;
  const padding = 40;

  // Generate SVG path for line chart
  const points = values.map((value, index) => {
    const x = padding + (index / (values.length - 1)) * (chartWidth - 2 * padding);
    const y = chartHeight - padding - ((value - minValue) / range) * (chartHeight - 2 * padding);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  // Generate area path (for fill)
  const areaPath = `${pathD} L ${chartWidth - padding},${chartHeight - padding} L ${padding},${chartHeight - padding} Z`;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{label} Trend</h3>
        <p className="text-sm text-gray-500">
          Range: {minValue.toFixed(1)}{unit} - {maxValue.toFixed(1)}{unit}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-auto"
        style={{ maxHeight: '300px' }}
      >
        {/* Grid lines */}
        <g className="grid-lines" stroke="#e5e7eb" strokeWidth="1">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - padding - ratio * (chartHeight - 2 * padding);
            return (
              <line
                key={ratio}
                x1={padding}
                y1={y}
                x2={chartWidth - padding}
                y2={y}
                opacity="0.5"
              />
            );
          })}
        </g>

        {/* Area fill */}
        <motion.path
          d={areaPath}
          fill={color}
          opacity="0.1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          transition={{ duration: 0.5 }}
        />

        {/* Line */}
        <motion.path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        />

        {/* Data points */}
        {points.map((point, index) => {
          const [x, y] = point.split(',').map(Number);
          return (
            <motion.circle
              key={index}
              cx={x}
              cy={y}
              r="4"
              fill={color}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.02, duration: 0.3 }}
            >
              <title>{`${label}: ${values[index].toFixed(1)}${unit}`}</title>
            </motion.circle>
          );
        })}

        {/* Y-axis labels */}
        <g className="y-axis-labels" fill="#6b7280" fontSize="12">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - padding - ratio * (chartHeight - 2 * padding);
            const value = minValue + ratio * range;
            return (
              <text
                key={ratio}
                x={padding - 10}
                y={y}
                textAnchor="end"
                alignmentBaseline="middle"
              >
                {value.toFixed(0)}
              </text>
            );
          })}
        </g>

        {/* X-axis labels (show first, middle, and last dates) */}
        <g className="x-axis-labels" fill="#6b7280" fontSize="12">
          {[0, Math.floor(data.length / 2), data.length - 1].map((index) => {
            const x = padding + (index / (values.length - 1)) * (chartWidth - 2 * padding);
            const date = new Date(data[index].date || data[index].period);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return (
              <text
                key={index}
                x={x}
                y={chartHeight - padding + 20}
                textAnchor="middle"
              >
                {dateStr}
              </text>
            );
          })}
        </g>
      </svg>

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-gray-500">Average</p>
          <p className="text-lg font-semibold" style={{ color }}>
            {(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)}{unit}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Minimum</p>
          <p className="text-lg font-semibold text-blue-600">
            {minValue.toFixed(1)}{unit}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Maximum</p>
          <p className="text-lg font-semibold text-red-600">
            {maxValue.toFixed(1)}{unit}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClimateChart;
