import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";
import axios from "axios";

const DistrictComparison = ({ filters, onDistrictSelect }) => {
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("totalCases"); // totalCases, facilitiesReporting, diseaseTypes
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load GeoJSON first (fast, local file)
        const geojsonRes = await fetch("/geoBoundaries-SLE-ADM2_simplified.geojson");
        const geojsonData = await geojsonRes.json();

        // Create initial district list with just boundaries
        const initialData = geojsonData.features.map((feature) => ({
          uid: feature.properties.shapeID || feature.properties.shapeName,
          districtName: feature.properties.shapeName,
          geometry: feature.geometry,
          totalCases: 0,
          diseaseTypes: 0,
          facilitiesReporting: 0,
        }));

        // Show districts immediately
        setDistricts(initialData);
        setLoading(false);

        // Then try to fetch case data (may be slower)
        try {
          const heatmapRes = await axios.get("http://localhost:4000/api/analytics/heatmap", {
            params: {
              startDate: filters.startDate,
              endDate: filters.endDate,
            },
            timeout: 10000, // 10 second timeout
          });

          const caseData = heatmapRes.data.data || [];

          // Create a map of case data by district name
          const caseMap = new Map();
          caseData.forEach((district) => {
            const name = district.districtName || district.name;
            if (name) {
              caseMap.set(name.toLowerCase(), district);
            }
          });

          // Update with case data
          const combinedData = geojsonData.features.map((feature) => {
            const districtName = feature.properties.shapeName;
            const cases = caseMap.get(districtName.toLowerCase()) || {};

            return {
              uid: feature.properties.shapeID || districtName,
              districtName: districtName,
              geometry: feature.geometry,
              totalCases: cases.totalCases || 0,
              diseaseTypes: cases.diseaseTypes || 0,
              facilitiesReporting: cases.facilitiesReporting || 0,
            };
          });

          setDistricts(combinedData);
        } catch (apiError) {
          console.warn("Failed to load case data, showing districts without data:", apiError);
          // Keep showing the initial district list even if API fails
        }
      } catch (error) {
        console.error("Error loading GeoJSON:", error);
        setError("Failed to load district boundaries");
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

  const sortedDistricts = [...districts].sort((a, b) => {
    const aValue = a[sortBy] || 0;
    const bValue = b[sortBy] || 0;
    return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
  });

  const maxCases = Math.max(...districts.map((d) => d.totalCases || 0), 1);

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
          <h3 className="font-semibold">District Comparison</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Click on a district to view chiefdom-level data
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">
                  Rank
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">
                  District
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
                <th className="text-right text-xs font-medium text-muted-foreground p-3">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedDistricts.map((district, index) => {
                const percentage = (district.totalCases / maxCases) * 100;
                return (
                  <motion.tr
                    key={district.uid}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onDistrictSelect(district)}
                  >
                    <td className="p-3 text-sm font-medium">{index + 1}</td>
                    <td className="p-3">
                      <div className="font-medium text-sm">{district.districtName}</div>
                      <div className="text-xs text-muted-foreground">{district.uid}</div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="font-semibold text-sm">
                        {(district.totalCases || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.5, delay: index * 0.05 }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {district.diseaseTypes || 0}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {district.facilitiesReporting || 0}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDistrictSelect(district);
                        }}
                        className="inline-flex items-center text-xs text-primary hover:text-primary/80 font-medium"
                      >
                        View Details
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default DistrictComparison;
