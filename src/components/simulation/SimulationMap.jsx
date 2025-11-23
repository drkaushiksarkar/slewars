import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Map, { Source, Layer, Marker, Popup } from "react-map-gl";
import { MapPin, Activity, TrendingUp } from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";

// Regional simulation data generator
const generateRegionalData = (regions, currentDay, disease, selectedRegion) => {
  return regions.map((region, index) => {
    // Only show active spread if simulation is for this region or all regions
    const isActive = selectedRegion === "all" || selectedRegion === (region.id || region.name);

    if (!isActive) {
      return {
        ...region,
        infected: 0,
        severity: 0,
        spread: false
      };
    }

    // Simulate spread pattern based on day (staggered by region)
    const dayOffset = index * 5; // Each region starts 5 days later
    const effectiveDay = Math.max(0, currentDay - dayOffset);

    // Logistic growth curve for infections
    const maxInfected = 1000 + Math.random() * 500;
    const growthRate = 0.15;
    const infected = Math.floor(
      maxInfected / (1 + Math.exp(-growthRate * (effectiveDay - 20)))
    );

    // Calculate severity (0-100)
    const peakDay = 25;
    const severity = Math.min(100, Math.max(0,
      100 * Math.exp(-Math.pow(effectiveDay - peakDay, 2) / 200)
    ));

    return {
      ...region,
      infected: effectiveDay > 0 ? infected : 0,
      severity: effectiveDay > 0 ? severity : 0,
      spread: effectiveDay > 0,
      coords: region.coordinates || getDefaultCoordinates(region.name)
    };
  });
};

// Default coordinates for Sierra Leone regions
const getDefaultCoordinates = (regionName) => {
  const coords = {
    "Eastern": [-11.1, 8.0],
    "Northern": [-12.5, 9.0],
    "North Western": [-12.8, 8.8],
    "Southern": [-11.9, 7.5],
    "Western Area": [-13.2, 8.5]
  };
  return coords[regionName] || [-11.7799, 8.4606];
};

