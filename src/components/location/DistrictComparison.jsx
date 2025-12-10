import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronDown } from "lucide-react";
import axios from "axios";

const DistrictComparison = ({ filters, onDistrictSelect }) => {
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("totalCases");
  const [sortOrder, setSortOrder] = useState("desc");
  const [expandedRows, setExpandedRows] = useState({}); // Track expanded rows: { uid: { data: [], level: 2|3 } }
  const [loadingChildren, setLoadingChildren] = useState({}); // Track loading state for children

  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch ADM2 (district) data
        const heatmapRes = await axios.get("/api/analytics/heatmap", {
          params: {
            startDate: filters.startDate,
            endDate: filters.endDate,
            disease: filters.disease !== "all" ? filters.disease : undefined,
            location: filters.location !== "all" ? filters.location : undefined,
            adminLevel: 2, // Always fetch ADM2 for top level
          },
          timeout: 15000,
        });

        const districtsData = heatmapRes.data.data || [];
        setDistricts(districtsData);
        setLoading(false);
      } catch (error) {
        console.error("Error loading district data:", error);
        setError("Failed to load district data. Please check your connection.");
        setLoading(false);
      }
    };

    fetchDistricts();
  }, [filters]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const toggleExpand = async (uid, currentLevel, parentLocation = null) => {
    // If already expanded, collapse it
    if (expandedRows[uid]) {
      const newExpanded = { ...expandedRows };
      delete newExpanded[uid];
      setExpandedRows(newExpanded);
      return;
    }

    // Otherwise, fetch and expand children
    setLoadingChildren({ ...loadingChildren, [uid]: true });

    try {
      const nextLevel = currentLevel + 1;

      // Fetch child data from the heatmap API
      const response = await axios.get("/api/analytics/heatmap", {
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          disease: filters.disease !== "all" ? filters.disease : undefined,
          location: uid, // Filter by parent location
          adminLevel: nextLevel,
        },
        timeout: 15000,
      });

      const childData = response.data.data || [];

      setExpandedRows({
        ...expandedRows,
        [uid]: {
          data: childData,
          level: nextLevel,
        },
      });
    } catch (error) {
      console.error(`Error loading level ${currentLevel + 1} data:`, error);
    } finally {
      setLoadingChildren({ ...loadingChildren, [uid]: false });
    }
  };

  const sortedDistricts = [...districts].sort((a, b) => {
    const aValue = a[sortBy] || 0;
    const bValue = b[sortBy] || 0;
    return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
  });

  const maxCases = Math.max(...districts.map((d) => d.totalCases || 0), 1);

  // Helper function to get level-specific info
  const getLevelInfo = (level) => {
    switch(level) {
      case 2: return { label: "District", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" };
      case 3: return { label: "Chiefdom", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" };
      case 4: return { label: "Facility", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };
      default: return { label: "Location", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" };
    }
  };

  // Render a single row (can be district, chiefdom, or facility)
  const renderRow = (item, index, level = 2, indentLevel = 0) => {
    const percentage = (item.totalCases / maxCases) * 100;
    const isExpanded = expandedRows[item.uid];
    const isLoading = loadingChildren[item.uid];
    const canExpand = level < 4; // Only ADM2 and ADM3 can expand
    const levelInfo = getLevelInfo(level);

    return (
      <React.Fragment key={item.uid}>
        <motion.tr
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.02 }}
          className="hover:bg-muted/50 transition-colors"
        >
          {/* Expand/Collapse Button */}
          <td className="p-3">
            {canExpand ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(item.uid, level);
                }}
                className="hover:bg-muted rounded p-1 transition-colors"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                ) : isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-4"></div>
            )}
          </td>

          {/* Rank */}
          <td className="p-3 text-sm font-medium">{index + 1}</td>

          {/* Location Name with Indent */}
          <td className="p-3">
            <div className="flex items-center gap-2" style={{ paddingLeft: `${indentLevel * 24}px` }}>
              <div>
                <div className="font-medium text-sm">{item.districtName || item.name}</div>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-xs ${levelInfo.color}`}>
                  {levelInfo.label}
                </span>
              </div>
            </div>
          </td>

          {/* Total Cases */}
          <td className="p-3 text-right">
            <div className="font-semibold text-sm">
              {(item.totalCases || 0).toLocaleString()}
            </div>
          </td>

          {/* Distribution Bar */}
          <td className="p-3">
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-primary rounded-full"
              />
            </div>
          </td>

          {/* Disease Types */}
          <td className="p-3 text-right">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {item.diseaseTypes || 0}
            </span>
          </td>

          {/* Facilities */}
          <td className="p-3 text-right">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              {item.facilitiesReporting || 0}
            </span>
          </td>

          {/* Top Diseases */}
          <td className="p-3">
            <div className="flex flex-wrap gap-1">
              {item.casesByDisease && Object.keys(item.casesByDisease).length > 0 ? (
                Object.entries(item.casesByDisease)
                  .sort(([, a], [, b]) => Number(b) - Number(a))
                  .slice(0, 3)
                  .map(([disease, cases]) => (
                    <span
                      key={disease}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-primary/10 text-primary"
                      title={`${disease}: ${Number(cases).toLocaleString()} cases`}
                    >
                      {disease.replace('IDSR ', '')}: {Number(cases).toLocaleString()}
                    </span>
                  ))
              ) : (
                <span className="text-xs text-muted-foreground">No data</span>
              )}
            </div>
          </td>
        </motion.tr>

        {/* Render Children if Expanded */}
        {isExpanded && expandedRows[item.uid]?.data && (
          <AnimatePresence>
            {expandedRows[item.uid].data.map((child, childIndex) =>
              renderRow(child, childIndex, expandedRows[item.uid].level, indentLevel + 1)
            )}
          </AnimatePresence>
        )}
      </React.Fragment>
    );
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg border p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Loading district data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg border p-8 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Districts</p>
          <p className="text-3xl font-bold">{districts.length}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Cases</p>
          <p className="text-3xl font-bold">
            {districts.reduce((sum, d) => sum + (d.totalCases || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-xs text-muted-foreground mb-1">Active Facilities</p>
          <p className="text-3xl font-bold">
            {districts.reduce((sum, d) => sum + (d.facilitiesReporting || 0), 0)}
          </p>
        </div>
      </div>

      {/* District Comparison Table */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Location Hierarchy</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Click expand icons to drill down: Districts → Chiefdoms → Facilities
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 w-12">

                </th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">
                  Rank
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">
                  Location
                </th>
                <th
                  className="text-right text-xs font-medium text-muted-foreground p-3 cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("totalCases")}
                >
                  Total Cases {sortBy === "totalCases" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground p-3">
                  Distribution
                </th>
                <th
                  className="text-right text-xs font-medium text-muted-foreground p-3 cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("diseaseTypes")}
                >
                  Disease Types {sortBy === "diseaseTypes" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="text-right text-xs font-medium text-muted-foreground p-3 cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("facilitiesReporting")}
                >
                  Facilities {sortBy === "facilitiesReporting" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">
                  Top Diseases
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedDistricts.map((district, index) => renderRow(district, index, 2, 0))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default DistrictComparison;
