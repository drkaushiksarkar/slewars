import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
  Area,
  ComposedChart
} from 'recharts';

/**
 * Time Series Anomaly Detection Visualization using Isolation Forest
 *
 * Shows disease case trends over time with ML-detected anomalies
 */
const AnomalyDetectionChart = ({ data }) => {
  if (!data || !data.time_series || data.time_series.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No data available for visualization</p>
      </div>
    );
  }

  const { time_series, thresholds, anomalies, summary } = data;

  // Group data by location for multi-line chart
  const chartData = useMemo(() => {
    // Get unique dates
    const dates = [...new Set(time_series.map(d => d.date))].sort();

    // For each date, create an object with all locations' cases
    return dates.map(date => {
      const dataPoint = { date };

      time_series
        .filter(d => d.date === date)
        .forEach(d => {
          dataPoint[d.location_name] = d.cases;
          // Mark if any location has anomaly on this date
          if (d.is_anomaly) {
            dataPoint[`${d.location_name}_anomaly`] = d.cases;
          }
        });

      return dataPoint;
    });
  }, [time_series]);

  // Get unique locations for lines
  const locations = useMemo(() => {
    return [...new Set(time_series.map(d => d.location_name))].slice(0, 5); // Show top 5 locations
  }, [time_series]);

  // Enhanced color palette for different locations (vibrant, modern colors)
  const colors = [
    '#6366f1', // Indigo
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f97316'  // Orange
  ];

  // Enhanced custom tooltip with anomaly info
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    // Find if this point is an anomaly
    const datePoint = time_series.find(ts => ts.date === label);
    const isAnomaly = datePoint?.is_anomaly;
    const anomalyScore = datePoint?.anomaly_score;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 rounded-xl shadow-2xl p-4"
      >
        <p className="text-sm font-bold text-gray-900 mb-2 pb-2 border-b border-gray-200">
          {new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        {payload.map((entry, index) => {
          if (entry.dataKey.includes('_anomaly')) return null;
          return (
            <div key={index} className="flex items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shadow-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-gray-600">{entry.name}:</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{Math.round(entry.value)}</span>
            </div>
          );
        })}
        {isAnomaly && (
          <div className="mt-3 pt-2 border-t border-red-200">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-bold text-red-600">ANOMALY DETECTED</span>
            </div>
            <div className="text-xs text-gray-600">
              Score: <span className="font-semibold text-red-600">{anomalyScore?.toFixed(3)}</span>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats - Enhanced */}
      <div className="grid grid-cols-3 gap-4">
        <div
          className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-3 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-xs text-red-700 font-semibold">Anomalies</div>
          </div>
          <div className="text-2xl font-bold text-red-700">
            {summary.total_anomalies}
          </div>
          <div className="text-xs text-red-600 mt-1">
            {(summary.anomaly_rate * 100).toFixed(1)}% of data
          </div>
        </div>
        <div
          className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-3 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <div className="text-xs text-blue-700 font-semibold">Locations</div>
          </div>
          <div className="text-2xl font-bold text-blue-700">
            {summary.locations_analyzed}
          </div>
          <div className="text-xs text-blue-600 mt-1">Districts</div>
        </div>
        <div
          className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-xl p-3 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            <div className="text-xs text-emerald-700 font-semibold">Total Cases</div>
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            {(summary.total_cases || 0) > 1000
              ? `${(summary.total_cases / 1000).toFixed(1)}k`
              : summary.total_cases?.toLocaleString() || 0}
          </div>
          <div className="text-xs text-emerald-600 mt-1">
            Avg: {Math.round(summary.avg_cases_per_period || 0)}/period
          </div>
        </div>
      </div>

      {/* Time Series Chart - Enhanced with gradient fills */}
      <div
        className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border-2 border-gray-200 shadow-lg"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
            <div className="text-sm font-bold text-gray-800">
              Disease Cases with ML Anomaly Detection
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            {summary.date_range?.start && new Date(summary.date_range.start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - {summary.date_range?.end && new Date(summary.date_range.end).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
            <defs>
              {locations.map((location, idx) => (
                <linearGradient key={`gradient-${location}`} id={`gradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[idx % colors.length]} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={colors[idx % colors.length]} stopOpacity={0.01}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              stroke="#9ca3af"
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
            <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} stroke="#9ca3af" />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              iconType="line"
            />

            {/* Reference lines for thresholds */}
            {thresholds.mean && (
              <ReferenceLine
                y={thresholds.mean}
                stroke="#6366f1"
                strokeDasharray="5 5"
                strokeWidth={2}
                opacity={0.6}
              />
            )}

            {/* Area and Line for each location */}
            {locations.map((location, idx) => (
              <React.Fragment key={location}>
                <Area
                  type="monotone"
                  dataKey={location}
                  fill={`url(#gradient-${idx})`}
                  stroke="none"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey={location}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={2.5}
                  dot={false}
                  name={location}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                  isAnimationActive={false}
                />
                {/* Anomaly markers - static and prominent */}
                <Scatter
                  dataKey={`${location}_anomaly`}
                  fill="#ef4444"
                  isAnimationActive={false}
                  shape={(props) => {
                    if (!props.payload[`${location}_anomaly`]) return null;
                    return (
                      <g>
                        {/* Outer ring for visibility */}
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={8}
                          fill="#ef4444"
                          opacity={0.2}
                        />
                        {/* Main marker */}
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={6}
                          fill="#fff"
                          stroke="#ef4444"
                          strokeWidth={3}
                        />
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={3}
                          fill="#ef4444"
                        />
                      </g>
                    );
                  }}
                />
              </React.Fragment>
            ))}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Enhanced Legend */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <div className="flex items-center gap-2 bg-indigo-50 px-2 py-1 rounded">
              <div className="w-8 h-0.5 bg-indigo-500" style={{ borderTop: '2px dashed #6366f1' }} />
              <span className="text-gray-700 font-medium">Mean: {thresholds.mean?.toFixed(0)}</span>
            </div>
            <div className="flex items-center gap-2 bg-red-50 px-2 py-1 rounded">
              <div className="relative flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="absolute w-3 h-3 rounded-full border-2 border-red-500 bg-transparent" />
              </div>
              <span className="text-gray-700 font-medium">Anomaly (ML-detected)</span>
            </div>
          </div>
          <div className="text-xs text-gray-500 font-medium">
            Model: {summary.model || 'Isolation Forest'}
          </div>
        </div>
      </div>

      {/* Grid Layout for Anomalies and Model Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Anomalies List - Enhanced */}
        {anomalies && anomalies.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-red-500 to-orange-500 rounded-full" />
                <div className="text-sm font-bold text-gray-800">
                  Top Anomalies Detected ({anomalies.length})
                </div>
              </div>
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                Ranked by severity
              </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {anomalies.slice(0, 10).map((anomaly, idx) => (
              <div
                key={idx}
                className={`relative overflow-hidden p-3 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                  anomaly.severity === 'High'
                    ? 'bg-gradient-to-r from-red-50 to-red-100 border-red-300 hover:border-red-400'
                    : anomaly.severity === 'Medium'
                    ? 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-300 hover:border-amber-400'
                    : 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300 hover:border-yellow-400'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-3 h-3 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <div className="text-xs font-bold text-gray-900 truncate">
                        {anomaly.location_name}
                      </div>
                      <div className="text-xs text-gray-600">
                        {new Date(anomaly.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-700">
                        <span className="font-bold text-gray-900">{Math.round(anomaly.cases)}</span> cases
                      </span>
                      {anomaly.anomaly_score && (
                        <span className="text-gray-600">
                          Score: <span className="font-semibold">{anomaly.anomaly_score.toFixed(3)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm ${
                    anomaly.severity === 'High'
                      ? 'bg-red-600 text-white'
                      : anomaly.severity === 'Medium'
                      ? 'bg-amber-600 text-white'
                      : 'bg-yellow-600 text-white'
                  }`}>
                    {anomaly.severity}
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        )}

        {/* Algorithm Info - Enhanced */}
        <div
        className="bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border-2 border-indigo-200 p-4 rounded-xl shadow-sm"
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm text-indigo-900 font-bold">
                Isolation Forest ML Model
              </p>
              <div className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Active
              </div>
            </div>
            <p className="text-xs text-indigo-800 leading-relaxed mb-2">
              Advanced machine learning algorithm that identifies anomalies by isolating outliers in multi-dimensional feature space.
              Analyzes temporal patterns, case volumes, and statistical trends to detect unusual disease activity.
            </p>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-indigo-700 font-medium">Anomaly Rate:</span>
                <span className="text-indigo-900 font-bold">{(summary.anomaly_rate * 100).toFixed(1)}%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-indigo-700 font-medium">Contamination:</span>
                <span className="text-indigo-900 font-bold">{summary.contamination ? (summary.contamination * 100).toFixed(0) : '10'}%</span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Add custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default AnomalyDetectionChart;
