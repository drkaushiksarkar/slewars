import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  ChevronRight,
  BarChart2,
  AlertCircle,
  MapPin,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Filter,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardData } from "@/contexts/DashboardDataContext";

const Overview = () => {
  const [selectedAlert, setSelectedAlert] = React.useState(null);
  const [selectedDisease, setSelectedDisease] = React.useState("all");
  const [timeRange, setTimeRange] = React.useState("7d");
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

  return (
    <div className="space-y-6">
      {/* Alert Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card p-6 rounded-lg border"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Total Alerts</h3>
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold mt-2">{alertStats.total}</p>
          <div className="flex items-center mt-2 text-sm">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-500">{alertStats.trend}</span>
            <span className="text-muted-foreground ml-1">vs last week</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-card p-6 rounded-lg border"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Active Alerts</h3>
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold mt-2">{alertStats.active}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Requiring immediate attention
          </p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card p-6 rounded-lg border"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Prediction Accuracy</h3>
            <BarChart2 className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold mt-2">{predictionMetrics.overall}%</p>
          <p className="text-sm text-muted-foreground mt-2">
            Last 30 days average
          </p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-card p-6 rounded-lg border"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Affected Regions</h3>
            <MapPin className="h-5 w-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold mt-2">{Object.keys(alertStats.byRegion || {}).length}</p>
          <p className="text-sm text-muted-foreground mt-2">
            With active alerts
          </p>
        </motion.div>
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

      {/* Filters and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <select
            value={selectedDisease}
            onChange={(e) => setSelectedDisease(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2"
          >
            <option value="all">All Diseases</option>
            {diseaseOptions.map((disease) => (
              <option key={disease} value={disease}>
                {disease}
              </option>
            ))}
          </select>

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAlerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-card p-6 rounded-lg border cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedAlert(alert)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{alert.disease}</h3>
                <p className="text-sm text-muted-foreground">{alert.region}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                alert.severity === 'High' ? 'bg-red-100 text-red-700' :
                alert.severity === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {alert.severity}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Cases</p>
                <p className="text-lg font-semibold">{alert.cases}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trend</p>
                <p className="text-lg font-semibold text-green-600">{alert.trend}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="text-lg font-semibold">{alert.confidence}%</p>
              </div>
            </div>
          </motion.div>
        ))}
        {filteredAlerts.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed p-6 text-center text-muted-foreground">
            No alerts match the current filters.
          </div>
        )}
      </div>

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
