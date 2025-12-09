import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Activity, AlertCircle, Clock } from "lucide-react";

const TreatmentTimeline = ({ diseaseId, locationUid }) => {
  const [treatmentData, setTreatmentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTreatmentData = async () => {
      try {
        setLoading(true);
        setError(null);

        let url = `http://localhost:4000/api/diseases/${diseaseId}/treatment`;
        if (locationUid) {
          url += `?locationUid=${locationUid}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (!data.success) {
          throw new Error("Failed to fetch treatment data");
        }

        setTreatmentData(data.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching treatment data:", err);
        setError("Failed to load treatment timeline");
        setLoading(false);
      }
    };

    if (diseaseId) {
      fetchTreatmentData();
    }
  }, [diseaseId, locationUid]);

  const getCategoryColor = (index) => {
    const colors = [
      "bg-green-500",
      "bg-yellow-500",
      "bg-orange-500",
      "bg-red-500",
    ];
    return colors[index % colors.length];
  };

  const getCategoryIcon = (category) => {
    if (category.toLowerCase().includes("24")) {
      return <Clock className="h-4 w-4" />;
    }
    return <Activity className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card rounded-lg border p-6 shadow-sm"
      >
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Treatment Timeline</h3>
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
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Treatment Timeline</h3>
        </div>
        <div className="flex items-center space-x-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </motion.div>
    );
  }

  if (treatmentData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card rounded-lg border p-6 shadow-sm"
      >
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Treatment Timeline</h3>
        </div>
        <div className="text-center text-muted-foreground py-8">
          No treatment data available for {diseaseId}
        </div>
      </motion.div>
    );
  }

  const totalCases = treatmentData.reduce((sum, t) => sum + t.cases, 0);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-card rounded-lg border p-6 shadow-sm"
    >
      <div className="flex items-center space-x-2 mb-6">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Treatment Timeline</h3>
      </div>

      <div className="space-y-4">
        {treatmentData.map((item, index) => (
          <motion.div
            key={item.category}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="space-y-2"
          >
            <div className="flex items-start justify-between text-sm">
              <div className="flex items-center space-x-2 flex-1">
                <div className={`p-2 ${getCategoryColor(index)} bg-opacity-10 rounded-md`}>
                  {getCategoryIcon(item.category)}
                </div>
                <span className="font-medium text-foreground text-xs">
                  {item.category}
                </span>
              </div>
              <div className="flex items-center space-x-3 ml-2">
                <span className="text-muted-foreground text-xs">
                  {item.cases.toLocaleString()}
                </span>
                <span className="font-semibold text-primary text-sm">
                  {item.percentage}%
                </span>
              </div>
            </div>
            <div className="relative h-6 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.percentage}%` }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className={`h-full ${getCategoryColor(index)} flex items-center justify-end pr-2`}
              >
                {item.percentage > 15 && (
                  <span className="text-xs font-semibold text-white">
                    {item.percentage}%
                  </span>
                )}
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Treated</span>
          <span className="font-semibold text-foreground">
            {totalCases.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="mt-4 p-3 bg-primary/5 rounded-lg">
        <p className="text-xs text-muted-foreground">
          <strong>ACT Treatment:</strong> Artemisinin-based Combination Therapy is the
          first-line treatment for uncomplicated malaria. Early treatment (&lt;24 hours)
          is associated with better outcomes.
        </p>
      </div>
    </motion.div>
  );
};

export default TreatmentTimeline;
