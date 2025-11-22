import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
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
        const heatmapRes = await axios.get("http://localhost:4000/api/analytics/heatmap", {
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
      // Set initial zoom based on admin level
      const initialZoom = adminLevel === 2 ? 7 : adminLevel === 3 ? 8 : 9;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
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

  // Update zoom when admin level changes
  useEffect(() => {
    if (!map.current) return;

    const newZoom = adminLevel === 2 ? 7 : adminLevel === 3 ? 8 : 9;
    map.current.flyTo({ zoom: newZoom, duration: 1000 });
  }, [adminLevel]);

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
              "#d1fae5", // Pastel green (low)
              0.5,
              "#fef3c7", // Pastel yellow (medium)
              1,
              "#fecaca", // Pastel red (high)
            ],
            "fill-opacity": 0.7,
          },
        });

        // Add border layer
        map.current.addLayer({
          id: "location-borders",
          type: "line",
          source: "locations-polygons",
          paint: {
            "line-color": "#94a3b8",
            "line-width": 1.5,
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
              "#d1fae5",
              0.5,
              "#fef3c7",
              1,
              "#fecaca",
            ],
            "circle-opacity": 0.75,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#94a3b8",
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
      {/* Legend */}
      <div className="bg-card rounded-lg border p-4">
        <h3 className="font-semibold text-sm mb-3">
          Case Distribution by {levelLabel.singular}
          {adminLevel === 4 && <span className="text-xs font-normal ml-2">(Bubble Size = Cases)</span>}
        </h3>

        {adminLevel === 4 ? (
          // Bubble chart legend for facilities
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-[#fecaca] border-2 border-[#94a3b8]"></div>
              <span className="text-sm">High Risk</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 rounded-full bg-[#fef3c7] border-2 border-[#94a3b8]"></div>
              <span className="text-sm">Medium Risk</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-[#d1fae5] border-2 border-[#94a3b8]"></div>
              <span className="text-sm">Low Risk</span>
            </div>
          </div>
        ) : (
          // Standard polygon legend
          <>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">Low</span>
              <div className="flex-1 h-4 rounded-md bg-gradient-to-r from-[#d1fae5] via-[#fef3c7] to-[#fecaca]"></div>
              <span className="text-xs text-muted-foreground">High</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Click on a {levelLabel.singular.toLowerCase()} to view detailed information
            </p>
          </>
        )}
      </div>

      {/* Map Container */}
      <div className="relative bg-card rounded-lg border overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading map data...</p>
            </div>
          </div>
        )}
        <div ref={mapContainer} className="h-[600px] w-full" />

        {/* Map Legend Overlay */}
        {!loading && heatmapData && heatmapData.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm p-4 rounded-lg shadow-lg"
          >
            <h3 className="font-semibold mb-2 text-sm">
              Legend {adminLevel === 4 && <span className="text-xs font-normal">(Size = Cases)</span>}
            </h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {adminLevel === 4 ? (
                  <div className="w-8 h-8 rounded-full bg-[#fecaca] border-2 border-[#94a3b8]"></div>
                ) : (
                  <div className="w-4 h-4 bg-[#fecaca] border border-[#94a3b8]"></div>
                )}
                <span className="text-sm">High Risk</span>
              </div>
              <div className="flex items-center space-x-2">
                {adminLevel === 4 ? (
                  <div className="w-5 h-5 rounded-full bg-[#fef3c7] border-2 border-[#94a3b8]"></div>
                ) : (
                  <div className="w-4 h-4 bg-[#fef3c7] border border-[#94a3b8]"></div>
                )}
                <span className="text-sm">Medium Risk</span>
              </div>
              <div className="flex items-center space-x-2">
                {adminLevel === 4 ? (
                  <div className="w-2 h-2 rounded-full bg-[#d1fae5] border-2 border-[#94a3b8]"></div>
                ) : (
                  <div className="w-4 h-4 bg-[#d1fae5] border border-[#94a3b8]"></div>
                )}
                <span className="text-sm">Low Risk</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Summary Stats */}
      {heatmapData && heatmapData.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border p-4">
            <p className="text-xs text-muted-foreground mb-1">Total {levelLabel.plural}</p>
            <p className="text-2xl font-bold">{heatmapData.length}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Cases</p>
            <p className="text-2xl font-bold">
              {heatmapData.reduce((sum, d) => sum + (d.totalCases || 0), 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-xs text-muted-foreground mb-1">{adminLevel === 4 ? "Reporting" : "Active"} {adminLevel === 4 ? levelLabel.plural : "Facilities"}</p>
            <p className="text-2xl font-bold">
              {heatmapData.reduce((sum, d) => sum + (d.facilitiesReporting || 0), 0)}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default LocationHeatmap;
