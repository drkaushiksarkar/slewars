import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import axios from "axios";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const LocationHeatmap = ({ filters, adminLevel = 2 }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [loading, setLoading] = useState(true);
  const [heatmapData, setHeatmapData] = useState(null);
  const [error, setError] = useState(null);
  const [mapboxToken, setMapboxToken] = useState(null);

  // Get label based on admin level
  const getLevelLabel = (level) => {
    switch(level) {
      case 2: return { singular: "District", plural: "Districts" };
      case 3: return { singular: "Chiefdom", plural: "Chiefdoms" };
      case 4: return { singular: "Facility", plural: "Facilities" };
      default: return { singular: "Location", plural: "Locations" };
    }
  };

  const levelLabel = getLevelLabel(adminLevel);

  // Get Mapbox token from environment
  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (token) {
      mapboxgl.accessToken = token;
      setMapboxToken(token);
    } else {
      setError("Mapbox token not found. Please set VITE_MAPBOX_TOKEN in .env file");
    }
  }, []);

  // Fetch heatmap data
  useEffect(() => {
    const fetchHeatmapData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load case data from API (includes geometry)
        const heatmapRes = await axios.get("/api/analytics/heatmap", {
          params: {
            startDate: filters.startDate,
            endDate: filters.endDate,
            disease: filters.disease !== "all" ? filters.disease : undefined,
            location: filters.location !== "all" ? filters.location : undefined,
            adminLevel: adminLevel,
          },
        });

        const caseData = heatmapRes.data.data || [];
        setHeatmapData(caseData);
      } catch (error) {
        console.error("Error fetching heatmap data:", error);
        setError("Failed to load heatmap data");
      } finally {
        setLoading(false);
      }
    };

    if (filters.startDate && filters.endDate) {
      fetchHeatmapData();
    }
  }, [filters.startDate, filters.endDate, filters.disease, filters.location, adminLevel]);

  // Initialize map
  useEffect(() => {
    if (map.current || !mapboxToken || !mapContainer.current) return; // Initialize map only once

    try {
      // Consistent zoom level across all admin levels
      const initialZoom = 7;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
        center: [-11.7799, 8.4606], // Sierra Leone center
        zoom: initialZoom,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

      // Add scale control
      map.current.addControl(
        new mapboxgl.ScaleControl({
          maxWidth: 100,
          unit: "metric",
        }),
        "bottom-right"
      );

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setError('Failed to initialize map. Please check your Mapbox token.');
      });
    } catch (err) {
      console.error('Map initialization error:', err);
      setError(`Map initialization failed: ${err.message}`);
    }
  }, [mapboxToken, adminLevel]);

  // Maintain consistent zoom level across all admin levels
  // (Removed zoom adjustment on admin level change)

  // Update map with heatmap data
  useEffect(() => {
    if (!map.current || !heatmapData || loading) return;

    // Wait for map to load
    if (!map.current.loaded()) {
      map.current.on("load", () => updateMapData());
    } else {
      updateMapData();
    }

    function updateMapData() {
      // Remove existing layers and sources
      const layersToRemove = ["location-fills", "location-borders", "location-circles"];
      const sourcesToRemove = ["locations-polygons", "locations-points"];

      layersToRemove.forEach(layer => {
        if (map.current.getLayer(layer)) {
          map.current.removeLayer(layer);
        }
      });

      sourcesToRemove.forEach(source => {
        if (map.current.getSource(source)) {
          map.current.removeSource(source);
        }
      });

      // Separate polygon and point features
      const polygonFeatures = [];
      const pointFeatures = [];

      heatmapData.filter(d => d.geometry).forEach((location) => {
        const feature = {
          type: "Feature",
          properties: {
            uid: location.uid,
            name: location.districtName || location.name,
            totalCases: location.totalCases || 0,
            diseaseTypes: location.diseaseTypes || 0,
            facilitiesReporting: location.facilitiesReporting || 0,
            riskValue: (location.totalCases || 0) / Math.max(...heatmapData.map(d => d.totalCases || 0), 1),
          },
          geometry: location.geometry,
        };

        const geometryType = location.geometry.type;
        if (geometryType === 'Point') {
          pointFeatures.push(feature);
        } else if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
          polygonFeatures.push(feature);
        }
      });

      // Calculate max cases for color scaling
      const maxCases = Math.max(...heatmapData.map((d) => d.totalCases || 0), 1);

      // Add polygon source and layers if we have polygons
      if (polygonFeatures.length > 0) {
        const polygonGeojson = {
          type: "FeatureCollection",
          features: polygonFeatures,
        };

        map.current.addSource("locations-polygons", {
          type: "geojson",
          data: polygonGeojson,
        });

        // Add fill layer
        map.current.addLayer({
          id: "location-fills",
          type: "fill",
          source: "locations-polygons",
          paint: {
            "fill-color": [
              "interpolate",
              ["linear"],
              ["get", "riskValue"],
              0,
              "#10b981", // Vibrant emerald green (low risk)
              0.5,
              "#f59e0b", // Vibrant amber/orange (medium risk)
              1,
              "#ef4444", // Vibrant red (high risk)
            ],
            "fill-opacity": 0.85,
          },
        });

        // Add border layer
        map.current.addLayer({
          id: "location-borders",
          type: "line",
          source: "locations-polygons",
          paint: {
            "line-color": "#1e293b", // Dark charcoal/slate outline
            "line-width": 2,
            "line-opacity": 0.8,
          },
        });
      }

      // Add point source and layers if we have points
      if (pointFeatures.length > 0) {
        const pointGeojson = {
          type: "FeatureCollection",
          features: pointFeatures,
        };

        map.current.addSource("locations-points", {
          type: "geojson",
          data: pointGeojson,
        });

        // Add circle layer for points
        map.current.addLayer({
          id: "location-circles",
          type: "circle",
          source: "locations-points",
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "totalCases"],
              0, 3,
              25, 10,
              50, 15,
              100, 22,
              150, 28,
              200, 35,
              300, 45
            ],
            "circle-color": [
              "interpolate",
              ["linear"],
              ["get", "riskValue"],
              0,
              "#10b981", // Vibrant emerald green (low risk)
              0.5,
              "#f59e0b", // Vibrant amber/orange (medium risk)
              1,
              "#ef4444", // Vibrant red (high risk)
            ],
            "circle-opacity": 0.85,
            "circle-stroke-width": 2.5,
            "circle-stroke-color": "#1e293b", // Dark charcoal/slate stroke
            "circle-stroke-opacity": 0.8,
          },
        });
      }

      // Add popup on click for both polygon and point layers
      const clickHandler = (e) => {
        const properties = e.features[0].properties;
        const coordinates = e.lngLat;

        new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(
            `
            <div class="p-2">
              <h3 class="font-bold text-sm mb-2">${properties.name}</h3>
              <div class="text-xs space-y-1">
                <p><strong>Total Cases:</strong> ${properties.totalCases.toLocaleString()}</p>
                <p><strong>Disease Types:</strong> ${properties.diseaseTypes}</p>
                <p><strong>Facilities Reporting:</strong> ${properties.facilitiesReporting}</p>
              </div>
            </div>
          `
          )
          .addTo(map.current);
      };

      if (polygonFeatures.length > 0) {
        map.current.on("click", "location-fills", clickHandler);
        map.current.on("mouseenter", "location-fills", () => {
          map.current.getCanvas().style.cursor = "pointer";
        });
        map.current.on("mouseleave", "location-fills", () => {
          map.current.getCanvas().style.cursor = "";
        });
      }

      if (pointFeatures.length > 0) {
        map.current.on("click", "location-circles", clickHandler);
        map.current.on("mouseenter", "location-circles", () => {
          map.current.getCanvas().style.cursor = "pointer";
        });
        map.current.on("mouseleave", "location-circles", () => {
          map.current.getCanvas().style.cursor = "";
        });
      }

      // Fit bounds to show all features
      const allFeatures = [...polygonFeatures, ...pointFeatures];
      if (allFeatures.length > 0) {
        const bounds = allFeatures.reduce(
          (bounds, feature) => {
            if (feature.geometry.type === "Point") {
              bounds.extend(feature.geometry.coordinates);
            } else if (feature.geometry.type === "Polygon") {
              feature.geometry.coordinates[0].forEach((coord) => {
                bounds.extend(coord);
              });
            } else if (feature.geometry.type === "MultiPolygon") {
              feature.geometry.coordinates.forEach((polygon) => {
                polygon[0].forEach((coord) => {
                  bounds.extend(coord);
                });
              });
            }
            return bounds;
          },
          new mapboxgl.LngLatBounds()
        );
        map.current.fitBounds(bounds, { padding: 40 });
      }
    }
  }, [heatmapData, loading]);

  if (error) {
    return (
      <div className="bg-card rounded-lg border p-8 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Premium Header Card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-lg"
      >
        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-4">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Case Distribution by {levelLabel.singular}
              {adminLevel === 4 && <span className="text-xs font-normal ml-2">(Bubble Size = Cases)</span>}
            </h3>
          </div>
        </div>

        <div className="p-4">
          {adminLevel === 4 ? (
            // Bubble chart legend for facilities
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-[#ef4444] border-2 border-white shadow-lg"></div>
                <span className="text-sm font-medium">High Risk</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-full bg-[#f59e0b] border-2 border-white shadow-lg"></div>
                <span className="text-sm font-medium">Medium Risk</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-[#10b981] border-2 border-white shadow-lg"></div>
                <span className="text-sm font-medium">Low Risk</span>
              </div>
            </div>
          ) : (
            // Standard polygon legend
            <>
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold text-muted-foreground">Low</span>
                <div className="flex-1 h-5 rounded-md bg-gradient-to-r from-[#10b981] via-[#f59e0b] to-[#ef4444] shadow-inner"></div>
                <span className="text-xs font-semibold text-muted-foreground">High</span>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Click on a {levelLabel.singular.toLowerCase()} to view detailed information
              </p>
            </>
          )}
        </div>
      </motion.div>

      {/* Premium Map Container */}
      <div className="relative rounded-xl overflow-hidden shadow-inner ring-1 ring-slate-900/10">
        {loading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading map data...</p>
            </div>
          </div>
        )}
        <div ref={mapContainer} className="h-[600px] w-full" />

        {/* Premium Map Legend Overlay */}
        {!loading && heatmapData && heatmapData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute bottom-4 right-4 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-md p-5 rounded-xl shadow-2xl border border-slate-700/50"
          >
            <h3 className="font-bold mb-3 text-sm text-white">
              Risk Legend {adminLevel === 4 && <span className="text-xs font-normal text-slate-400">(Size = Cases)</span>}
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-center space-x-3">
                {adminLevel === 4 ? (
                  <div className="w-8 h-8 rounded-full bg-[#ef4444] border-2 border-white shadow-lg"></div>
                ) : (
                  <div className="w-5 h-5 bg-[#ef4444] border-2 border-white rounded shadow-lg"></div>
                )}
                <span className="text-sm font-medium text-slate-200">High Risk</span>
              </div>
              <div className="flex items-center space-x-3">
                {adminLevel === 4 ? (
                  <div className="w-5 h-5 rounded-full bg-[#f59e0b] border-2 border-white shadow-lg"></div>
                ) : (
                  <div className="w-5 h-5 bg-[#f59e0b] border-2 border-white rounded shadow-lg"></div>
                )}
                <span className="text-sm font-medium text-slate-200">Medium Risk</span>
              </div>
              <div className="flex items-center space-x-3">
                {adminLevel === 4 ? (
                  <div className="w-2 h-2 rounded-full bg-[#10b981] border-2 border-white shadow-lg"></div>
                ) : (
                  <div className="w-5 h-5 bg-[#10b981] border-2 border-white rounded shadow-lg"></div>
                )}
                <span className="text-sm font-medium text-slate-200">Low Risk</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Premium Summary Stats */}
      {heatmapData && heatmapData.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg border-2 border-blue-200 dark:border-blue-800 p-4 shadow-lg"
          >
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1 uppercase tracking-wider">Total {levelLabel.plural}</p>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{heatmapData.length}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg border-2 border-purple-200 dark:border-purple-800 p-4 shadow-lg"
          >
            <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1 uppercase tracking-wider">Total Cases</p>
            <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
              {heatmapData.reduce((sum, d) => sum + (d.totalCases || 0), 0).toLocaleString()}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950 dark:to-pink-900 rounded-lg border-2 border-pink-200 dark:border-pink-800 p-4 shadow-lg"
          >
            <p className="text-xs font-semibold text-pink-700 dark:text-pink-300 mb-1 uppercase tracking-wider">{adminLevel === 4 ? "Reporting" : "Active"} {adminLevel === 4 ? levelLabel.plural : "Facilities"}</p>
            <p className="text-3xl font-bold text-pink-900 dark:text-pink-100">
              {heatmapData.reduce((sum, d) => sum + (d.facilitiesReporting || 0), 0)}
            </p>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default LocationHeatmap;
