import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, Activity, Filter } from "lucide-react";
import DiseaseSummaryCard from "./disease/DiseaseSummaryCard";
import SpeciesDistribution from "./disease/SpeciesDistribution";
import TreatmentTimeline from "./disease/TreatmentTimeline";
import FacilityPerformanceTable from "./disease/FacilityPerformanceTable";

const DiseaseAnalysis = () => {
  const [diseases, setDiseases] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedDisease, setSelectedDisease] = useState("malaria");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch diseases and locations on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);

        // Fetch diseases
        const diseasesRes = await fetch("http://localhost:4000/api/diseases");
        const diseasesData = await diseasesRes.json();
        if (diseasesData.success) {
          setDiseases(diseasesData.data);
        }

        // Fetch locations (districts)
        const locationsRes = await fetch("http://localhost:4000/api/locations?level=2");
        const locationsData = await locationsRes.json();
        if (locationsData.success) {
          setLocations(locationsData.data);
        }

        // Set default date range (last 6 months)
        const today = new Date();
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        setEndDate(today.toISOString().split("T")[0]);
        setStartDate(sixMonthsAgo.toISOString().split("T")[0]);

        setLoading(false);
      } catch (err) {
        console.error("Error fetching initial data:", err);
        setError("Failed to load initial data");
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const handleResetFilters = () => {
    setSelectedDisease("malaria");
    setSelectedLocation("all");
    const today = new Date();
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    setEndDate(today.toISOString().split("T")[0]);
    setStartDate(sixMonthsAgo.toISOString().split("T")[0]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading disease analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
        <p className="text-destructive font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Panel */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-card rounded-lg border p-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>
          <button
            onClick={handleResetFilters}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Disease Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center space-x-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span>Disease</span>
            </label>
            <select
              value={selectedDisease}
              onChange={(e) => setSelectedDisease(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {diseases.map((disease) => (
                <option key={disease.id} value={disease.id}>
                  {disease.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>Location</span>
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Districts</option>
              {locations.map((location) => (
                <option key={location.uid} value={location.uid}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Start Date</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* End Date Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>End Date</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </motion.div>

      {/* Disease Summary Card */}
      <DiseaseSummaryCard
        diseaseId={selectedDisease}
        locationUid={selectedLocation}
        startDate={startDate}
        endDate={endDate}
      />

      {/* Species Distribution and Treatment Timeline (Side by Side) */}
      {selectedDisease === "malaria" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SpeciesDistribution
            locationUid={selectedLocation === "all" ? undefined : selectedLocation}
          />
          <TreatmentTimeline
            diseaseId={selectedDisease}
            locationUid={selectedLocation === "all" ? undefined : selectedLocation}
          />
        </div>
      )}

      {/* Facility Performance Table */}
      <FacilityPerformanceTable
        diseaseId={selectedDisease}
        locationUid={selectedLocation === "all" ? undefined : selectedLocation}
      />
    </div>
  );
};

export default DiseaseAnalysis;
