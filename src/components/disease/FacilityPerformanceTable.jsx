import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, AlertCircle, ArrowUpDown, CheckCircle, XCircle, Clock, Search, Info } from "lucide-react";

const FacilityPerformanceTable = ({ diseaseId, locationUid }) => {
  const [facilities, setFacilities] = useState([]);
  const [filteredFacilities, setFilteredFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState("deaths");
  const [sortDirection, setSortDirection] = useState("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCFRInfo, setShowCFRInfo] = useState(false);

  useEffect(() => {
    const fetchFacilityData = async () => {
      try {
        setLoading(true);
        setError(null);

        let url = `/api/diseases/${diseaseId}/facilities?limit=100`;
        if (locationUid) {
          url += `&locationUid=${locationUid}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (!data.success) {
          throw new Error("Failed to fetch facility data");
        }

        setFacilities(data.data);
        setFilteredFacilities(data.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching facility data:", err);
        setError("Failed to load facility performance");
        setLoading(false);
      }
    };

    if (diseaseId) {
      fetchFacilityData();
    }
  }, [diseaseId, locationUid]);

  // Filter and sort facilities
  useEffect(() => {
    let filtered = [...facilities];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (f) =>
          f.facilityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.district.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((f) => f.status.toLowerCase() === statusFilter.toLowerCase());
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredFacilities(filtered);
  }, [facilities, searchTerm, statusFilter, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getStatusBadge = (status) => {
    switch (status.toLowerCase()) {
      case "active":
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
            <CheckCircle className="h-3 w-3" />
            <span>Active</span>
          </span>
        );
      case "delayed":
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
            <Clock className="h-3 w-3" />
            <span>Delayed</span>
          </span>
        );
      case "inactive":
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">
            <XCircle className="h-3 w-3" />
            <span>Inactive</span>
          </span>
        );
      default:
        return <span className="text-xs text-muted-foreground">{status}</span>;
    }
  };

  const getCFRColor = (cfr) => {
    if (cfr > 100) return "text-purple-600 font-semibold"; // Data quality issue
    if (cfr > 5) return "text-red-600 font-semibold";
    if (cfr > 2) return "text-yellow-600 font-semibold";
    return "text-green-600 font-semibold";
  };

  const formatCFR = (facility) => {
    const cfr = facility.cfr;
    if (cfr > 100) {
      return (
        <span className="flex items-center justify-end space-x-1" title="Data quality issue: Deaths exceed cases">
          <span>{cfr.toFixed(2)}%</span>
          <AlertCircle className="h-3 w-3 text-purple-600" />
        </span>
      );
    }
    return `${cfr.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card rounded-lg border p-6 shadow-sm"
      >
        <div className="flex items-center space-x-2 mb-4">
          <Building2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Facility Performance</h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card rounded-lg border border-destructive/30 p-6 shadow-sm"
      >
        <div className="flex items-center space-x-2 mb-4">
          <Building2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Facility Performance</h3>
        </div>
        <div className="flex items-center space-x-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-card rounded-lg border p-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Facility Performance</h3>
          <span className="text-sm text-muted-foreground">
            ({filteredFacilities.length} facilities)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1 text-sm border rounded-md bg-background"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="delayed">Delayed</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search facilities or districts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {filteredFacilities.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No facilities found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th
                  className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-muted"
                  onClick={() => handleSort("facilityName")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Facility</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-muted"
                  onClick={() => handleSort("district")}
                >
                  <div className="flex items-center space-x-1">
                    <span>District</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right font-semibold cursor-pointer hover:bg-muted"
                  onClick={() => handleSort("cases")}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Cases</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right font-semibold cursor-pointer hover:bg-muted"
                  onClick={() => handleSort("deaths")}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Deaths</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  <div className="flex items-center justify-end space-x-1">
                    <span
                      className="cursor-pointer hover:bg-muted px-2 py-1 rounded"
                      onClick={() => handleSort("cfr")}
                    >
                      CFR (%)
                    </span>
                    <ArrowUpDown
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleSort("cfr")}
                    />
                    <div className="relative">
                      <Info
                        className="h-4 w-4 text-primary cursor-help"
                        onMouseEnter={() => setShowCFRInfo(true)}
                        onMouseLeave={() => setShowCFRInfo(false)}
                      />
                      {showCFRInfo && (
                        <div className="absolute right-0 top-6 z-50 w-80 p-4 bg-popover text-popover-foreground rounded-lg border shadow-lg text-xs">
                          <div className="space-y-2">
                            <p className="font-semibold text-sm">Case Fatality Rate (CFR)</p>
                            <p className="text-muted-foreground">
                              <strong>Formula:</strong> CFR = (Deaths / Cases) × 100
                            </p>
                            <p className="text-muted-foreground">
                              CFR measures the proportion of diagnosed cases that result in death,
                              indicating disease severity and healthcare effectiveness.
                            </p>
                            <div className="pt-2 border-t space-y-1">
                              <p className="text-green-600">• CFR ≤ 2%: Low severity</p>
                              <p className="text-yellow-600">• CFR 2-5%: Moderate severity</p>
                              <p className="text-red-600">• CFR > 5%: High severity</p>
                            </div>
                            <p className="pt-2 border-t text-muted-foreground italic">
                              Note: Death data may be aggregated at district level. Facilities showing
                              0 deaths may not report deaths individually.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Last Report</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredFacilities.map((facility, index) => (
                <motion.tr
                  key={facility.facilityUid}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{facility.facilityName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{facility.district}</td>
                  <td className="px-4 py-3 text-right">{facility.cases.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{facility.deaths.toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right ${getCFRColor(facility.cfr)}`}>
                    {formatCFR(facility)}
                  </td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(facility.status)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {facility.lastReportDate !== "Unknown"
                      ? new Date(facility.lastReportDate).toLocaleDateString()
                      : "Unknown"}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 pt-4 border-t">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Facilities</p>
            <p className="text-lg font-semibold">{filteredFacilities.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Cases</p>
            <p className="text-lg font-semibold">
              {filteredFacilities.reduce((sum, f) => sum + f.cases, 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Average CFR</p>
            <p className="text-lg font-semibold">
              {filteredFacilities.length > 0
                ? (
                    filteredFacilities.reduce((sum, f) => sum + f.cfr, 0) /
                    filteredFacilities.length
                  ).toFixed(2)
                : "0.00"}
              %
            </p>
          </div>
        </div>

        {filteredFacilities.filter(f => f.deaths > 0).length === 0 && filteredFacilities.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <div className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800 dark:text-blue-300">
                <strong>Note:</strong> All facilities show 0 deaths. Death data for this disease may be
                aggregated at district or national level rather than reported by individual facilities.
                Check the Disease Summary card for total deaths across all reporting levels.
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default FacilityPerformanceTable;
