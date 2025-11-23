import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * ClimateSankeyDiagram - Multi-level Sankey showing climate impact on diseases
 * Hierarchy: Climate Variables → Disease Categories → Individual Diseases
 * @param {Array} climateData - Climate data array
 * @param {Array} diseaseData - Disease timeseries data (all diseases)
 * @param {Object} selectedDisease - Currently selected disease
 * @param {Object} diseasesByCategory - All diseases grouped by category
 */
const ClimateSankeyDiagram = ({
  climateData = [],
  diseaseData = [],
  diseasesByCategory = {}
}) => {
  const [hoveredFlow, setHoveredFlow] = useState(null);
  const [selectedPaths, setSelectedPaths] = useState(new Set()); // Changed to Set for multiple paths

  // Define category colors with natural, muted palette
  const categoryColors = {
    'Vector-Borne': { main: 'rgb(244, 114, 182)', light: 'rgba(244, 114, 182, 0.15)' }, // pink
    'Water-Borne & Diarrheal': { main: 'rgb(96, 165, 250)', light: 'rgba(96, 165, 250, 0.15)' }, // blue
    'Air-Borne & Respiratory': { main: 'rgb(167, 139, 250)', light: 'rgba(167, 139, 250, 0.15)' }, // purple
    'Neglected Tropical Diseases': { main: 'rgb(251, 146, 60)', light: 'rgba(251, 146, 60, 0.15)' }, // orange
    'Vaccine-Preventable': { main: 'rgb(74, 222, 128)', light: 'rgba(74, 222, 128, 0.15)' }, // green
    'Other Infections & NCDs': { main: 'rgb(148, 163, 184)', light: 'rgba(148, 163, 184, 0.15)' }, // gray
    'Viral Hemorrhagic': { main: 'rgb(248, 113, 113)', light: 'rgba(248, 113, 113, 0.15)' } // red
  };

  // Calculate correlations and flows
  const { climateNodes, categoryNodes, diseaseNodes, climateToCategoryFlows, categoryToDiseaseFlows } = useMemo(() => {
    if (!climateData || climateData.length === 0 || !diseasesByCategory || Object.keys(diseasesByCategory).length === 0) {
      return { climateNodes: [], categoryNodes: [], diseaseNodes: [], climateToCategoryFlows: [], categoryToDiseaseFlows: [] };
    }

    // Prepare climate variables
    const climateVars = climateData.map(item => ({
      date: new Date(item.date || item.period).toISOString().split('T')[0],
      temp: parseFloat(item.temperature_mean || item.avg_temperature || 0),
      precip: parseFloat(item.precipitation || item.total_precipitation || 0),
      humidity: parseFloat(item.humidity || item.avg_humidity || 0)
    })).filter(d => d.temp && d.date);

    if (climateVars.length < 3) {
      return { climateNodes: [], categoryNodes: [], diseaseNodes: [], climateToCategoryFlows: [], categoryToDiseaseFlows: [] };
    }

    // Pearson correlation coefficient
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

    // Extract climate variable arrays
    const temps = climateVars.map(d => d.temp);
    const precips = climateVars.map(d => d.precip);
    const humidities = climateVars.map(d => d.humidity);

    // Calculate category-level correlations
    const categoriesData = {};
    let totalCategoryCases = 0;

    Object.entries(diseasesByCategory).forEach(([category, diseases]) => {
      // Aggregate all diseases in this category
      const categoryCases = {};

      diseases.forEach(disease => {
        const diseaseCaseData = diseaseData.filter(d => d.disease === disease.name);
        diseaseCaseData.forEach(item => {
          const date = new Date(item.startDate).toISOString().split('T')[0];
          categoryCases[date] = (categoryCases[date] || 0) + (item.cases || 0);
        });
      });

      // Merge with climate data
      const mergedData = climateVars.map(climateItem => ({
        ...climateItem,
        cases: categoryCases[climateItem.date] || 0
      }));

      const cases = mergedData.map(d => d.cases);
      const categoryTotal = cases.reduce((sum, c) => sum + c, 0);
      totalCategoryCases += categoryTotal;

      if (categoryTotal > 0) {
        // Calculate correlations with lag
        const lagOffset = Math.min(2, Math.floor(temps.length / 4));
        const tempCorr = calculateCorrelation(temps.slice(0, -lagOffset), cases.slice(lagOffset));
        const precipCorr = calculateCorrelation(precips.slice(0, -lagOffset), cases.slice(lagOffset));
        const humidityCorr = calculateCorrelation(humidities.slice(0, -lagOffset), cases.slice(lagOffset));

        categoriesData[category] = {
          totalCases: categoryTotal,
          correlations: {
            temperature: tempCorr,
            rainfall: precipCorr,
            humidity: humidityCorr
          },
          diseases: diseases.map(disease => {
            const diseaseCaseData = diseaseData.filter(d => d.disease === disease.name);
            const totalDiseaseCases = diseaseCaseData.reduce((sum, d) => sum + (d.cases || 0), 0);
            return {
              ...disease,
              totalCases: totalDiseaseCases
            };
          }).filter(d => d.totalCases > 0).sort((a, b) => b.totalCases - a.totalCases).slice(0, 5) // Top 5 diseases per category
        };
      }
    });

    // Filter out categories with no cases
    const activeCategories = Object.entries(categoriesData).filter(([_, data]) => data.totalCases > 0);

    // Define climate nodes (left side)
    const climateNodesData = [
      { id: 'temp', label: 'Temperature', y: 80, color: 'rgb(251, 113, 133)', variable: 'temperature' },
      { id: 'rain', label: 'Rainfall', y: 250, color: 'rgb(96, 165, 250)', variable: 'rainfall' },
      { id: 'humidity', label: 'Humidity', y: 420, color: 'rgb(250, 204, 21)', variable: 'humidity' }
    ];

    // Calculate vertical spacing for categories (middle)
    const categoryCount = activeCategories.length;
    const categorySpacing = 500 / Math.max(categoryCount, 1);
    const categoryNodesData = activeCategories.map(([category, data], index) => {
      const yPos = 50 + index * categorySpacing + categorySpacing / 2;
      return {
        id: category,
        label: category,
        y: yPos,
        color: categoryColors[category]?.main || 'rgb(107, 114, 128)',
        totalCases: data.totalCases,
        correlations: data.correlations,
        diseases: data.diseases
      };
    });

    // Create disease nodes (right side) - top diseases from each category
    // Use a Set to track unique diseases and prevent duplicates
    const diseaseNodesData = [];
    const seenDiseaseIds = new Set();
    const diseaseToCategory = {}; // Map disease ID to its primary category

    // First pass: identify all unique diseases and their primary category (first occurrence)
    categoryNodesData.forEach((category) => {
      category.diseases.forEach((disease) => {
        if (!seenDiseaseIds.has(disease.id)) {
          seenDiseaseIds.add(disease.id);
          diseaseToCategory[disease.id] = category.id;
        }
      });
    });

    // Second pass: create disease nodes only for unique diseases
    const totalDiseases = seenDiseaseIds.size;
    const availableHeight = 480; // Total vertical space for diseases
    const diseaseSpacing = availableHeight / Math.max(totalDiseases, 1);
    let diseaseYOffset = 60;

    categoryNodesData.forEach((category, catIndex) => {
      // Add some spacing between category groups
      if (catIndex > 0) {
        diseaseYOffset += diseaseSpacing * 0.3; // Small gap between categories
      }

      category.diseases.forEach((disease) => {
        // Only add disease node if this category is its primary category
        if (diseaseToCategory[disease.id] === category.id) {
          diseaseNodesData.push({
            id: disease.id,
            label: disease.name,
            y: diseaseYOffset,
            category: category.id,
            color: category.color,
            totalCases: disease.totalCases
          });
          diseaseYOffset += diseaseSpacing;
        }
      });
    });

    // Create flows from climate to categories
    const climateToCategoryFlowsData = [];
    climateNodesData.forEach(climateNode => {
      categoryNodesData.forEach(categoryNode => {
        const correlation = categoryNode.correlations[climateNode.variable];
        const absCorrelation = Math.abs(correlation);
        const contribution = absCorrelation * categoryNode.totalCases;

        if (contribution > 0) {
          climateToCategoryFlowsData.push({
            id: `${climateNode.id}-${categoryNode.id}`,
            source: climateNode.id,
            target: categoryNode.id,
            sourceY: climateNode.y,
            targetY: categoryNode.y,
            value: contribution,
            correlation: correlation,
            sourceColor: climateNode.color,
            targetColor: categoryNode.color,
            isPositive: correlation > 0
          });
        }
      });
    });

    // Normalize flow heights for climate to category
    const maxClimateFlow = Math.max(...climateToCategoryFlowsData.map(f => f.value), 1);
    climateToCategoryFlowsData.forEach(flow => {
      flow.height = Math.max(8, (flow.value / maxClimateFlow) * 60);
    });

    // Create flows from categories to diseases - only to primary category
    const categoryToDiseaseFlowsData = [];
    categoryNodesData.forEach(categoryNode => {
      const categoryTotal = categoryNode.totalCases;
      categoryNode.diseases.forEach(disease => {
        // Only create flow if this category is the disease's primary category
        if (diseaseToCategory[disease.id] === categoryNode.id) {
          const proportion = disease.totalCases / categoryTotal;
          categoryToDiseaseFlowsData.push({
            id: `${categoryNode.id}-${disease.id}`,
            source: categoryNode.id,
            target: disease.id,
            sourceY: categoryNode.y,
            targetY: diseaseNodesData.find(d => d.id === disease.id)?.y || 0,
            value: disease.totalCases,
            proportion: proportion,
            sourceColor: categoryNode.color,
            targetColor: categoryNode.color
          });
        }
      });
    });

    // Normalize category-to-disease flow heights to prevent overlap
    // Use the disease spacing as a constraint for maximum flow height
    const maxCategoryFlow = Math.max(...categoryToDiseaseFlowsData.map(f => f.value), 1);
    const maxAllowedHeight = diseaseSpacing * 0.75; // Max 75% of spacing between diseases
    categoryToDiseaseFlowsData.forEach(flow => {
      // Normalize based on value with higher base multiplier for visibility
      // Use square root scaling to make smaller values more visible
      const normalizedValue = Math.sqrt(flow.value / maxCategoryFlow);
      const normalizedHeight = normalizedValue * maxAllowedHeight;
      flow.height = Math.max(8, Math.min(normalizedHeight, maxAllowedHeight));
    });

    return {
      climateNodes: climateNodesData,
      categoryNodes: categoryNodesData,
      diseaseNodes: diseaseNodesData,
      climateToCategoryFlows: climateToCategoryFlowsData,
      categoryToDiseaseFlows: categoryToDiseaseFlowsData
    };
  }, [climateData, diseaseData, diseasesByCategory]);

  // Handle path click for highlighting/muting
  const handlePathClick = (pathId) => {
    if (selectedPaths.has(pathId)) {
      setSelectedPaths(new Set()); // Deselect all
    } else {
      setSelectedPaths(new Set([pathId])); // Select single path
    }
  };

  // Handle disease node click - highlight all flows connected to this disease
  const handleDiseaseClick = (diseaseId) => {
    // Find all category-to-disease flows connected to this disease
    const categoryToDiseaseConnectedFlows = categoryToDiseaseFlows.filter(flow => flow.target === diseaseId);

    if (categoryToDiseaseConnectedFlows.length === 0) return;

    // Check if already selected
    const isAlreadySelected = categoryToDiseaseConnectedFlows.some(flow => selectedPaths.has(flow.id));

    if (isAlreadySelected) {
      // Deselect
      setSelectedPaths(new Set());
    } else {
      // Get the category this disease belongs to
      const categoryFlow = categoryToDiseaseConnectedFlows[0];
      const categoryId = categoryFlow.source;

      // Find all climate-to-category flows that connect to this category
      const climateToCategoryConnectedFlows = climateToCategoryFlows.filter(flow => flow.target === categoryId);

      // Combine both sets of flows
      const allConnectedFlowIds = [
        ...categoryToDiseaseConnectedFlows.map(f => f.id),
        ...climateToCategoryConnectedFlows.map(f => f.id)
      ];

      setSelectedPaths(new Set(allConnectedFlowIds));
    }
  };

  // Check if a flow should be dimmed
  const isFlowDimmed = (flowId) => {
    if (selectedPaths.size === 0) return false;

    // If this flow is in the selected set, don't dim it
    if (selectedPaths.has(flowId)) return false;

    // If any paths are selected, dim all others
    return true;
  };

  // Check if a disease node should be highlighted
  const isDiseaseHighlighted = (diseaseId) => {
    if (selectedPaths.size === 0) return false;

    // Check if any flow connected to this disease is selected
    const connectedFlows = categoryToDiseaseFlows.filter(flow => flow.target === diseaseId);
    return connectedFlows.some(flow => selectedPaths.has(flow.id));
  };

  // Generate Bezier path with improved smoothness
  const generateSankeyPath = (x1, y1, x2, y2, height, flowType = 'standard') => {
    const dx = x2 - x1;
    const dy = Math.abs(y2 - y1);

    // Adjust control point offset based on flow type and distance
    // For category-to-disease flows (level 2), use more aggressive curve
    let controlPointOffset;
    if (flowType === 'categoryToDisease') {
      // Smoother curves for category to disease with stronger horizontal control
      controlPointOffset = Math.min(dx * 0.7, 200);
    } else {
      // Standard curves for climate to category
      controlPointOffset = dx * 0.5;
    }

    const cp1X = x1 + controlPointOffset;
    const cp2X = x2 - controlPointOffset;

    // Add slight vertical adjustment for very large vertical distances
    const verticalAdjustment = dy > 100 ? Math.min(dy * 0.1, 30) : 0;
    const cp1Y = y1 < y2 ? y1 + verticalAdjustment : y1 - verticalAdjustment;
    const cp2Y = y2 < y1 ? y2 + verticalAdjustment : y2 - verticalAdjustment;

    return `
      M ${x1} ${y1 - height / 2}
      C ${cp1X} ${cp1Y - height / 2}, ${cp2X} ${cp2Y - height / 2}, ${x2} ${y2 - height / 2}
      L ${x2} ${y2 + height / 2}
      C ${cp2X} ${cp2Y + height / 2}, ${cp1X} ${cp1Y + height / 2}, ${x1} ${y1 + height / 2}
      Z
    `;
  };

  if (climateNodes.length === 0 || categoryNodes.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-foreground">Climate Impact Analysis</h3>
        <p className="text-sm text-muted-foreground mt-4">
          Insufficient data to display multi-level climate impact analysis. Please select a disease with available data.
        </p>
      </div>
    );
  }

  const width = 1200;
  const height = 550;
  const sourceX = 160;
  const middleX = 500;
  const targetX = 820;

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Climate Impact Analysis</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Multi-level correlation between climate variables, disease categories, and individual diseases
          </p>
        </div>
        {selectedPaths.size > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setSelectedPaths(new Set())}
            className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear Selection
          </motion.button>
        )}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          {/* Gradients for climate to category flows */}
          {climateToCategoryFlows.map((flow, index) => (
            <linearGradient key={`grad-c2cat-${index}`} id={`gradient-c2cat-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={flow.sourceColor} stopOpacity="0.4" />
              <stop offset="50%" stopColor={flow.targetColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={flow.targetColor} stopOpacity="0.45" />
            </linearGradient>
          ))}
          {/* Gradients for category to disease flows - more subtle */}
          {categoryToDiseaseFlows.map((flow, index) => (
            <linearGradient key={`grad-cat2d-${index}`} id={`gradient-cat2d-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={flow.sourceColor} stopOpacity="0.45" />
              <stop offset="100%" stopColor={flow.targetColor} stopOpacity="0.3" />
            </linearGradient>
          ))}
        </defs>

        {/* Climate to Category Flows */}
        {climateToCategoryFlows.map((flow, index) => {
          const isDimmed = isFlowDimmed(flow.id);
          return (
            <g key={`flow-c2cat-${index}`}>
              <motion.path
                d={generateSankeyPath(sourceX, flow.sourceY, middleX, flow.targetY, flow.height)}
                fill={`url(#gradient-c2cat-${index})`}
                initial={{ opacity: 0, pathLength: 0 }}
                animate={{
                  opacity: isDimmed ? 0.12 : (hoveredFlow === flow.id ? 0.85 : 0.6),
                  pathLength: 1
                }}
                transition={{
                  opacity: { duration: 0.3 },
                  pathLength: { duration: 1, delay: index * 0.05, ease: "easeInOut" }
                }}
                onMouseEnter={() => setHoveredFlow(flow.id)}
                onMouseLeave={() => setHoveredFlow(null)}
                onClick={() => handlePathClick(flow.id)}
                style={{ cursor: 'pointer' }}
                className="transition-opacity"
              />
              {/* Tooltip on hover */}
              {hoveredFlow === flow.id && (
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <rect
                    x={(sourceX + middleX) / 2 - 50}
                    y={(flow.sourceY + flow.targetY) / 2 - 20}
                    width="100"
                    height="40"
                    fill="white"
                    stroke="currentColor"
                    strokeWidth="1"
                    rx="6"
                    className="stroke-border"
                    filter="drop-shadow(0 2px 8px rgba(0,0,0,0.15))"
                  />
                  <text
                    x={(sourceX + middleX) / 2}
                    y={(flow.sourceY + flow.targetY) / 2 - 4}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="600"
                    fill="currentColor"
                    className="text-foreground"
                  >
                    r = {flow.correlation.toFixed(3)}
                  </text>
                  <text
                    x={(sourceX + middleX) / 2}
                    y={(flow.sourceY + flow.targetY) / 2 + 10}
                    textAnchor="middle"
                    fontSize="10"
                    fill="currentColor"
                    className="text-muted-foreground"
                  >
                    {flow.isPositive ? 'Positive' : 'Negative'} impact
                  </text>
                </motion.g>
              )}
            </g>
          );
        })}

        {/* Category to Disease Flows */}
        {categoryToDiseaseFlows.map((flow, index) => {
          const isDimmed = isFlowDimmed(flow.id);
          return (
            <g key={`flow-cat2d-${index}`}>
              <motion.path
                d={generateSankeyPath(middleX, flow.sourceY, targetX, flow.targetY, flow.height, 'categoryToDisease')}
                fill={`url(#gradient-cat2d-${index})`}
                initial={{ opacity: 0, pathLength: 0 }}
                animate={{
                  opacity: isDimmed ? 0.12 : (hoveredFlow === flow.id ? 0.85 : 0.6),
                  pathLength: 1
                }}
                transition={{
                  opacity: { duration: 0.3 },
                  pathLength: { duration: 1, delay: 0.5 + index * 0.03, ease: "easeInOut" }
                }}
                onMouseEnter={() => setHoveredFlow(flow.id)}
                onMouseLeave={() => setHoveredFlow(null)}
                onClick={() => handlePathClick(flow.id)}
                style={{ cursor: 'pointer' }}
                className="transition-opacity"
              />
              {/* Tooltip on hover */}
              {hoveredFlow === flow.id && (
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <rect
                    x={(middleX + targetX) / 2 - 45}
                    y={(flow.sourceY + flow.targetY) / 2 - 18}
                    width="90"
                    height="36"
                    fill="white"
                    stroke="currentColor"
                    strokeWidth="1"
                    rx="6"
                    className="stroke-border"
                    filter="drop-shadow(0 2px 8px rgba(0,0,0,0.15))"
                  />
                  <text
                    x={(middleX + targetX) / 2}
                    y={(flow.sourceY + flow.targetY) / 2 - 2}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="600"
                    fill="currentColor"
                    className="text-foreground"
                  >
                    {(flow.proportion * 100).toFixed(1)}%
                  </text>
                  <text
                    x={(middleX + targetX) / 2}
                    y={(flow.sourceY + flow.targetY) / 2 + 12}
                    textAnchor="middle"
                    fontSize="10"
                    fill="currentColor"
                    className="text-muted-foreground"
                  >
                    {flow.value.toLocaleString()} cases
                  </text>
                </motion.g>
              )}
            </g>
          );
        })}

        {/* Climate Variable Nodes (Left) */}
        {climateNodes.map((node, index) => (
          <motion.g
            key={`climate-${node.id}`}
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
          >
            <circle cx={sourceX - 25} cy={node.y} r="6" fill={node.color} />
            <text
              x={sourceX - 38}
              y={node.y + 4}
              textAnchor="end"
              fontSize="13"
              fontWeight="600"
              fill="currentColor"
              className="text-foreground"
            >
              {node.label}
            </text>
          </motion.g>
        ))}

        {/* Category Nodes (Middle) */}
        {categoryNodes.map((node, index) => (
          <motion.g
            key={`category-${node.id}`}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 + index * 0.08, ease: "easeOut" }}
          >
            {/* Simple circle node instead of rectangle */}
            <circle
              cx={middleX}
              cy={node.y}
              r="8"
              fill={node.color}
              opacity="0.9"
              stroke="white"
              strokeWidth="2"
            />
            {/* Category label on the left */}
            <text
              x={middleX - 18}
              y={node.y - 14}
              textAnchor="end"
              fontSize="11"
              fontWeight="600"
              fill="currentColor"
              className="text-foreground"
            >
              {node.label.split(' ')[0]}
            </text>
            <text
              x={middleX - 18}
              y={node.y - 2}
              textAnchor="end"
              fontSize="9"
              fill="currentColor"
              className="text-muted-foreground"
            >
              {node.totalCases.toLocaleString()} cases
            </text>
          </motion.g>
        ))}

        {/* Disease Nodes (Right) */}
        {diseaseNodes.map((node, index) => {
          // Shorten disease names intelligently
          let shortLabel = node.label;
          if (shortLabel.startsWith('IDSR ')) {
            shortLabel = shortLabel.replace('IDSR ', '');
          }
          if (shortLabel.length > 30) {
            shortLabel = shortLabel.substring(0, 30) + '...';
          }

          const isHighlighted = isDiseaseHighlighted(node.id);

          return (
            <motion.g
              key={`disease-${node.id}`}
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 + index * 0.02, ease: "easeOut" }}
              onClick={() => handleDiseaseClick(node.id)}
              style={{ cursor: 'pointer' }}
              className="transition-opacity"
            >
              {/* Highlight background when selected */}
              {isHighlighted && (
                <rect
                  x={targetX + 15}
                  y={node.y - 8}
                  width="280"
                  height="18"
                  fill={node.color}
                  opacity="0.15"
                  rx="4"
                />
              )}
              {/* Color dot */}
              <circle
                cx={targetX + 20}
                cy={node.y}
                r={isHighlighted ? "4.5" : "3.5"}
                fill={node.color}
                opacity={isHighlighted ? "1" : "0.8"}
                className="transition-all duration-300"
              />
              {/* Disease name and case count on same line */}
              <text
                x={targetX + 28}
                y={node.y + 3}
                textAnchor="start"
                fontSize="10"
                fontWeight={isHighlighted ? "700" : "500"}
                fill="currentColor"
                className="text-foreground transition-all duration-300"
              >
                {shortLabel}
                <tspan
                  fontSize="8"
                  fontWeight={isHighlighted ? "500" : "400"}
                  className="text-muted-foreground"
                  opacity={isHighlighted ? "0.8" : "0.6"}
                  dx="6"
                >
                  ({node.totalCases.toLocaleString()})
                </tspan>
              </text>
            </motion.g>
          );
        })}

        {/* Labels for each column */}
        <text x={sourceX - 25} y={28} textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor" className="text-muted-foreground uppercase tracking-wider">
          Climate Variables
        </text>
        <text x={middleX - 40} y={28} textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor" className="text-muted-foreground uppercase tracking-wider">
          Disease Categories
        </text>
        <text x={targetX + 140} y={28} textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor" className="text-muted-foreground uppercase tracking-wider">
          Individual Diseases
        </text>
      </svg>

      {/* Legend and Instructions */}
      <div className="mt-6 flex items-start justify-between gap-6">
        <div className="flex-1">
          <h4 className="text-xs font-semibold text-foreground mb-2">How to Read</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Flow thickness shows impact strength</li>
            <li>• Click any path or disease name to highlight flows</li>
            <li>• Hover over paths to see correlation details</li>
            <li>• Click again to clear selection</li>
          </ul>
        </div>
        <div className="flex-1">
          <h4 className="text-xs font-semibold text-foreground mb-2">Top Disease Categories</h4>
          <div className="space-y-1">
            {categoryNodes.slice(0, 3).map((cat, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-muted-foreground">{cat.label.split(' ')[0]}</span>
                <span className="text-foreground font-medium">{cat.totalCases.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClimateSankeyDiagram;
