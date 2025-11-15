import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
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

        // Fetch district data directly from API with all filters
        const heatmapRes = await axios.get("http://localhost:4000/api/analytics/heatmap", {
          params: {
            startDate: filters.startDate,
            endDate: filters.endDate,
            disease: filters.disease !== "all" ? filters.disease : undefined,
            location: filters.location !== "all" ? filters.location : undefined,
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
            Top diseases shown inline • Click any row for detailed chiefdom breakdown
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
                <th className="text-left text-xs font-medium text-muted-foreground p-3">
                  Top Diseases
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
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {district.casesByDisease && Object.keys(district.casesByDisease).length > 0 ? (
                          Object.entries(district.casesByDisease)
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
