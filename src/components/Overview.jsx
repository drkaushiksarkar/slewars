import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CloudRain,
  Thermometer,
  Droplets,
  Bell,
  AlertTriangle,
  MapPin,
  Target,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import DiseaseMap from "./DiseaseMap";
import { fetchWeatherData } from "@/services/weatherService";
import DiseaseBreakdown from "./dashboard/DiseaseBreakdown";
import DiseaseTrend from "./dashboard/DiseaseTrend";

const Overview = () => {
  const [selectedAlert, setSelectedAlert] = React.useState(null);
  const [selectedDisease, setSelectedDisease] = React.useState("all");
  const [selectedLocation, setSelectedLocation] = React.useState("all");
  const [timeRange, setTimeRange] = React.useState("30d");
  const [weatherData, setWeatherData] = React.useState(null);
  const { overview, isLoading, refresh } = useDashboardData();

  const alertStats = overview?.alertStats ?? {
    total: 0,
    active: 0,
    resolved: 0,
    trend: "0%",
    byDisease: {},
    byRegion: {}
  };

  const predictionMetrics = overview?.predictionMetrics ?? {
    overall: 0,
    byDisease: {},
    confusionMatrix: {
      truePositive: 0,
      falsePositive: 0,
      trueNegative: 0,
      falseNegative: 0
    }
  };

  const alerts = overview?.alerts ?? [];
  const diseaseOptions = overview?.country?.diseases ?? [
    "Malaria",
    "Lassa Fever",
    "Yellow Fever",
    "Ebola",
    "Typhoid"
  ];
  const filteredAlerts = React.useMemo(() => {
    if (selectedDisease === "all") return alerts;
    return alerts.filter(
      (alert) => alert.disease?.toLowerCase() === selectedDisease.toLowerCase()
    );
  }, [alerts, selectedDisease]);

  React.useEffect(() => {
    if (selectedAlert && !alerts.find((alert) => alert.id === selectedAlert.id)) {
      setSelectedAlert(null);
    }
  }, [alerts, selectedAlert]);

  // Fetch weather data on mount
  React.useEffect(() => {
    const loadWeatherData = async () => {
      try {
        const data = await fetchWeatherData();
        setWeatherData(data);
      } catch (error) {
        console.error('Error loading weather data:', error);
      }
    };

    loadWeatherData();

    // Refresh every 30 minutes
    const interval = setInterval(loadWeatherData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Dropdowns Row */}
      <div className="flex items-center space-x-3">
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-4 py-2"
        >
          <option value="all">All Locations</option>
          {/* Additional locations will be loaded dynamically */}
        </select>

        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-4 py-2"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>

        <select
          value={selectedDisease}
          onChange={(e) => setSelectedDisease(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-4 py-2"
        >
          <option value="all">All Diseases</option>
          {diseaseOptions.map((disease) => (
            <option key={disease} value={disease}>
              {disease}
            </option>
          ))}
        </select>
      </div>

      {/* Weather Cards and Alert Statistics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - Climate Cards */}
        <div className="grid grid-cols-3 gap-4">
          {/* Rainfall Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative rounded-lg overflow-hidden h-full min-h-[180px] cursor-pointer bg-sky-100"
          >
            {/* Content */}
            <div className="flex flex-col items-center justify-center h-full p-4 text-sky-900">
              <CloudRain className="h-12 w-12 mb-3" />
              <span className="text-sm font-semibold mb-1">Rainfall</span>
              {weatherData && (
                <>
                  <span className="text-2xl font-bold">
                    {weatherData.current.rainfall.toFixed(1)} mm
                  </span>
                  <div className="mt-2 flex items-center gap-1 text-xs opacity-80">
                    <TrendingUp className="h-3 w-3" />
                    <span>Tomorrow: {weatherData.tomorrow.rainfall.toFixed(1)} mm</span>
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* Temperature Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative rounded-lg overflow-hidden h-full min-h-[180px] cursor-pointer bg-rose-100"
          >
            {/* Content */}
            <div className="flex flex-col items-center justify-center h-full p-4 text-rose-900">
              <Thermometer className="h-12 w-12 mb-3" />
              <span className="text-sm font-semibold mb-1">Temperature</span>
              {weatherData && (
                <>
                  <span className="text-2xl font-bold">
                    {weatherData.current.temperature}°C
                  </span>
                  <div className="mt-2 flex items-center gap-1 text-xs opacity-80">
                    <TrendingUp className="h-3 w-3" />
                    <span>Tomorrow: {weatherData.tomorrow.temperature}°C</span>
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* Humidity Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative rounded-lg overflow-hidden h-full min-h-[180px] cursor-pointer bg-amber-100"
          >
            {/* Content */}
            <div className="flex flex-col items-center justify-center h-full p-4 text-amber-900">
              <Droplets className="h-12 w-12 mb-3" />
              <span className="text-sm font-semibold mb-1">Humidity</span>
              {weatherData && (
                <>
                  <span className="text-2xl font-bold">
                    {weatherData.current.humidity}%
                  </span>
                  <div className="mt-2 flex items-center gap-1 text-xs opacity-80">
                    <TrendingUp className="h-3 w-3" />
                    <span>Tomorrow: {weatherData.tomorrow.humidity}%</span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right - Alert Statistics Cards */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card p-4 rounded-lg border-2 border-blue-300 flex items-center gap-3"
          >
            <Bell className="h-10 w-10 text-blue-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-xs font-medium text-muted-foreground">Total Alerts</h3>
              <p className="text-2xl font-bold">{alertStats.total}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-card p-4 rounded-lg border-2 border-rose-300 flex items-center gap-3"
          >
            <AlertTriangle className="h-10 w-10 text-rose-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-xs font-medium text-muted-foreground">Active Alerts</h3>
              <p className="text-2xl font-bold">{alertStats.active}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-card p-4 rounded-lg border-2 border-purple-300 flex items-center gap-3"
          >
            <MapPin className="h-10 w-10 text-purple-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-xs font-medium text-muted-foreground">Affected Regions</h3>
              <p className="text-2xl font-bold">{Object.keys(alertStats.byRegion || {}).length}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-card p-4 rounded-lg border-2 border-green-300 flex items-center gap-3"
          >
            <Target className="h-10 w-10 text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-xs font-medium text-muted-foreground">Prediction Accuracy</h3>
              <p className="text-2xl font-bold">{predictionMetrics.overall}%</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Disease Breakdown and Trend Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disease Breakdown Card */}
        <DiseaseBreakdown locationUid={selectedLocation} timeRange={timeRange} />

        {/* Disease Trend Card */}
        <DiseaseTrend locationUid={selectedLocation} />
      </div>

      {/* Bottom - Full Width Disease Map */}
      <div className="border rounded-lg p-6">
        {/* <h3 className="text-lg font-semibold mb-4 text-center">Disease Map</h3> */}
        <div className="w-full h-[600px]">
          <DiseaseMap selectedDisease={selectedDisease} timeRange={timeRange} />
        </div>
      </div>

      {!overview && (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground flex items-center justify-between">
          <span>
            Model outputs will appear once the data service returns metrics.
          </span>
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
            Refresh
          </Button>
        </div>
      )}

      {/* Alert Detail Modal */}
      <AnimatePresence>
        {selectedAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-background p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedAlert.disease}</h2>
                  <p className="text-muted-foreground">{selectedAlert.region}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedAlert(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Timeline */}
                <div>
                  <h3 className="font-semibold mb-4">Case Timeline</h3>
                  <div className="h-[200px] bg-muted rounded-lg p-4">
                    {/* Add timeline chart here */}
                    <p className="text-center text-muted-foreground">
                      Timeline visualization
                    </p>
                  </div>
                </div>

                {/* Predictive Factors */}
                <div>
                  <h3 className="font-semibold mb-4">Predictive Factors</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedAlert.predictiveFactors?.map((factor, index) => (
                      <div
                        key={index}
                        className="bg-muted p-4 rounded-lg flex items-center space-x-2"
                      >
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span>{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h3 className="font-semibold mb-4">Recommended Actions</h3>
                  <div className="space-y-4">
                    {selectedAlert.recommendations?.map((rec, index) => (
                      <div
                        key={index}
                        className="bg-muted p-4 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{rec.action}</p>
                          <p className="text-sm text-muted-foreground">
                            Priority: {rec.priority}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{rec.impact}%</p>
                          <p className="text-sm text-muted-foreground">Impact</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Overview;
