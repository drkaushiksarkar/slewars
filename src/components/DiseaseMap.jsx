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

const DiseaseMap = () => {
  const { toast } = useToast();
  const { countryConfig } = useCountry();
  const { translate } = useLanguage();
  const { overview } = useDashboardData();

  const [viewState, setViewState] = React.useState({
    longitude: -11.7799,
    latitude: 8.4606,
    zoom: 7
  });
  const [geojson, setGeojson] = React.useState(null);
  const [hoverInfo, setHoverInfo] = React.useState(null);
  const [isLoadingBoundary, setIsLoadingBoundary] = React.useState(true);

  React.useEffect(() => {
    if (!countryConfig?.map) return;
    setViewState({
      longitude: countryConfig.map.center[0],
      latitude: countryConfig.map.center[1],
      zoom: countryConfig.map.zoom
    });
  }, [countryConfig]);

  React.useEffect(() => {
    let isMounted = true;
    setIsLoadingBoundary(true);
    apiClient
      .get(GEOJSON_ENDPOINT)
      .then((data) => {
        if (isMounted) {
          setGeojson(data);
        }
      })
      .catch((error) => {
        if (isMounted) {
          toast({
            title: "Boundary data error",
            description: error.message,
            variant: "destructive"
          });
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingBoundary(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [toast]);

  const normalizeRegionName = React.useCallback((name = "") => {
    return name.toLowerCase().replace(/province|area|region/gi, "").replace(/\s+/g, "").trim();
  }, []);

  const decoratedGeojson = React.useMemo(() => {
    if (!geojson) return null;
    const regionStats = overview?.alertStats?.byRegion || {};
    const maxValue =
      Object.values(regionStats).reduce((max, value) => Math.max(max, value), 0) || 1;

    return {
      ...geojson,
      features: geojson.features.map((feature) => {
        const shapeName = feature?.properties?.shapeName || "";
        const normalized = normalizeRegionName(shapeName);
        const matchedEntry = Object.entries(regionStats).find(
          ([regionName]) => normalizeRegionName(regionName) === normalized
        );
        const cases = matchedEntry ? matchedEntry[1] : 0;
        const riskValue = cases / maxValue;
        const riskLabel =
          riskValue >= 0.66 ? "High" : riskValue >= 0.33 ? "Medium" : "Low";

        return {
          ...feature,
          properties: {
            ...feature.properties,
            cases,
            riskValue,
            riskLabel
          }
        };
      })
    };
  }, [geojson, overview, normalizeRegionName]);

  const fillLayer = React.useMemo(
    () => ({
      id: "sle-adm1-fill",
      type: "fill",
      paint: {
        "fill-color": [
          "interpolate",
          ["linear"],
          ["get", "riskValue"],
          0,
          "#bfdbfe",
          0.5,
          "#60a5fa",
          1,
          "#1d4ed8"
        ],
        "fill-opacity": 0.6
      }
    }),
    []
  );

  const outlineLayer = React.useMemo(
    () => ({
      id: "sle-adm1-outline",
      type: "line",
      paint: {
        "line-color": "#1d4ed8",
        "line-width": 1.5
      }
    }),
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{translate("diseaseMap")}</h2>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>{translate("filter")}</span>
          </Button>
        </div>
      </div>

      <div className="relative h-[500px] bg-muted rounded-lg overflow-hidden">
        {MAPBOX_TOKEN ? (
          <Map
            {...viewState}
            interactiveLayerIds={["sle-adm1-fill"]}
            onMove={(evt) => setViewState(evt.viewState)}
            onMouseMove={(event) => {
              const feature = event.features && event.features[0];
              if (feature) {
                setHoverInfo({
                  longitude: event.lngLat.lng,
                  latitude: event.lngLat.lat,
                  name: feature.properties?.shapeName,
                  risk: feature.properties?.riskLabel,
                  cases: feature.properties?.cases ?? 0
                });
              } else {
                setHoverInfo(null);
              }
            }}
            mapStyle="mapbox://styles/mapbox/light-v11"
            mapboxAccessToken={MAPBOX_TOKEN}
          >
            {decoratedGeojson && (
              <Source id="sle-adm1" type="geojson" data={decoratedGeojson}>
                <Layer {...fillLayer} />
                <Layer {...outlineLayer} />
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
          </div>
        )}

        {isLoadingBoundary && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Loading Sierra Leone boundaries...
          </div>
        )}

        {/* Map Legend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm p-4 rounded-lg shadow-lg"
        >
          <h3 className="font-semibold mb-2">{translate("legend")}</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-[#1d4ed8]"></div>
              <span className="text-sm">{translate("highRisk")}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-[#60a5fa]"></div>
              <span className="text-sm">{translate("mediumRisk")}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-[#bfdbfe]"></div>
              <span className="text-sm">{translate("lowRisk")}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DiseaseMap;
