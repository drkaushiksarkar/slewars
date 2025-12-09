import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Building2, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios";

const ChiefdomDrillDown = ({ district, filters, onBack }) => {
  const [chiefdoms, setChiefdoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChiefdoms = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(
          `http://localhost:4000/api/locations/districts/${district.uid}/chiefdoms`,
          {
            params: {
              startDate: filters.startDate,
              endDate: filters.endDate,
            },
          }
        );
        setChiefdoms(response.data.data || []);
      } catch (error) {
        console.error("Error fetching chiefdom data:", error);
        setError("Failed to load chiefdom data");
      } finally {
        setLoading(false);
      }
    };

    if (district && district.uid) {
      fetchChiefdoms();
    }
  }, [district, filters]);

  const totalCases = chiefdoms.reduce((sum, c) => sum + (c.totalCases || 0), 0);
  const maxCases = Math.max(...chiefdoms.map((c) => c.totalCases || 0), 1);

  if (loading) {
    return (
      <div className="bg-card rounded-lg border p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Loading chiefdom data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg border p-8 text-center">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Districts
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h3 className="text-lg font-semibold">{district.districtName}</h3>
            <p className="text-xs text-muted-foreground">Chiefdom-level breakdown</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Chiefdoms</p>
          </div>
          <p className="text-2xl font-bold">{chiefdoms.length}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Total Cases</p>
          </div>
          <p className="text-2xl font-bold">{totalCases.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Active Facilities</p>
          </div>
          <p className="text-2xl font-bold">
            {chiefdoms.reduce((sum, c) => sum + (c.facilitiesCount || 0), 0)}
          </p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Avg Cases/Chiefdom</p>
          </div>
          <p className="text-2xl font-bold">
            {chiefdoms.length > 0 ? Math.round(totalCases / chiefdoms.length) : 0}
          </p>
        </div>
      </div>

      {/* Chiefdom Visualization */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b">
          <h4 className="font-semibold text-sm">Chiefdom Case Distribution</h4>
        </div>
        <div className="p-6 space-y-4">
          {chiefdoms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No chiefdom data available for this district</p>
            </div>
          ) : (
            chiefdoms.map((chiefdom, index) => {
              const percentage = (chiefdom.totalCases / maxCases) * 100;
              const barPercentage = (chiefdom.totalCases / totalCases) * 100;
              return (
                <motion.div
                  key={chiefdom.uid}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {chiefdom.chiefdomName}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground">
                        {chiefdom.facilitiesCount} {chiefdom.facilitiesCount === 1 ? 'facility' : 'facilities'}
                      </span>
                      <span className="text-sm font-semibold min-w-[80px] text-right">
                        {chiefdom.totalCases.toLocaleString()} cases
                      </span>
                      <span className="text-xs text-muted-foreground min-w-[45px] text-right">
                        ({barPercentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.6, delay: index * 0.05 }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Detailed Table */}
      {chiefdoms.length > 0 && (
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="p-4 border-b">
            <h4 className="font-semibold text-sm">Detailed Chiefdom Data</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">
                    Rank
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">
                    Chiefdom
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-3">
                    Total Cases
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-3">
                    % of District
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-3">
                    Facilities
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-3">
                    Disease Types
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {chiefdoms.map((chiefdom, index) => {
                  const percentage = ((chiefdom.totalCases / totalCases) * 100).toFixed(1);
                  return (
                    <tr key={chiefdom.uid} className="hover:bg-muted/30">
                      <td className="p-3 text-sm font-medium">{index + 1}</td>
                      <td className="p-3">
                        <div className="font-medium text-sm">{chiefdom.chiefdomName}</div>
                        <div className="text-xs text-muted-foreground">{chiefdom.uid}</div>
                      </td>
                      <td className="p-3 text-right font-semibold text-sm">
                        {chiefdom.totalCases.toLocaleString()}
                      </td>
                      <td className="p-3 text-right text-sm">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {percentage}%
                        </span>
                      </td>
                      <td className="p-3 text-right text-sm">
                        {chiefdom.facilitiesCount || 0}
                      </td>
                      <td className="p-3 text-right text-sm">
                        {chiefdom.diseaseTypes || 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ChiefdomDrillDown;
