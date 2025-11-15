import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Search, Download, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios";

const FacilityTable = ({ filters }) => {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("totalCases");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(
          "http://localhost:4000/api/locations/facilities/performance",
          {
            params: {
              districtUid: filters.location !== "all" ? filters.location : undefined,
              startDate: filters.startDate,
              endDate: filters.endDate,
            },
          }
        );
        setFacilities(response.data.data || []);
      } catch (error) {
        console.error("Error fetching facility data:", error);
        setError("Failed to load facility data");
      } finally {
        setLoading(false);
      }
    };

    fetchFacilities();
  }, [filters]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Active":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "Delayed":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "Inactive":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Delayed":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "Inactive":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Rank",
      "Facility Name",
      "District",
      "Total Cases",
      "Total Deaths",
      "CFR (%)",
      "Last Report",
      "Status",
      "Days Since Report",
    ];

    const rows = filteredAndSortedFacilities.map((facility, index) => [
      index + 1,
      facility.facilityName,
      facility.districtName,
      facility.totalCases,
      facility.totalDeaths,
      facility.caseFatalityRate,
      facility.lastReportDate
        ? new Date(facility.lastReportDate).toLocaleDateString()
        : "Never",
      facility.status,
      facility.daysSinceReport || "N/A",
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `facility-performance-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredAndSortedFacilities = facilities
    .filter((facility) => {
      const matchesSearch =
        facility.facilityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facility.districtName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || facility.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aValue = a[sortBy] || 0;
      const bValue = b[sortBy] || 0;
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });

  const totalPages = Math.ceil(filteredAndSortedFacilities.length / itemsPerPage);
  const paginatedFacilities = filteredAndSortedFacilities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="bg-card rounded-lg border p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Loading facility data...</span>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Facilities</p>
          <p className="text-3xl font-bold">{facilities.length}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-xs text-muted-foreground mb-1">Active Facilities</p>
          <p className="text-3xl font-bold text-green-600">
            {facilities.filter((f) => f.status === "Active").length}
          </p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Cases</p>
          <p className="text-3xl font-bold">
            {facilities.reduce((sum, f) => sum + (f.totalCases || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-xs text-muted-foreground mb-1">Avg CFR</p>
          <p className="text-3xl font-bold">
            {facilities.length > 0
              ? (
                  facilities.reduce((sum, f) => sum + (f.caseFatalityRate || 0), 0) /
                  facilities.length
                ).toFixed(2)
              : 0}
            %
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-card rounded-lg border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search facilities or districts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border rounded-md bg-background"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border rounded-md bg-background"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Delayed">Delayed</option>
            <option value="Inactive">Inactive</option>
          </select>

          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <span>
            Showing {paginatedFacilities.length} of {filteredAndSortedFacilities.length}{" "}
            facilities
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">
                  Rank
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">
                  Facility
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">
                  District
                </th>
                <th
                  className="text-right text-xs font-medium text-muted-foreground p-3 cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("totalCases")}
                >
                  Cases {sortBy === "totalCases" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="text-right text-xs font-medium text-muted-foreground p-3 cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("totalDeaths")}
                >
                  Deaths {sortBy === "totalDeaths" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="text-right text-xs font-medium text-muted-foreground p-3 cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("caseFatalityRate")}
                >
                  CFR % {sortBy === "caseFatalityRate" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">
                  Last Report
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground p-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedFacilities.map((facility, index) => (
                <motion.tr
                  key={facility.uid}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="hover:bg-muted/30"
                >
                  <td className="p-3 text-sm font-medium">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">
                          {facility.facilityName}
                        </div>
                        <div className="text-xs text-muted-foreground">{facility.uid}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-sm">{facility.districtName}</td>
                  <td className="p-3 text-right font-semibold text-sm">
                    {facility.totalCases.toLocaleString()}
                  </td>
                  <td className="p-3 text-right text-sm">
                    {facility.totalDeaths.toLocaleString()}
                  </td>
                  <td className="p-3 text-right text-sm">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        facility.caseFatalityRate > 5
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          : facility.caseFatalityRate > 2
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      }`}
                    >
                      {facility.caseFatalityRate.toFixed(2)}%
                    </span>
                  </td>
                  <td className="p-3 text-sm">
                    {facility.lastReportDate ? (
                      <div>
                        <div className="text-sm">
                          {new Date(facility.lastReportDate).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {facility.daysSinceReport !== null
                            ? `${facility.daysSinceReport} days ago`
                            : ""}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(
                        facility.status
                      )}`}
                    >
                      {getStatusIcon(facility.status)}
                      {facility.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default FacilityTable;
