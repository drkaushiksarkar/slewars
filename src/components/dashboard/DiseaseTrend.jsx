import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, ChevronDown } from "lucide-react";

const CATEGORY_ICONS = {
  "Vector-Borne": "🦟",
  "Water-Borne & Diarrheal": "💧",
  "Air-Borne & Respiratory": "🫁",
  "Neglected Tropical Diseases": "🪱",
  "Vaccine-Preventable": "💉",
  "Other Infections & NCDs": "🩺",
  "Viral Hemorrhagic": "🩸",
};

// Baseline calculation methods
const BASELINE_METHODS = {
  PERCENTILE_95: "95th Percentile",
  MEAN_2SD: "Mean + 2SD",
  ENDEMIC_CHANNEL: "Endemic Channel (Median + 2*IQR)",
};

const DiseaseTrend = ({ locationUid = "all", diseaseId = "all", diseaseName = "Disease" }) => {
  const [rawTrendData, setRawTrendData] = useState([]); // Raw trend data without baseline
  const [trendData, setTrendData] = useState([]); // Trend data with baseline
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [baselineMethod, setBaselineMethod] = useState("PERCENTILE_95");
  const [showBaselineDropdown, setShowBaselineDropdown] = useState(false);

  // Calculate baseline value for a set of cases based on selected method
  const calculateBaselineFromCases = (cases, method) => {
    if (!cases || cases.length === 0) return null;

    const sortedCases = [...cases].sort((a, b) => a - b);

    switch (method) {
      case "PERCENTILE_95": {
        const index = Math.ceil(sortedCases.length * 0.95) - 1;
        return sortedCases[index];
      }

      case "MEAN_2SD": {
        const mean = sortedCases.reduce((sum, val) => sum + val, 0) / sortedCases.length;
        const variance = sortedCases.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sortedCases.length;
        const sd = Math.sqrt(variance);
        return mean + (2 * sd);
      }

      case "ENDEMIC_CHANNEL": {
        // Calculate median
        const mid = Math.floor(sortedCases.length / 2);
        const median = sortedCases.length % 2 === 0
          ? (sortedCases[mid - 1] + sortedCases[mid]) / 2
          : sortedCases[mid];

        // Calculate IQR
        const q1Index = Math.floor(sortedCases.length * 0.25);
        const q3Index = Math.floor(sortedCases.length * 0.75);
        const q1 = sortedCases[q1Index];
        const q3 = sortedCases[q3Index];
        const iqr = q3 - q1;

        return median + (2 * iqr);
      }

      default:
        return null;
    }
  };

  // Calculate time-varying baseline for each data point
  // For each date, find historical data from the same week of year in previous years
  const calculateTimeVaryingBaseline = (trendData, historicalData, method) => {
    if (!trendData || trendData.length === 0 || !historicalData || historicalData.length === 0) {
      return [];
    }

    return trendData.map((dataPoint) => {
      const currentDate = new Date(dataPoint.fullDate);
      const weekOfYear = getWeekOfYear(currentDate);

      // Find all historical data points from the same week of year (±1 week for more data)
      const historicalCasesForWeek = historicalData
        .filter((historicalPoint) => {
          const historicalDate = new Date(historicalPoint.startDate);
          const historicalWeek = getWeekOfYear(historicalDate);
          // Include same week ±1 week to get more historical samples
          return Math.abs(historicalWeek - weekOfYear) <= 1;
        })
        .map((point) => point.cases);

      // Calculate baseline from historical cases for this week
      const baseline = calculateBaselineFromCases(historicalCasesForWeek, method);

      return {
        ...dataPoint,
        baseline: baseline || 0,
      };
    });
  };

  // Helper function to get week of year (1-53)
  const getWeekOfYear = (date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  // Fetch trend data and historical data when disease or location changes
  useEffect(() => {
    if (!diseaseId || diseaseId === "all") {
      setRawTrendData([]);
      setTrendData([]);
      setHistoricalData([]);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const endDate = new Date();

        // Fetch last 90 days for display
        const trendStartDate = new Date();
        trendStartDate.setDate(trendStartDate.getDate() - 90);

        // Fetch last 2 years for baseline calculation
        const historicalStartDate = new Date();
        historicalStartDate.setFullYear(historicalStartDate.getFullYear() - 2);

        // Build params for trend data (last 90 days)
        const trendParams = new URLSearchParams();
        trendParams.append("startDate", trendStartDate.toISOString().split("T")[0]);
        trendParams.append("endDate", endDate.toISOString().split("T")[0]);
        if (locationUid && locationUid !== "all") {
          trendParams.append("locationUid", locationUid);
        }

        // Build params for historical data (last 2 years)
        const historicalParams = new URLSearchParams();
        historicalParams.append("startDate", historicalStartDate.toISOString().split("T")[0]);
        historicalParams.append("endDate", endDate.toISOString().split("T")[0]);
        if (locationUid && locationUid !== "all") {
          historicalParams.append("locationUid", locationUid);
        }

        // Fetch both datasets in parallel
        const [trendResponse, historicalResponse] = await Promise.all([
          fetch(`/api/diseases/${diseaseId}/timeseries?${trendParams}`),
          fetch(`/api/diseases/${diseaseId}/timeseries?${historicalParams}`)
        ]);

        const trendResult = await trendResponse.json();
        const historicalResult = await historicalResponse.json();

        if (trendResult.success && trendResult.data) {
          // Format data for chart
          const formattedData = trendResult.data.map((item) => ({
            date: new Date(item.startDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            cases: item.cases,
            facilities: item.facilitiesReporting,
            fullDate: item.startDate,
          }));

          // Store raw trend data
          setRawTrendData(formattedData);

          // Store historical data
          if (historicalResult.success && historicalResult.data) {
            setHistoricalData(historicalResult.data);

            // Calculate time-varying baseline and merge with trend data
            const dataWithBaseline = calculateTimeVaryingBaseline(formattedData, historicalResult.data, baselineMethod);
            setTrendData(dataWithBaseline);
          } else {
            // If no historical data, just show trend without baseline
            setTrendData(formattedData);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load trend data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [diseaseId, locationUid]);

  // Recalculate baseline when method changes
  useEffect(() => {
    if (rawTrendData.length > 0 && historicalData.length > 0) {
      // Recalculate with new method
      const dataWithBaseline = calculateTimeVaryingBaseline(rawTrendData, historicalData, baselineMethod);
      setTrendData(dataWithBaseline);
    }
  }, [baselineMethod, rawTrendData, historicalData]);

  // Calculate summary stats
  const totalCases = trendData.reduce((sum, d) => sum + d.cases, 0);
  const avgCases = trendData.length > 0 ? Math.round(totalCases / trendData.length) : 0;
  const maxCases = trendData.length > 0 ? Math.max(...trendData.map(d => d.cases)) : 0;

  // Calculate trend (comparing first half vs second half)
  const midpoint = Math.floor(trendData.length / 2);
  const firstHalfAvg = trendData.slice(0, midpoint).reduce((sum, d) => sum + d.cases, 0) / midpoint || 0;
  const secondHalfAvg = trendData.slice(midpoint).reduce((sum, d) => sum + d.cases, 0) / (trendData.length - midpoint) || 0;
  const trendPercentage = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg * 100).toFixed(1) : 0;

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{diseaseName} Trend (Last 90 Days)</h3>

        {/* Baseline Method Dropdown */}
        {diseaseId !== "all" && trendData.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowBaselineDropdown(!showBaselineDropdown)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted/50"
            >
              <span>Baseline: {BASELINE_METHODS[baselineMethod]}</span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {showBaselineDropdown && (
              <div className="absolute right-0 mt-1 w-64 bg-card border rounded-lg shadow-lg z-10">
                {Object.entries(BASELINE_METHODS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setBaselineMethod(key);
                      setShowBaselineDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                      baselineMethod === key ? "bg-muted/30 font-medium" : ""
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Total Cases</div>
          <div className="text-xl font-bold">{totalCases.toLocaleString()}</div>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Average/Period</div>
          <div className="text-xl font-bold">{avgCases.toLocaleString()}</div>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Peak Cases</div>
          <div className="text-xl font-bold">{maxCases.toLocaleString()}</div>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Trend
          </div>
          <div className={`text-xl font-bold ${parseFloat(trendPercentage) > 0 ? 'text-red-500' : parseFloat(trendPercentage) < 0 ? 'text-green-500' : ''}`}>
            {parseFloat(trendPercentage) > 0 ? '+' : ''}{trendPercentage}%
          </div>
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center h-80">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="text-center text-red-500 py-8">{error}</div>
      ) : trendData.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          {diseaseId === "all" ? "Please select a disease from the dropdown" : "No data available for the last 90 days"}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={420}>
          <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend />

            {/* Baseline Line (time-varying) */}
            {trendData.length > 0 && trendData[0].baseline !== undefined && (
              <Line
                type="monotone"
                dataKey="baseline"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name={`Baseline (${BASELINE_METHODS[baselineMethod]})`}
                isAnimationActive={false}
              />
            )}

            <Line
              type="monotone"
              dataKey="cases"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Cases"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="facilities"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 2 }}
              name="Facilities Reporting"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default DiseaseTrend;
