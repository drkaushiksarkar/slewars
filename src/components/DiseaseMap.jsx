import React from "react";
import { motion } from "framer-motion";
import Map, { Source, Layer } from "react-map-gl";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useCountry } from "@/contexts/CountryContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import { apiClient } from "@/lib/api";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";
const GEOJSON_ENDPOINT = "/data/geojson/sierra-leone";

const DiseaseMap = ({
  heatmapData = [],
  selectedDisease = "all",
  timeRange = "7d",
  adminLevel = 2,
  isLoading = false
}) => {
  const { toast } = useToast();
  const { countryConfig } = useCountry();
  const { translate } = useLanguage();

  const [viewState, setViewState] = React.useState({
    longitude: -11.7799,
    latitude: 8.4606,
    zoom: adminLevel === 2 ? 7 : adminLevel === 3 ? 8 : 9
  });
  const [hoverInfo, setHoverInfo] = React.useState(null);
  const [mapError, setMapError] = React.useState(null);

  React.useEffect(() => {
    if (!countryConfig?.map) return;
    setViewState({
      longitude: countryConfig.map.center[0],
      latitude: countryConfig.map.center[1],
      zoom: countryConfig.map.zoom
    });
  }, [countryConfig]);

  // Update zoom level when admin level changes
  React.useEffect(() => {
    setViewState(prev => ({
      ...prev,
      zoom: adminLevel === 2 ? 7 : adminLevel === 3 ? 8 : 9
    }));
  }, [adminLevel]);

  // Build GeoJSON from heatmap data - separate polygons and points
  const { polygonGeojson, pointGeojson } = React.useMemo(() => {
    try {
      setMapError(null);

      if (!heatmapData || heatmapData.length === 0) {
        return { polygonGeojson: null, pointGeojson: null };
      }

      const maxValue = Math.max(...heatmapData.map(d => d.totalCases), 1);

      const polygonFeatures = [];
      const pointFeatures = [];

      heatmapData.forEach((location, index) => {
        if (!location.geometry) return;

        try {
          const riskValue = location.totalCases / maxValue;
          const riskLabel =
            riskValue >= 0.66 ? "High" : riskValue >= 0.33 ? "Medium" : "Low";

          const properties = {
            uid: location.uid,
            shapeName: location.districtName,
            cases: location.totalCases,
            riskValue,
            riskLabel,
            diseaseTypes: location.diseaseTypes,
            facilitiesReporting: location.facilitiesReporting,
            dominantDisease: location.dominantDisease,
          };

          const feature = {
            type: "Feature",
            properties,
            geometry: location.geometry,
          };

          // Separate by geometry type
          const geometryType = location.geometry.type;
          if (geometryType === 'Point') {
            pointFeatures.push(feature);
          } else if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
            polygonFeatures.push(feature);
          }
        } catch (err) {
          console.error(`Error processing location ${index}:`, err, location);
        }
      });

      console.log(`Processed ${polygonFeatures.length} polygons, ${pointFeatures.length} points for admin level ${adminLevel}`);

      return {
        polygonGeojson: polygonFeatures.length > 0 ? {
          type: "FeatureCollection",
          features: polygonFeatures,
        } : null,
        pointGeojson: pointFeatures.length > 0 ? {
          type: "FeatureCollection",
          features: pointFeatures,
        } : null,
      };
    } catch (err) {
      console.error('Error building GeoJSON:', err);
      setMapError(err.message);
      return { polygonGeojson: null, pointGeojson: null };
    }
  }, [heatmapData, adminLevel]);

  const fillLayer = React.useMemo(
    () => ({
      id: `sle-adm${adminLevel}-fill`,
      type: "fill",
      paint: {
        "fill-color": [
          "interpolate",
          ["linear"],
          ["get", "riskValue"],
          0,
          "#d1fae5",  // Pastel green (low risk)
          0.5,
          "#fef3c7",  // Pastel yellow (medium risk)
          1,
          "#fecaca"   // Pastel red (high risk)
        ],
        "fill-opacity": 0.7
      }
    }),
    [adminLevel]
  );

  const outlineLayer = React.useMemo(
    () => ({
      id: `sle-adm${adminLevel}-outline`,
      type: "line",
      paint: {
        "line-color": "#94a3b8",  // Muted gray outline
        "line-width": 1.5
      }
    }),
    [adminLevel]
  );

  // Circle layer for point geometries (facilities and locations with point data)
  const circleLayer = React.useMemo(
    () => ({
      id: `sle-adm${adminLevel}-circle`,
      type: "circle",
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["get", "cases"],
          0,
          3,      // Min size: 3px for 0-1 cases (very small)
          25,
          10,     // 10px for 25 cases
          50,
          15,     // 15px for 50 cases
          100,
          22,     // 22px for 100 cases
          150,
          28,     // 28px for 150 cases
          200,
          35,     // 35px for 200 cases
          300,
          45      // Max size: 45px for 300+ cases (very large)
        ],
        "circle-color": [
          "interpolate",
          ["linear"],
          ["get", "riskValue"],
          0,
          "#d1fae5",  // Pastel green (low risk)
          0.5,
          "#fef3c7",  // Pastel yellow (medium risk)
          1,
          "#fecaca"   // Pastel red (high risk)
        ],
        "circle-opacity": 0.75,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#94a3b8"  // Muted gray stroke
      }
    }),
    [adminLevel]
  );

  return (
    <div className="relative w-full h-full bg-muted rounded-lg overflow-hidden">
        {mapError && (
          <div className="absolute top-4 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
            <strong className="font-bold">Map Error: </strong>
            <span className="block sm:inline">{mapError}</span>
          </div>
        )}

        {MAPBOX_TOKEN ? (
          <Map
            key={`map-adm${adminLevel}`}
            {...viewState}
            interactiveLayerIds={[
              `sle-adm${adminLevel}-fill`,
              `sle-adm${adminLevel}-circle`
            ]}
            onMove={(evt) => setViewState(evt.viewState)}
            onError={(evt) => {
              console.error('Mapbox error:', evt.error);
              setMapError(evt.error?.message || 'Map rendering error');
            }}
            onMouseMove={(event) => {
              const feature = event.features && event.features[0];
              if (feature) {
                setHoverInfo({
                  longitude: event.lngLat.lng,
                  latitude: event.lngLat.lat,
                  name: feature.properties?.shapeName,
                  risk: feature.properties?.riskLabel,
                  cases: feature.properties?.cases ?? 0,
                  dominantDisease: feature.properties?.dominantDisease,
                  facilitiesReporting: feature.properties?.facilitiesReporting
                });
              } else {
                setHoverInfo(null);
              }
            }}
            mapStyle="mapbox://styles/mapbox/light-v11"
            mapboxAccessToken={MAPBOX_TOKEN}
          >
            {/* Render polygon/multipolygon features */}
            {polygonGeojson && (
              <Source id={`sle-adm${adminLevel}-polygon`} type="geojson" data={polygonGeojson}>
                <Layer {...fillLayer} />
                <Layer {...outlineLayer} />
              </Source>
            )}

            {/* Render point features */}
            {pointGeojson && (
              <Source id={`sle-adm${adminLevel}-point`} type="geojson" data={pointGeojson}>
                <Layer {...circleLayer} />
              </Source>
            )}
          </Map>
        ) : (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            Add <code className="mx-1 rounded bg-muted px-1">VITE_MAPBOX_TOKEN</code> to your
            environment to view the interactive map.
          </div>
        )}

        {hoverInfo && (
          <div className="absolute top-4 left-4 rounded-lg bg-background/90 p-3 shadow-lg text-sm">
            <p className="font-semibold">{hoverInfo.name}</p>
            <p>Risk: {hoverInfo.risk}</p>
            <p>Cases: {hoverInfo.cases}</p>
            {hoverInfo.dominantDisease && (
              <p>Dominant: {hoverInfo.dominantDisease}</p>
            )}
            {hoverInfo.facilitiesReporting > 0 && (
              <p>Facilities: {hoverInfo.facilitiesReporting}</p>
            )}
          </div>
        )}

        {(!heatmapData || heatmapData.length === 0) && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground bg-muted/50">
            No data available for selected filters
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground bg-muted/50">
            Loading map data...
          </div>
        )}

      {/* Map Legend */}
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
    </div>
  );
};

export default DiseaseMap;
