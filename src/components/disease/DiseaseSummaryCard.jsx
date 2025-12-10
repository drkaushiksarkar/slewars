import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Activity, AlertCircle, TrendingUp, TrendingDown, Calendar, MapPin, FileText } from "lucide-react";

const DiseaseSummaryCard = ({ diseaseId, locationUid, startDate, endDate }) => {
  const [summary, setSummary] = useState(null);
  const [timeSeries, setTimeSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query parameters for filtering
        const params = new URLSearchParams();
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        if (locationUid && locationUid !== "all") params.append("locationUid", locationUid);

        // Fetch time series data with filters
        let timeSeriesUrl = `/api/diseases/${diseaseId}/timeseries`;
        if (params.toString()) {
          timeSeriesUrl += `?${params.toString()}`;
        }

        const timeSeriesRes = await fetch(timeSeriesUrl);
        const timeSeriesData = await timeSeriesRes.json();

        if (!timeSeriesData.success) {
          throw new Error("Failed to fetch time series data");
        }

        const timeSeriesResults = timeSeriesData.data;
        setTimeSeries(timeSeriesResults);

        // Fetch facilities data with location filter to get deaths and cases
        let facilitiesUrl = `/api/diseases/${diseaseId}/facilities?limit=1000`;
        if (locationUid && locationUid !== "all") {
          facilitiesUrl += `&locationUid=${locationUid}`;
        }

        const facilitiesRes = await fetch(facilitiesUrl);
        const facilitiesData = await facilitiesRes.json();

        // Use facilities data for totals to ensure consistency with the facilities table
        // Note: facilities data is NOT filtered by date (it shows all-time totals)
        const totalCases = facilitiesData.success
          ? facilitiesData.data.reduce((sum, f) => sum + f.cases, 0)
          : 0;
        const totalDeaths = facilitiesData.success
          ? facilitiesData.data.reduce((sum, f) => sum + f.deaths, 0)
          : 0;

        const affectedFacilities = facilitiesData.success ? facilitiesData.data.length : 0;
        const reportingPeriods = timeSeriesResults.length;

        // Calculate time-series based metrics from the date-filtered time series
        const timeSeriesTotal = timeSeriesResults.reduce((sum, d) => sum + d.cases, 0);
        const avgCasesPerPeriod = reportingPeriods > 0 ? timeSeriesTotal / reportingPeriods : 0;
        const peakCases = timeSeriesResults.length > 0
          ? Math.max(...timeSeriesResults.map(d => d.cases))
          : 0;

        const earliestDate = timeSeriesResults.length > 0
          ? timeSeriesResults[0].startDate
          : new Date().toISOString();
        const latestDate = timeSeriesResults.length > 0
          ? timeSeriesResults[timeSeriesResults.length - 1].endDate
          : new Date().toISOString();

        // Fetch base disease name
        const diseasesRes = await fetch(`/api/diseases`);
        const diseasesData = await diseasesRes.json();
        const diseaseInfo = diseasesData.success
          ? diseasesData.data.find(d => d.id === diseaseId)
          : null;

        setSummary({
          disease: diseaseInfo?.name || diseaseId,
          totalCases,
          totalDeaths,
          affectedFacilities,
          reportingPeriods,
          earliestDate,
          latestDate,
          avgCasesPerPeriod,
          peakCases,
        });

        setLoading(false);
      } catch (err) {
        console.error("Error fetching summary data:", err);
        setError("Failed to load summary data");
        setLoading(false);
      }
    };

    if (diseaseId) {
      fetchSummaryData();
    }
  }, [diseaseId, locationUid, startDate, endDate]);

  // Calculate trend
  const calculateTrend = () => {
    if (timeSeries.length < 2) return { direction: "neutral", percentage: 0 };

    const recent = timeSeries.slice(-4); // Last 4 periods
    const previous = timeSeries.slice(-8, -4); // Previous 4 periods

    if (recent.length === 0 || previous.length === 0) return { direction: "neutral", percentage: 0 };

    const recentAvg = recent.reduce((sum, d) => sum + d.cases, 0) / recent.length;
    const previousAvg = previous.reduce((sum, d) => sum + d.cases, 0) / previous.length;

    if (previousAvg === 0) return { direction: "neutral", percentage: 0 };

    const change = ((recentAvg - previousAvg) / previousAvg) * 100;

    return {
      direction: change > 5 ? "up" : change < -5 ? "down" : "neutral",
      percentage: Math.abs(change).toFixed(1),
    };
  };

  const trend = calculateTrend();
  const cfr = summary?.totalDeaths && summary?.totalCases
    ? ((summary.totalDeaths / summary.totalCases) * 100).toFixed(2)
    : "N/A";

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card rounded-lg border p-6 shadow-sm"
      >
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </motion.div>
    );
  }

  if (error || !summary) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card rounded-lg border border-destructive/30 p-6 shadow-sm"
      >
        <div className="flex items-center space-x-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error || "No data available"}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-gradient-to-br from-primary/5 via-card to-card rounded-lg border-2 border-primary/20 p-6 shadow-lg"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{summary.disease}</h2>
            <p className="text-sm text-muted-foreground">Disease Summary</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {trend.direction === "up" && (
            <div className="flex items-center space-x-1 text-destructive">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium">+{trend.percentage}%</span>
            </div>
          )}
          {trend.direction === "down" && (
            <div className="flex items-center space-x-1 text-green-600">
              <TrendingDown className="h-5 w-5" />
              <span className="text-sm font-medium">-{trend.percentage}%</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Cases */}
        <div className="bg-card/50 rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground mb-1">Total Cases</p>
          <p className="text-2xl font-bold text-foreground">
            {summary.totalCases.toLocaleString()}
          </p>
        </div>

        {/* Deaths */}
        <div className="bg-card/50 rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground mb-1">Deaths</p>
          <p className="text-2xl font-bold text-destructive">
            {summary.totalDeaths ? summary.totalDeaths.toLocaleString() : "N/A"}
          </p>
        </div>

        {/* CFR */}
        <div className="bg-card/50 rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground mb-1">CFR</p>
          <p className="text-2xl font-bold text-foreground">
            {cfr !== "N/A" ? `${cfr}%` : "N/A"}
          </p>
        </div>

        {/* Affected Facilities */}
        <div className="bg-card/50 rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground mb-1">Facilities</p>
          <p className="text-2xl font-bold text-foreground">
            {summary.affectedFacilities.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Reporting Periods */}
        <div className="flex items-center space-x-3 p-3 bg-card/50 rounded-lg border">
          <Calendar className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Reporting Periods</p>
            <p className="text-sm font-semibold">{summary.reportingPeriods}</p>
          </div>
        </div>

        {/* Average Cases Per Period */}
        <div className="flex items-center space-x-3 p-3 bg-card/50 rounded-lg border">
          <FileText className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Avg Cases/Period</p>
            <p className="text-sm font-semibold">{summary.avgCasesPerPeriod.toFixed(1)}</p>
          </div>
        </div>

        {/* Peak Cases */}
        <div className="flex items-center space-x-3 p-3 bg-card/50 rounded-lg border">
          <TrendingUp className="h-5 w-5 text-destructive" />
          <div>
            <p className="text-xs text-muted-foreground">Peak Cases</p>
            <p className="text-sm font-semibold">{summary.peakCases.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-2">
            <Calendar className="h-3 w-3" />
            <span>
              Data Period: {new Date(summary.earliestDate).toLocaleDateString()} - {new Date(summary.latestDate).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DiseaseSummaryCard;
