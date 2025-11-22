import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * UnifiedTrendChart - Single chart with toggleable metrics (Rain, Temp, Humidity, Disease)
 * @param {Array} data - Climate data array
 * @param {Array} diseaseData - Disease timeseries data
 * @param {Object} selectedDisease - Selected disease object
 * @param {boolean} loadingDiseaseData - Loading state for disease data
 */
const UnifiedTrendChart = ({ data, diseaseData = [], selectedDisease = null, loadingDiseaseData = false }) => {
  const [activeMetrics, setActiveMetrics] = useState({
    rain: true,
    temp: true,
    humidity: true,
    disease: true
  });
  const [climateLagEnabled, setClimateLagEnabled] = useState(false);
  const [lagWeeks, setLagWeeks] = useState(2); // Default 2 weeks lag (positive = disease after climate, negative = disease before climate)

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

  // Merge climate data with disease data by aligning dates
  const mergedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Create a map of disease cases by date
    const diseaseCasesMap = {};
    if (diseaseData && diseaseData.length > 0) {
      diseaseData.forEach(item => {
        const date = new Date(item.startDate).toISOString().split('T')[0];
        diseaseCasesMap[date] = item.cases || 0;
      });
    }

    // Calculate lag offset in days (assuming weekly data, lag is in weeks)
    // Positive lag: disease cases occur AFTER climate conditions
    // Negative lag: disease cases occur BEFORE climate conditions
    const lagDays = climateLagEnabled ? lagWeeks * 7 : 0;

    // Merge with climate data, applying lag if enabled
    const merged = data.map((climateItem, index) => {
      const date = new Date(climateItem.date || climateItem.period).toISOString().split('T')[0];

      // If lag is enabled, shift disease data relative to climate data
      let diseaseCases = diseaseCasesMap[date] || 0;
      if (climateLagEnabled && lagDays !== 0) {
        // Find disease cases that occur lagDays after/before this climate data point
        const laggedDate = new Date(climateItem.date || climateItem.period);
        laggedDate.setDate(laggedDate.getDate() + lagDays);
        const laggedDateStr = laggedDate.toISOString().split('T')[0];
        diseaseCases = diseaseCasesMap[laggedDateStr] || 0;
      }

      return {
        ...climateItem,
        diseaseCases
      };
    });

    return merged;
  }, [data, diseaseData, climateLagEnabled, lagWeeks]);

  const chartConfig = useMemo(() => {
    if (!mergedData || mergedData.length === 0) {
      console.log('UnifiedTrendChart: No data available');
      return null;
    }

    console.log('UnifiedTrendChart: Processing data', { dataLength: mergedData.length, sample: mergedData[0] });

    const metrics = [];

    if (activeMetrics.temp) {
      const values = mergedData.map(d => {
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
      const values = mergedData.map(d => {
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
      const values = mergedData.map(d => {
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

    if (activeMetrics.disease && selectedDisease) {
      const values = mergedData.map(d => d.diseaseCases || 0);
      console.log('Disease values:', { count: values.length, sample: values.slice(0, 3) });
      metrics.push({
        key: 'disease',
        values,
        label: `${selectedDisease.name} Cases`,
        color: '#c084fc', // Soft purple (matches purple-400)
        unit: ' cases'
      });
    }

    console.log('ChartConfig created:', { metricCount: metrics.length });
    return metrics;
  }, [mergedData, activeMetrics, selectedDisease]);

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

  // Generate smooth curved paths for each active metric using cardinal splines
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
        return { x, y };
      });

      // Generate smooth curve using cardinal spline
      const tension = 0.3; // Controls smoothness (0 = straight lines, 1 = very smooth)
      let path = `M ${points[0].x},${points[0].y}`;

      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];

        // Calculate control points for cubic bezier
        const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
        const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;
        const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
        const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;

        path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
      }

      return {
        path,
        points: points.map(p => [p.x, p.y]),
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
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {selectedDisease && activeMetrics.disease
                ? 'Weather & Disease Trends'
                : 'Historical Weather Trend'}
            </h3>
            {dateRange && (
              <p className="text-sm text-muted-foreground mt-1">{dateRange}</p>
            )}
          </div>

          {/* Metric Toggle Buttons */}
          <div className="flex gap-2 flex-wrap">
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
          {selectedDisease && (
            <button
              onClick={() => toggleMetric('disease')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeMetrics.disease
                  ? 'bg-purple-200 text-purple-900'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              disabled={loadingDiseaseData}
            >
              {loadingDiseaseData ? 'Loading...' : 'Disease'}
            </button>
          )}
          </div>
        </div>

        {/* Climate Lag Model Controls */}
        {selectedDisease && activeMetrics.disease && diseaseData.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-muted/30 rounded-lg border border-muted">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setClimateLagEnabled(!climateLagEnabled)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  climateLagEnabled
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {climateLagEnabled ? 'Lag Model: ON' : 'Lag Model: OFF'}
              </button>
            </div>

            {climateLagEnabled && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Lag Period:
                </label>
                <select
                  value={lagWeeks}
                  onChange={(e) => setLagWeeks(Number(e.target.value))}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                >
                  <optgroup label="Disease leads Climate (Backward)">
                    <option value={-4}>-4 weeks</option>
                    <option value={-3}>-3 weeks</option>
                    <option value={-2}>-2 weeks</option>
                    <option value={-1}>-1 week</option>
                  </optgroup>
                  <optgroup label="Climate leads Disease (Forward)">
                    <option value={1}>+1 week</option>
                    <option value={2}>+2 weeks</option>
                    <option value={3}>+3 weeks</option>
                    <option value={4}>+4 weeks</option>
                    <option value={5}>+5 weeks</option>
                    <option value={6}>+6 weeks</option>
                  </optgroup>
                </select>
                <span className="text-xs text-muted-foreground italic">
                  {lagWeeks > 0
                    ? `(Disease cases appear ${lagWeeks} week${lagWeeks > 1 ? 's' : ''} AFTER climate conditions)`
                    : `(Disease cases appear ${Math.abs(lagWeeks)} week${Math.abs(lagWeeks) > 1 ? 's' : ''} BEFORE climate conditions)`
                  }
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-auto"
        style={{ minHeight: '300px' }}
      >
        {/* Lag Model Indicator */}
        {climateLagEnabled && selectedDisease && (
          <g>
            <rect
              x={chartWidth - padding.right - 200}
              y={padding.top - 30}
              width={190}
              height={25}
              fill={lagWeeks > 0 ? "#10b981" : "#3b82f6"}
              opacity="0.9"
              rx="4"
            />
            <text
              x={chartWidth - padding.right - 105}
              y={padding.top - 12}
              textAnchor="middle"
              fill="white"
              fontSize="12"
              fontWeight="600"
            >
              Lag: {lagWeeks > 0 ? `+${lagWeeks}` : lagWeeks}w {lagWeeks > 0 ? '(Forward)' : '(Backward)'}
            </text>
          </g>
        )}

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
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: 'easeInOut', delay: metricIndex * 0.2 }}
              />
            </g>
          );
        })}

        {/* X-axis labels */}
        <g className="x-axis-labels" fill="#6b7280" fontSize="14">
          {[0, Math.floor(mergedData.length * 0.25), Math.floor(mergedData.length * 0.5), Math.floor(mergedData.length * 0.75), mergedData.length - 1].map((index) => {
            if (index >= mergedData.length) return null;
            try {
              const x = padding.left + (index / Math.max(1, mergedData.length - 1)) * (chartWidth - padding.left - padding.right);
              const date = new Date(mergedData[index].date || mergedData[index].period);

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
