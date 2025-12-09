import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Filter, Calendar, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import DistrictComparison from "./location/DistrictComparison";
import ChiefdomDrillDown from "./location/ChiefdomDrillDown";
import LocationHeatmap from "./location/LocationHeatmap";
import axios from "axios";

const LocationAnalysis = () => {
  const [view, setView] = useState("districts"); // map, districts, chiefdoms
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [adminLevel, setAdminLevel] = useState(2); // For heatmap only: 2=District, 3=Chiefdom, 4=Facility
  const [filters, setFilters] = useState({
    disease: "all",
    startDate: "",
    endDate: "",
    location: "all",
  });

  const [districts, setDistricts] = useState([]);
  const [diseasesByCategory, setDiseasesByCategory] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch districts and diseases for filters
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [districtsRes, diseasesRes] = await Promise.all([
          axios.get("http://localhost:4000/api/locations?level=2"),
          axios.get("http://localhost:4000/api/diseases/categories"),
        ]);
        setDistricts(districtsRes.data.data || []);
        setDiseasesByCategory(diseasesRes.data.data || {});
      } catch (error) {
        console.error("Error fetching filter data:", error);
        setError("Failed to load filter data. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Set default date range (last 30 days - matching Overview page)
  useEffect(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    setFilters(prev => ({
      ...prev,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    }));
  }, []);

  const handleDistrictSelect = (district) => {
    setSelectedDistrict(district);
    setView("chiefdoms");
  };

  const handleBackToDistricts = () => {
    setSelectedDistrict(null);
    setView("districts");
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // Show error if filter data fails to load
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Location Analysis</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Location Analysis
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Geographic drill-down and facility-level insights
          </p>
        </div>

        {/* View Toggles */}
        <div className="flex gap-2">
          <Button
            variant={view === "map" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("map")}
          >
            Heatmap
          </Button>
          <Button
            variant={view === "districts" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("districts")}
          >
            Locations
          </Button>
        </div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-lg border p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Filters</h3>
        </div>

        <div className={`grid grid-cols-1 ${view === "map" ? "md:grid-cols-5" : "md:grid-cols-4"} gap-4`}>
          {/* Admin Level Filter - Only show for heatmap view */}
          {view === "map" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Admin Level
              </label>
              <select
                value={adminLevel}
                onChange={(e) => setAdminLevel(parseInt(e.target.value))}
                className="w-full px-3 py-2 text-sm border rounded-md bg-background"
              >
                <option value={2}>ADM2 - Districts</option>
                <option value={3}>ADM3 - Chiefdoms</option>
                <option value={4}>ADM4 - Facilities</option>
              </select>
            </div>
          )}
          {/* Location Filter */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Location
            </label>
            <select
              value={filters.location}
              onChange={(e) => handleFilterChange("location", e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            >
              <option value="all">All Districts</option>
              {districts.map((district) => (
                <option key={district.uid} value={district.uid}>
                  {district.name}
                </option>
              ))}
            </select>
          </div>

          {/* Disease Filter */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Disease
            </label>
            <select
              value={filters.disease}
              onChange={(e) => handleFilterChange("disease", e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            >
              <option value="all">All Diseases</option>
              {Object.entries(diseasesByCategory).map(([category, diseases]) => (
                <optgroup key={category} label={category}>
                  {diseases.map((disease) => (
                    <option key={disease.uid || disease.id} value={disease.id}>
                      {disease.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Start Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border rounded-md bg-background"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              End Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border rounded-md bg-background"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Breadcrumb Navigation */}
      {selectedDistrict && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <button
            onClick={() => handleBackToDistricts()}
            className="hover:text-foreground transition-colors"
          >
            All Districts
          </button>
          <span>/</span>
          <span className="text-foreground font-medium">{selectedDistrict.districtName}</span>
        </motion.div>
      )}

      {/* Content Area */}
      <div className="min-h-[600px]">
        {view === "map" && (
          <React.Suspense fallback={<div className="flex items-center justify-center h-[600px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
            <LocationHeatmap filters={filters} adminLevel={adminLevel} />
          </React.Suspense>
        )}

        {view === "districts" && (
          <DistrictComparison
            filters={filters}
            onDistrictSelect={handleDistrictSelect}
          />
        )}

        {view === "chiefdoms" && selectedDistrict && (
          <ChiefdomDrillDown
            district={selectedDistrict}
            filters={filters}
            onBack={handleBackToDistricts}
          />
        )}
      </div>
    </div>
  );
};

export default LocationAnalysis;
