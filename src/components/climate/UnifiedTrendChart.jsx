import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * UnifiedTrendChart - Single chart with toggleable metrics (Rain, Temp, Humidity)
 * @param {Array} data - Climate data array
 */
const UnifiedTrendChart = ({ data }) => {
  const [activeMetrics, setActiveMetrics] = useState({
    rain: true,
    temp: true,
    humidity: true
  });

  const dateRange = useMemo(() => {
    if (!data || data.length === 0) return '';

    try {
      const firstDate = new Date(data[0].date || data[0].period);
      const lastDate = new Date(data[data.length - 1].date || data[data.length - 1].period);

      if (isNaN(firstDate.getTime()) || isNaN(lastDate.getTime())) {
        return '';
      }

      return `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } catch (error) {
      console.error('Error formatting date range:', error);
      return '';
    }
  }, [data]);

  const chartConfig = useMemo(() => {
    if (!data || data.length === 0) {
      console.log('UnifiedTrendChart: No data available');
      return null;
    }

    console.log('UnifiedTrendChart: Processing data', { dataLength: data.length, sample: data[0] });

    const metrics = [];

    if (activeMetrics.temp) {
      const values = data.map(d => {
        const val = d.temperature_mean || d.avg_temperature || 0;
        return typeof val === 'string' ? parseFloat(val) : val;
      });
      console.log('Temperature values:', { count: values.length, sample: values.slice(0, 3) });
      metrics.push({
        key: 'temp',
        values,
        label: 'Temperature',
        color: '#fda4af', // Soft rose (matches rose-100)
        unit: '°C'
      });
    }

    if (activeMetrics.rain) {
      const values = data.map(d => {
        const val = d.precipitation || d.total_precipitation || 0;
        return typeof val === 'string' ? parseFloat(val) : val;
      });
      console.log('Rainfall values:', { count: values.length, sample: values.slice(0, 3) });
      metrics.push({
        key: 'rain',
        values,
        label: 'Rainfall',
        color: '#93c5fd', // Soft blue (matches blue-100)
        unit: 'mm'
      });
    }

    if (activeMetrics.humidity) {
      const values = data.map(d => {
        const val = d.humidity || d.avg_humidity || 0;
        return typeof val === 'string' ? parseFloat(val) : val;
      });
      console.log('Humidity values:', { count: values.length, sample: values.slice(0, 3) });
      metrics.push({
        key: 'humidity',
        values,
        label: 'Humidity',
        color: '#fde047', // Soft yellow (matches yellow-100)
        unit: '%'
      });
    }

    console.log('ChartConfig created:', { metricCount: metrics.length });
    return metrics;
  }, [data, activeMetrics]);

  const toggleMetric = (metric) => {
    setActiveMetrics(prev => ({
      ...prev,
      [metric]: !prev[metric]
    }));
  };

  if (!data || data.length === 0) {
    console.log('UnifiedTrendChart: Rendering - No data');
    return (
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No climate data available</p>
        </div>
      </div>
    );
  }

  if (!chartConfig || chartConfig.length === 0) {
    console.log('UnifiedTrendChart: Rendering - No chart config');
    return (
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Select at least one metric to display</p>
        </div>
      </div>
    );
  }

  console.log('UnifiedTrendChart: Rendering chart', { dataLength: data.length, metricsCount: chartConfig.length });

  const chartWidth = 1000;
  const chartHeight = 300;
  const padding = { top: 40, right: 60, bottom: 60, left: 60 };

  // Generate paths for each active metric
  const generatePath = (values) => {
    try {
      // Filter out invalid values
      const validValues = values.filter(v => v != null && !isNaN(v) && isFinite(v));

      if (validValues.length === 0) {
        return null;
      }

      const maxValue = Math.max(...validValues);
      const minValue = Math.min(...validValues);
      const range = maxValue - minValue || 1;

      const points = values.map((value, index) => {
        if (value == null || isNaN(value) || !isFinite(value)) {
          // Use average for invalid points
          value = (maxValue + minValue) / 2;
        }
        const x = padding.left + (index / Math.max(1, values.length - 1)) * (chartWidth - padding.left - padding.right);
        const y = chartHeight - padding.bottom - ((value - minValue) / range) * (chartHeight - padding.top - padding.bottom);
        return `${x},${y}`;
      });

      return {
        path: `M ${points.join(' L ')}`,
        points: points.map(p => p.split(',').map(Number)),
        maxValue,
        minValue,
        range
      };
    } catch (error) {
      console.error('Error generating chart path:', error);
      return null;
    }
  };

  return (
    <div className="bg-card rounded-lg border p-6">
      {/* Header with toggle buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Historical Weather Trend</h3>
          {dateRange && (
            <p className="text-sm text-muted-foreground mt-1">{dateRange}</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => toggleMetric('temp')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeMetrics.temp
                ? 'bg-rose-200 text-rose-900'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Temp
          </button>
          <button
            onClick={() => toggleMetric('rain')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeMetrics.rain
                ? 'bg-blue-200 text-blue-900'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Rain
          </button>
          <button
            onClick={() => toggleMetric('humidity')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeMetrics.humidity
                ? 'bg-yellow-200 text-yellow-900'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Humidity
          </button>
        </div>
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-auto"
        style={{ minHeight: '300px' }}
      >
        {/* Grid lines */}
        <g className="grid-lines" stroke="#e5e7eb" strokeWidth="1">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - padding.bottom - ratio * (chartHeight - padding.top - padding.bottom);
            return (
              <line
                key={ratio}
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                opacity="0.2"
                strokeDasharray="4 4"
              />
            );
          })}
        </g>

        {/* X-axis */}
        <line
          x1={padding.left}
          y1={chartHeight - padding.bottom}
          x2={chartWidth - padding.right}
          y2={chartHeight - padding.bottom}
          stroke="#d1d5db"
          strokeWidth="1"
        />

        {/* Render each metric */}
        {chartConfig.map((metric, metricIndex) => {
          const pathData = generatePath(metric.values);

          if (!pathData) {
            return null;
          }

          const { path, points } = pathData;

          return (
            <g key={metric.key}>
              {/* Area fill with gradient */}
              <defs>
                <linearGradient id={`gradient-${metric.key}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={metric.color} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={metric.color} stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Area fill */}
              <motion.path
                d={`${path} L ${chartWidth - padding.right},${chartHeight - padding.bottom} L ${padding.left},${chartHeight - padding.bottom} Z`}
                fill={`url(#gradient-${metric.key})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: metricIndex * 0.2 }}
              />

              {/* Line */}
              <motion.path
                d={path}
                fill="none"
                stroke={metric.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: 'easeInOut', delay: metricIndex * 0.2 }}
              />

              {/* Data points */}
              {points.map((point, index) => (
                <motion.circle
                  key={`${metric.key}-${index}`}
                  cx={point[0]}
                  cy={point[1]}
                  r="3"
                  fill="white"
                  stroke={metric.color}
                  strokeWidth="2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: metricIndex * 0.2 + index * 0.01, duration: 0.3 }}
                >
                  <title>{`${metric.label}: ${metric.values[index].toFixed(1)}${metric.unit}`}</title>
                </motion.circle>
              ))}
            </g>
          );
        })}

        {/* X-axis labels */}
        <g className="x-axis-labels" fill="#6b7280" fontSize="14">
          {[0, Math.floor(data.length * 0.25), Math.floor(data.length * 0.5), Math.floor(data.length * 0.75), data.length - 1].map((index) => {
            if (index >= data.length) return null;
            try {
              const x = padding.left + (index / Math.max(1, data.length - 1)) * (chartWidth - padding.left - padding.right);
              const date = new Date(data[index].date || data[index].period);

              if (isNaN(date.getTime())) {
                return null;
              }

              const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <text
                  key={index}
                  x={x}
                  y={chartHeight - padding.bottom + 25}
                  textAnchor="middle"
                  fontWeight="500"
                >
                  {dateStr}
                </text>
              );
            } catch (error) {
              console.error('Error rendering x-axis label:', error);
              return null;
            }
          })}
        </g>
      </svg>
    </div>
  );
};

export default UnifiedTrendChart;
