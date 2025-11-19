import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";

const CATEGORY_ICONS = {
  "Vector-Borne": "🦟",
  "Water-Borne & Diarrheal": "💧",
  "Air-Borne & Respiratory": "🫁",
  "Neglected Tropical Diseases": "🪱",
  "Vaccine-Preventable": "💉",
  "Other Infections & NCDs": "🩺",
  "Viral Hemorrhagic": "🩸",
};

const DiseaseTrend = ({ locationUid = "all" }) => {
  const [allDiseases, setAllDiseases] = useState([]);
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all diseases on mount
  useEffect(() => {
    const fetchDiseases = async () => {
      try {
        const categoriesResponse = await fetch("/api/diseases/categories");
        const categoriesData = await categoriesResponse.json();

        if (categoriesData.success) {
          // Flatten diseases from all categories
          const diseases = [];
          Object.entries(categoriesData.data).forEach(([category, categoryDiseases]) => {
            categoryDiseases.forEach((disease) => {
              diseases.push({
                ...disease,
                category,
              });
            });
          });

          setAllDiseases(diseases);

          // Set default disease (first high priority disease or just the first one)
          const defaultDisease = diseases.find(d => d.name.includes("Malaria")) || diseases[0];
          if (defaultDisease) {
            setSelectedDisease(defaultDisease.id);
          }
        }
      } catch (err) {
        console.error("Error fetching diseases:", err);
        setError("Failed to load diseases");
      }
    };

    fetchDiseases();
  }, []);

  // Fetch trend data when disease or location changes
  useEffect(() => {
    if (!selectedDisease) return;

    const fetchTrendData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Calculate date 90 days ago
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);

        const params = new URLSearchParams();
        params.append("startDate", startDate.toISOString().split("T")[0]);
        params.append("endDate", endDate.toISOString().split("T")[0]);
        if (locationUid && locationUid !== "all") {
          params.append("locationUid", locationUid);
        }

        const response = await fetch(`/api/diseases/${selectedDisease}/timeseries?${params}`);
        const data = await response.json();

        if (data.success && data.data) {
          // Format data for chart
          const formattedData = data.data.map((item) => ({
            date: new Date(item.startDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            cases: item.cases,
            facilities: item.facilitiesReporting,
            fullDate: item.startDate,
          }));

          setTrendData(formattedData);
        }
      } catch (err) {
        console.error("Error fetching trend data:", err);
        setError("Failed to load trend data");
      } finally {
        setLoading(false);
      }
    };

    fetchTrendData();
  }, [selectedDisease, locationUid]);

  const handleDiseaseChange = (e) => {
    setSelectedDisease(e.target.value);
  };

  // Group diseases by category for dropdown
  const diseasesByCategory = allDiseases.reduce((acc, disease) => {
    if (!acc[disease.category]) {
      acc[disease.category] = [];
    }
    acc[disease.category].push(disease);
    return acc;
  }, {});

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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Disease Trend (Last 90 Days)</h3>

        {/* Disease Dropdown with Categories */}
        <select
          value={selectedDisease || ""}
          onChange={handleDiseaseChange}
          className="w-64 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {Object.entries(diseasesByCategory).map(([category, diseases]) => (
            <optgroup key={category} label={`${CATEGORY_ICONS[category] || "📊"} ${category}`}>
              {diseases.map((disease) => (
                <option key={disease.id} value={disease.id}>
                  {"  "} {disease.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
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
          No data available for the last 90 days
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
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
            <Line
              type="monotone"
              dataKey="cases"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Cases"
            />
            <Line
              type="monotone"
              dataKey="facilities"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 2 }}
              name="Facilities Reporting"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default DiseaseTrend;
