import React from 'react';
import { motion } from 'framer-motion';

/**
 * DiseaseBarChart - Horizontal bar chart showing disease breakdown
 * Using pure CSS for bars (no external charting library needed)
 *
 * @param {Object} props
 * @param {Array} props.data - Array of disease data objects with { disease, totalCases, facilitiesAffected }
 * @param {boolean} props.showFacilities - Whether to show facility count
 */
const DiseaseBarChart = ({ data = [], showFacilities = false }) => {
  // Calculate total cases across all diseases
  const totalCases = data.reduce((sum, d) => sum + (d.totalCases || 0), 0);

  // Color palette for bars
  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-amber-500',
    'bg-green-500',
    'bg-red-500',
    'bg-indigo-500',
  ];

  if (!data || data.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Disease Breakdown</h3>
        <p className="text-muted-foreground text-center py-8">No disease data available</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-6">Disease Breakdown</h3>
      <div className="space-y-4">
        {data.map((item, index) => {
          // Percentage of total cases
          const percentage = totalCases > 0 ? (item.totalCases / totalCases) * 100 : 0;
          const barColor = colors[index % colors.length];

          return (
            <motion.div
              key={item.disease}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.disease}</span>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {item.totalCases?.toLocaleString() || 0} cases
                  </span>
                  {showFacilities && (
                    <span className="text-xs">
                      ({item.facilitiesAffected || 0} facilities)
                    </span>
                  )}
                </div>
              </div>
              <div className="relative h-8 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 + 0.2 }}
                  className={`h-full ${barColor} rounded-full flex items-center justify-end pr-3`}
                >
                  {percentage > 15 && (
                    <span className="text-xs font-medium text-white">
                      {percentage.toFixed(1)}%
                    </span>
                  )}
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t text-xs text-muted-foreground">
        <p>Total diseases tracked: {data.length}</p>
        <p>
          Total cases:{' '}
          {totalCases.toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default DiseaseBarChart;