const SimulationMap = ({ currentDay, disease, regions, selectedRegion, isRunning }) => {
  const [viewState, setViewState] = useState({
    longitude: -11.7799,
    latitude: 8.4606,
    zoom: 6.5
  });

  const [selectedMarker, setSelectedMarker] = useState(null);
  const [mapStyle, setMapStyle] = useState("mapbox://styles/mapbox/light-v11");
  const [mapError, setMapError] = useState(false);

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoicmlzaGFiaGRldiIsImEiOiJjbTUwbnVwN2UwMmJ2MnRzOWp3eDc4ajJjIn0.wP7ckj0FJe_SqH9S4nvSIQ";

  // Generate regional simulation data - MUST be before any conditional returns
  const regionalData = useMemo(() => {
    if (!regions || regions.length === 0) return [];
    return generateRegionalData(regions, currentDay, disease, selectedRegion);
  }, [regions, currentDay, disease, selectedRegion]);

  // Create heatmap circles for each region - MUST be before any conditional returns
  const heatmapFeatures = useMemo(() => {
    if (!regionalData || regionalData.length === 0) {
      return {
        type: "FeatureCollection",
        features: []
      };
    }
    return {
      type: "FeatureCollection",
      features: regionalData
        .filter(r => r.spread && r.infected > 0)
        .map(region => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: region.coords
          },
          properties: {
            infected: region.infected,
            severity: region.severity,
            name: region.name
          }
        }))
    };
  }, [regionalData]);

  // Validate that we have regions - AFTER all hooks
  if (!regions || regions.length === 0) {
    return (
      <div className="w-full h-[600px] rounded-lg border-2 border-border bg-muted/20 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading location data...</p>
        </div>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="w-full h-[600px] rounded-lg border-2 border-border bg-muted/20 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium mb-2">Map Unavailable</p>
          <p className="text-xs text-muted-foreground">
            The geographic visualization could not be loaded. Please check your internet connection or Mapbox configuration.
          </p>
        </div>
      </div>
    );
  }

  // Heatmap layer style
  const heatmapLayer = {
    id: "disease-heatmap",
    type: "circle",
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["get", "infected"],
        0, 10,
        500, 30,
        1000, 50
      ],
      "circle-color": [
        "interpolate",
        ["linear"],
        ["get", "severity"],
        0, "#fee5d9",
        25, "#fcae91",
        50, "#fb6a4a",
        75, "#de2d26",
        100, "#a50f15"
      ],
      "circle-opacity": 0.6,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#fff",
      "circle-blur": 0.5
    }
  };

  // Pulse animation layer
  const pulseLayer = {
    id: "disease-pulse",
    type: "circle",
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["get", "infected"],
        0, 15,
        500, 40,
        1000, 60
      ],
      "circle-color": disease.color,
      "circle-opacity": isRunning ? 0.3 : 0,
      "circle-stroke-width": 0
    }
  };

  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden border-2 border-border">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle={mapStyle}
        mapboxAccessToken={mapboxToken}
        style={{ width: "100%", height: "100%" }}
        onError={(e) => {
          console.error("Map error:", e);
          setMapError(true);
        }}
      >
        {/* Heatmap visualization */}
        {heatmapFeatures.features.length > 0 && (
          <Source type="geojson" data={heatmapFeatures}>
            <Layer {...pulseLayer} />
            <Layer {...heatmapLayer} />
          </Source>
        )}

        {/* Region markers */}
        {regionalData.map((region, index) => {
          if (!region.coords || region.infected === 0) return null;

          return (
            <Marker
              key={region.id || region.name}
              longitude={region.coords[0]}
              latitude={region.coords[1]}
              anchor="bottom"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="cursor-pointer"
                onClick={() => setSelectedMarker(region)}
              >
                <div className="relative">
                  {/* Pulsing ring animation */}
                  {isRunning && region.spread && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{
                        backgroundColor: disease.color,
                        width: "40px",
                        height: "40px",
                        top: "-20px",
                        left: "-20px"
                      }}
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 0, 0.5]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  )}

                  {/* Main marker */}
                  <div
                    className="w-8 h-8 rounded-full border-3 border-white shadow-lg flex items-center justify-center"
                    style={{
                      backgroundColor: disease.color,
                      opacity: region.severity / 100
                    }}
                  >
                    <Activity className="h-4 w-4 text-white" />
                  </div>
                </div>
              </motion.div>
            </Marker>
          );
        })}

        {/* Popup with region details */}
        {selectedMarker && (
          <Popup
            longitude={selectedMarker.coords[0]}
            latitude={selectedMarker.coords[1]}
            anchor="top"
            onClose={() => setSelectedMarker(null)}
            closeButton={true}
            closeOnClick={false}
          >
            <div className="p-2 min-w-[200px]">
              <h3 className="font-semibold text-sm mb-2 flex items-center space-x-2">
                <MapPin className="h-4 w-4" style={{ color: disease.color }} />
                <span>{selectedMarker.name}</span>
              </h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Cases:</span>
                  <span className="font-medium">{selectedMarker.infected}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Severity:</span>
                  <span
                    className="font-medium"
                    style={{
                      color: selectedMarker.severity > 75 ? "#ef4444" :
                             selectedMarker.severity > 50 ? "#f59e0b" :
                             selectedMarker.severity > 25 ? "#eab308" : "#10b981"
                    }}
                  >
                    {Math.round(selectedMarker.severity)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium flex items-center space-x-1">
                    {selectedMarker.spread ? (
                      <>
                        <TrendingUp className="h-3 w-3 text-red-500" />
                        <span className="text-red-500">Active</span>
                      </>
                    ) : (
                      <span className="text-green-500">Clear</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
        <h4 className="text-xs font-semibold mb-2">Disease Intensity</h4>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#fee5d9" }} />
            <span className="text-xs">Low (0-25%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#fcae91" }} />
            <span className="text-xs">Moderate (25-50%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#fb6a4a" }} />
            <span className="text-xs">High (50-75%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#de2d26" }} />
            <span className="text-xs">Severe (75-100%)</span>
          </div>
        </div>
      </div>

      {/* Map Style Toggle */}
      <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg">
        <select
          className="px-3 py-2 text-xs font-medium bg-transparent border-none outline-none cursor-pointer"
          value={mapStyle}
          onChange={(e) => setMapStyle(e.target.value)}
        >
          <option value="mapbox://styles/mapbox/light-v11">Light</option>
          <option value="mapbox://styles/mapbox/dark-v11">Dark</option>
          <option value="mapbox://styles/mapbox/streets-v12">Streets</option>
          <option value="mapbox://styles/mapbox/satellite-streets-v12">Satellite</option>
        </select>
      </div>

      {/* Live indicator */}
      {isRunning && (
        <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full flex items-center space-x-2 shadow-lg">
          <motion.div
            className="w-2 h-2 bg-white rounded-full"
            animate={{
              opacity: [1, 0.3, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <span className="text-xs font-semibold">LIVE SIMULATION</span>
        </div>
      )}

      {/* Day counter on map */}
      <div className="absolute bottom-4 right-4 bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Simulation Day</p>
          <p className="text-2xl font-bold" style={{ color: disease.color }}>{currentDay}</p>
        </div>
      </div>
    </div>
  );
};

export default SimulationMap;
