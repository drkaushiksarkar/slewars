import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const LocationHeatmap = ({ filters }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [loading, setLoading] = useState(true);
  const [heatmapData, setHeatmapData] = useState(null);
  const [error, setError] = useState(null);
  const [mapboxToken, setMapboxToken] = useState(null);

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

        // Load both GeoJSON and case data in parallel
        const [geojsonRes, heatmapRes] = await Promise.all([
          fetch("/geoBoundaries-SLE-ADM2_simplified.geojson"),
          axios.get("http://localhost:4000/api/analytics/heatmap", {
            params: {
              startDate: filters.startDate,
              endDate: filters.endDate,
              disease: filters.disease !== "all" ? filters.disease : undefined,
              location: filters.location !== "all" ? filters.location : undefined,
            },
          }),
        ]);

        const geojsonData = await geojsonRes.json();
        const caseData = heatmapRes.data.data || [];

        // Create a map of case data by district name
        const caseMap = new Map();
        caseData.forEach((district) => {
          const name = (district.districtName || district.name || "").toLowerCase();
          if (name) {
            caseMap.set(name, district);
          }
        });

        // Combine GeoJSON boundaries with case data
        const combinedData = geojsonData.features.map((feature) => {
          const districtName = feature.properties.shapeName;
          const cases = caseMap.get(districtName.toLowerCase()) || {};

          return {
            uid: feature.properties.shapeID || districtName,
            districtName: districtName,
            name: districtName,
            geometry: feature.geometry,
            totalCases: cases.totalCases || 0,
            diseaseTypes: cases.diseaseTypes || 0,
            facilitiesReporting: cases.facilitiesReporting || 0,
          };
        });

        setHeatmapData(combinedData);
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
  }, [filters.startDate, filters.endDate, filters.disease, filters.location]);

  // Initialize map
  useEffect(() => {
    if (map.current || !mapboxToken || !mapContainer.current) return; // Initialize map only once

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [-11.7799, 8.4606], // Sierra Leone center
        zoom: 7,
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
  }, [mapboxToken]);

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
      if (map.current.getLayer("district-fills")) {
        map.current.removeLayer("district-fills");
      }
      if (map.current.getLayer("district-borders")) {
        map.current.removeLayer("district-borders");
      }
      if (map.current.getSource("districts")) {
        map.current.removeSource("districts");
      }

      // Create GeoJSON feature collection
      const geojson = {
        type: "FeatureCollection",
        features: heatmapData
          .filter((d) => d.geometry)
          .map((district) => ({
            type: "Feature",
            properties: {
              uid: district.uid,
              name: district.districtName || district.name,
              totalCases: district.totalCases || 0,
              diseaseTypes: district.diseaseTypes || 0,
              facilitiesReporting: district.facilitiesReporting || 0,
            },
            geometry: district.geometry,
          })),
      };

      // Add source
      map.current.addSource("districts", {
        type: "geojson",
        data: geojson,
      });

      // Calculate max cases for color scaling
      const maxCases = Math.max(...heatmapData.map((d) => d.totalCases || 0), 1);

      // Add fill layer with pastel RdYlGn color scheme
      map.current.addLayer({
        id: "district-fills",
        type: "fill",
        source: "districts",
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "totalCases"],
            0,
            "#d4edda", // Pastel green (low)
            maxCases * 0.25,
            "#fff3cd", // Pastel yellow-green
            maxCases * 0.5,
            "#ffe5a0", // Pastel yellow
            maxCases * 0.75,
            "#ffc9a0", // Pastel orange
            maxCases,
            "#ffb3b3", // Pastel red (high)
          ],
          "fill-opacity": 0.75,
        },
      });

      // Add border layer
      map.current.addLayer({
        id: "district-borders",
        type: "line",
        source: "districts",
        paint: {
          "line-color": "#64748b", // Neutral slate gray
          "line-width": 2,
        },
      });

      // Add popup on click
      map.current.on("click", "district-fills", (e) => {
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
      });

      // Change cursor on hover
      map.current.on("mouseenter", "district-fills", () => {
        map.current.getCanvas().style.cursor = "pointer";
      });

      map.current.on("mouseleave", "district-fills", () => {
        map.current.getCanvas().style.cursor = "";
      });

      // Fit bounds to show all districts
      if (geojson.features.length > 0) {
        const bounds = geojson.features.reduce(
          (bounds, feature) => {
            if (feature.geometry.type === "Polygon") {
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
        <h3 className="font-semibold text-sm mb-3">Case Distribution by District</h3>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">Low</span>
          <div className="flex-1 h-4 rounded-md bg-gradient-to-r from-[#d4edda] via-[#fff3cd] via-[#ffe5a0] via-[#ffc9a0] to-[#ffb3b3]"></div>
          <span className="text-xs text-muted-foreground">High</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Click on a district to view detailed information
        </p>
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
      </div>

      {/* Summary Stats */}
      {heatmapData && heatmapData.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Districts</p>
            <p className="text-2xl font-bold">{heatmapData.length}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Cases</p>
            <p className="text-2xl font-bold">
              {heatmapData.reduce((sum, d) => sum + (d.totalCases || 0), 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-xs text-muted-foreground mb-1">Active Facilities</p>
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
