import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bug, AlertCircle } from "lucide-react";

const SpeciesDistribution = ({ locationUid }) => {
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSpeciesData = async () => {
      try {
        setLoading(true);
        setError(null);

        let url = "/api/diseases/malaria/species";
        if (locationUid) {
          url += `?locationUid=${locationUid}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (!data.success) {
          throw new Error("Failed to fetch species data");
        }

        setSpecies(data.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching species data:", err);
        setError("Failed to load species distribution");
        setLoading(false);
      }
    };

    fetchSpeciesData();
  }, [locationUid]);

  const getSpeciesColor = (index) => {
    const colors = [
      "bg-red-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-purple-500",
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card rounded-lg border p-6 shadow-sm"
      >
        <div className="flex items-center space-x-2 mb-4">
          <Bug className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Malaria Species Distribution</h3>
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
          <Bug className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Malaria Species Distribution</h3>
        </div>
        <div className="flex items-center space-x-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </motion.div>
    );
  }

  if (species.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card rounded-lg border p-6 shadow-sm"
      >
        <div className="flex items-center space-x-2 mb-4">
          <Bug className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Malaria Species Distribution</h3>
        </div>
        <div className="text-center text-muted-foreground py-8">
          No species data available
        </div>
      </motion.div>
    );
  }

  const totalCases = species.reduce((sum, s) => sum + s.cases, 0);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-card rounded-lg border p-6 shadow-sm"
    >
      <div className="flex items-center space-x-2 mb-6">
        <Bug className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Malaria Species Distribution</h3>
      </div>

      <div className="space-y-4">
        {species.map((item, index) => (
          <motion.div
            key={item.species}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{item.species}</span>
              <div className="flex items-center space-x-3">
                <span className="text-muted-foreground">
                  {item.cases.toLocaleString()} cases
                </span>
                <span className="font-semibold text-primary">
                  {item.percentage}%
                </span>
              </div>
            </div>
            <div className="relative h-8 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.percentage}%` }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className={`h-full ${getSpeciesColor(index)} flex items-center justify-end pr-2`}
              >
                {item.percentage > 10 && (
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
          <span className="text-muted-foreground">Total Cases</span>
          <span className="font-semibold text-foreground">
            {totalCases.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="mt-4 p-3 bg-primary/5 rounded-lg">
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> Distribution shows the proportion of confirmed malaria cases by
          Plasmodium species based on laboratory testing (RDT/microscopy).
        </p>
      </div>
    </motion.div>
  );
};

export default SpeciesDistribution;
