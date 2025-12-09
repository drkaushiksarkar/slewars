import React from 'react';
import { motion } from 'framer-motion';

/**
 * TimeSeriesChart - Line chart showing trends over time
 * Using SVG for a lightweight implementation
 *
 * @param {Object} props
 * @param {Array} props.data - Array of trend data objects with { week, disease, cases }
 * @param {number} props.height - Chart height in pixels
 * @param {boolean} props.showTitle - Whether to show the title
 */
const TimeSeriesChart = ({ data = [], height = 300, showTitle = true }) => {
  if (!data || data.length === 0) {
    return (
      <div className={showTitle ? "bg-card rounded-lg border p-6" : ""}>
        {showTitle && <h3 className="text-lg font-semibold mb-4">Disease Trends</h3>}
        <div
          className="flex items-center justify-center text-muted-foreground"
          style={{ height: `${height}px` }}
        >
          No trend data available
        </div>
      </div>
    );
  }

  // Get unique weeks (x-axis)
  const weeks = [...new Set(data.map((d) => d.week))].sort();

  // Get unique diseases
  const diseases = [...new Set(data.map((d) => d.disease))];

  // Color palette - match against disease names (case-insensitive)
  const getColorForDisease = (disease) => {
    const diseaseLower = disease.toLowerCase();
    if (diseaseLower.includes('malaria')) return '#3b82f6'; // blue
    if (diseaseLower.includes('measles')) return '#a855f7'; // purple
    if (diseaseLower.includes('typhoid')) return '#ec4899'; // pink
    if (diseaseLower.includes('yellow')) return '#f59e0b'; // amber
    if (diseaseLower.includes('cholera')) return '#ef4444'; // red
    if (diseaseLower.includes('lassa')) return '#10b981'; // green
    return '#6b7280'; // default grey
  };

  // Calculate chart dimensions - remove right padding, add bottom for legend
  const padding = { top: 20, right: 20, bottom: 100, left: 60 };
  const chartWidth = 700;
  const legendHeight = Math.ceil(diseases.length / 2) * 30; // 2 columns
  const chartHeight = height + legendHeight;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Find max cases for scaling
  const maxCases = Math.max(...data.map((d) => d.cases || 0), 1);

  // Scale functions
  const xScale = (index) => (index / (weeks.length - 1)) * innerWidth;
  const yScale = (value) => innerHeight - (value / maxCases) * innerHeight;

  // Generate path for each disease
  const generatePath = (disease) => {
    const diseaseData = data.filter((d) => d.disease === disease).sort((a, b) => a.week.localeCompare(b.week));

    if (diseaseData.length === 0) return '';

    return diseaseData
      .map((point, index) => {
        const x = xScale(weeks.indexOf(point.week));
        const y = yScale(point.cases);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  return (
    <div className={showTitle ? "bg-card rounded-lg border p-6" : ""}>
      {showTitle && <h3 className="text-lg font-semibold mb-4">Disease Trends</h3>}

      <div className="w-full flex justify-center">
        <svg width={chartWidth} height={chartHeight}>
          {/* Y-axis grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={padding.top + innerHeight * (1 - tick)}
                x2={padding.left + innerWidth}
                y2={padding.top + innerHeight * (1 - tick)}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray="4"
              />
              <text
                x={padding.left - 10}
                y={padding.top + innerHeight * (1 - tick) + 5}
                textAnchor="end"
                fontSize="12"
                fill="#6b7280"
              >
                {Math.round(maxCases * tick).toLocaleString()}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {weeks.map((week, index) => {
            if (index % 2 === 0) {
              // Show every other week to avoid crowding
              return (
                <text
                  key={week}
                  x={padding.left + xScale(index)}
                  y={padding.top + innerHeight + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#6b7280"
                >
                  {new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </text>
              );
            }
            return null;
          })}

          {/* Plot lines for each disease */}
          {diseases.map((disease, idx) => {
            const path = generatePath(disease);
            const color = getColorForDisease(disease);

            return (
              <motion.g
                key={disease}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
              >
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  transform={`translate(${padding.left}, ${padding.top})`}
                />
                {/* Data points */}
                {data
                  .filter((d) => d.disease === disease)
                  .sort((a, b) => a.week.localeCompare(b.week))
                  .map((point) => {
                    const x = xScale(weeks.indexOf(point.week));
                    const y = yScale(point.cases);
                    return (
                      <circle
                        key={`${disease}-${point.week}`}
                        cx={padding.left + x}
                        cy={padding.top + y}
                        r="4"
                        fill={color}
                      >
                        <title>
                          {disease}: {point.cases} cases on {point.week}
                        </title>
                      </circle>
                    );
                  })}
              </motion.g>
            );
          })}

          {/* Legend - Below chart in 2 columns */}
          {diseases.map((disease, idx) => {
            const color = getColorForDisease(disease);
            const column = idx % 2; // 0 for left, 1 for right
            const row = Math.floor(idx / 2);
            const xPos = padding.left + (column * (innerWidth / 2));
            const yPos = padding.top + innerHeight + 50 + (row * 25);

            return (
              <g key={`legend-${disease}`}>
                <line
                  x1={xPos}
                  y1={yPos}
                  x2={xPos + 30}
                  y2={yPos}
                  stroke={color}
                  strokeWidth="2"
                />
                <text
                  x={xPos + 35}
                  y={yPos + 5}
                  fontSize="11"
                  fill="#374151"
                >
                  {disease}
                </text>
              </g>
            );
          })}

          {/* Axis labels */}
          <text
            x={padding.left + innerWidth / 2}
            y={padding.top + innerHeight + 40}
            textAnchor="middle"
            fontSize="13"
            fill="#374151"
            fontWeight="500"
          >
            Date
          </text>
          <text
            x={20}
            y={padding.top + innerHeight / 2}
            textAnchor="middle"
            fontSize="13"
            fill="#374151"
            fontWeight="500"
            transform={`rotate(-90, 20, ${padding.top + innerHeight / 2})`}
          >
            Cases
          </text>
        </svg>
      </div>
    </div>
  );
};

export default TimeSeriesChart;
