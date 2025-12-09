import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Map, { Source, Layer } from 'react-map-gl';
import axios from 'axios';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export default function ForecastHeatmap({ forecast, selectedLocation, selectedDisease }) {
  const [viewState, setViewState] = useState({
    longitude: -11.7799,
    latitude: 8.8,
    zoom: 6.2
  });
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [locations, setLocations] = useState([]);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [locationForecasts, setLocationForecasts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all district locations with geometry
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await axios.get('http://localhost:4000/api/locations?level=2');
        if (response.data.success) {
          setLocations(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };
    fetchLocations();
  }, []);

  // Fetch forecasts for all locations
  useEffect(() => {
    const fetchAllForecasts = async () => {
      if (!forecast || locations.length === 0 || !selectedDisease) return;

      setLoading(true);
      try {
        // Use the selected disease
        const disease = selectedDisease;

        // Fetch forecasts for all district locations
        const forecastPromises = locations.map(async (location) => {
          try {
            const response = await axios.get(
              `http://localhost:4000/api/forecast/${encodeURIComponent(disease)}/${location.uid}`
            );
            if (response.data.success && response.data.data) {
              return {
                locationUid: location.uid,
                locationName: location.name,
                geometry: location.geometry,
                predictions: response.data.data.predictions
              };
            }
          } catch (error) {
            console.log(`No forecast for ${location.name}`);
          }
          return null;
        });

        const results = await Promise.all(forecastPromises);
        const validForecasts = results.filter(f => f !== null);
        setLocationForecasts(validForecasts);
      } catch (error) {
        console.error('Error fetching location forecasts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllForecasts();
  }, [forecast, locations, selectedDisease]);

  // Get the current week's data for all locations
  const currentWeekData = useMemo(() => {
    if (!locationForecasts.length || !forecast?.predictions?.[currentWeekIndex]) return null;

    const currentDate = forecast.predictions[currentWeekIndex].date;

    return locationForecasts.map(locForecast => {
      // Find prediction for current week
      const prediction = locForecast.predictions?.find(p => p.date === currentDate) ||
                         locForecast.predictions?.[currentWeekIndex];

      if (!prediction || !locForecast.geometry) return null;

      return {
        locationUid: locForecast.locationUid,
        locationName: locForecast.locationName,
        geometry: locForecast.geometry,
        predicted_cases: prediction.predicted_cases,
        upper_bound: prediction.upper_bound,
        lower_bound: prediction.lower_bound,
        risk_level: prediction.risk_level,
        uncertainty: prediction.upper_bound - prediction.lower_bound,
        date: prediction.date
      };
    }).filter(d => d !== null);
  }, [locationForecasts, currentWeekIndex, forecast]);

  // Create GeoJSON for map
  const { polygonGeojson, pointGeojson } = useMemo(() => {
    if (!currentWeekData || currentWeekData.length === 0) {
      return { polygonGeojson: null, pointGeojson: null };
    }

    const maxCases = Math.max(...currentWeekData.map(d => d.predicted_cases), 1);
    const maxUncertainty = Math.max(...currentWeekData.map(d => d.uncertainty), 1);

    const polygonFeatures = [];
    const pointFeatures = [];

    currentWeekData.forEach(location => {
      if (!location.geometry) return;

      const properties = {
        uid: location.locationUid,
        name: location.locationName,
        cases: location.predicted_cases,
        upperBound: location.upper_bound,
        lowerBound: location.lower_bound,
        uncertainty: location.uncertainty,
        riskLevel: location.risk_level,
        riskValue: location.predicted_cases / maxCases,
        uncertaintyValue: location.uncertainty / maxUncertainty,
      };

      const feature = {
        type: 'Feature',
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
    });

    return {
      polygonGeojson: polygonFeatures.length > 0 ? {
        type: 'FeatureCollection',
        features: polygonFeatures,
      } : null,
      pointGeojson: pointFeatures.length > 0 ? {
        type: 'FeatureCollection',
        features: pointFeatures,
      } : null,
    };
  }, [currentWeekData]);

  // Map layers configuration
  const fillLayer = {
    id: 'forecast-fill',
    type: 'fill',
    paint: {
      'fill-color': [
        'interpolate',
        ['linear'],
        ['get', 'riskValue'],
        0, '#10b981',  // Low
        0.5, '#f59e0b', // Medium
        1, '#ef4444'    // High
      ],
      'fill-opacity': 0.6
    }
  };

  const outlineLayer = {
    id: 'forecast-outline',
    type: 'line',
    paint: {
      'line-color': '#1e293b',
      'line-width': 2,
      'line-opacity': 0.8
    }
  };

  // Circle layer for bubbles - size represents cases, border represents uncertainty
  const circleLayer = {
    id: 'forecast-circles',
    type: 'circle',
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['get', 'cases'],
        0, 8,
        50, 15,
        100, 25,
        200, 35,
        500, 50
      ],
      'circle-color': [
        'interpolate',
        ['linear'],
        ['get', 'riskValue'],
        0, '#10b981',
        0.5, '#f59e0b',
        1, '#ef4444'
      ],
      'circle-opacity': 0.7,
      // Uncertainty shown as border width
      'circle-stroke-width': [
        'interpolate',
        ['linear'],
        ['get', 'uncertaintyValue'],
        0, 2,
        0.5, 4,
        1, 7
      ],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-opacity': 0.8
    }
  };

  const handlePrevWeek = () => {
    setCurrentWeekIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekIndex(prev =>
      Math.min((forecast?.predictions?.length || 1) - 1, prev + 1)
    );
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full items-center justify-center text-center text-sm text-gray-500">
        Add <code className="mx-1 rounded bg-gray-100 px-2 py-1">VITE_MAPBOX_TOKEN</code> to your
        environment to view the interactive map.
      </div>
    );
  }

  if (!forecast?.predictions || forecast.predictions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        No forecast data available
      </div>
    );
  }

  const currentPrediction = forecast.predictions[currentWeekIndex];

  return (
    <div className="relative w-full h-[450px]">
      {/* Week Navigation Controls */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg border border-gray-200 px-6 py-3"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrevWeek}
              disabled={currentWeekIndex === 0}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous Week"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="text-center min-w-[200px]">
              <div className="text-sm font-semibold text-gray-900">
                Week {currentWeekIndex + 1} of {forecast.predictions.length}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {new Date(currentPrediction.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
            </div>

            <button
              onClick={handleNextWeek}
              disabled={currentWeekIndex === forecast.predictions.length - 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next Week"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Map */}
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        interactiveLayerIds={['forecast-fill', 'forecast-circles']}
        onMouseMove={(event) => {
          const feature = event.features && event.features[0];
          if (feature) {
            setHoverInfo({
              longitude: event.lngLat.lng,
              latitude: event.lngLat.lat,
              name: feature.properties?.name,
              cases: feature.properties?.cases,
              upperBound: feature.properties?.upperBound,
              lowerBound: feature.properties?.lowerBound,
              riskLevel: feature.properties?.riskLevel,
              uncertainty: feature.properties?.uncertainty
            });
          } else {
            setHoverInfo(null);
          }
        }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        {/* Polygon layers */}
        {polygonGeojson && (
          <Source id="forecast-polygons" type="geojson" data={polygonGeojson}>
            <Layer {...fillLayer} />
            <Layer {...outlineLayer} />
          </Source>
        )}

        {/* Point layers (bubbles) */}
        {pointGeojson && (
          <Source id="forecast-points" type="geojson" data={pointGeojson}>
            <Layer {...circleLayer} />
          </Source>
        )}
      </Map>

      {/* Hover tooltip */}
      {hoverInfo && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-24 left-4 rounded-xl bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-md p-4 shadow-2xl border border-slate-700/50 text-sm max-w-xs"
        >
          <p className="font-bold text-white text-base mb-2">{hoverInfo.name}</p>
          <div className="space-y-2 text-slate-200">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Predicted Cases:</span>
              <span className="font-bold text-lg">{Math.round(hoverInfo.cases)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Risk Level:</span>
              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${
                hoverInfo.riskLevel === 'HIGH' ? 'bg-red-500 text-white' :
                hoverInfo.riskLevel === 'MEDIUM' ? 'bg-yellow-500 text-white' :
                'bg-green-500 text-white'
              }`}>
                {hoverInfo.riskLevel}
              </span>
            </div>
            <div className="border-t border-slate-600 pt-2 mt-2">
              <div className="text-xs text-slate-400 mb-1">95% Confidence Interval:</div>
              <div className="flex items-center justify-between text-xs">
                <span>{Math.round(hoverInfo.lowerBound)}</span>
                <span className="text-slate-500">to</span>
                <span>{Math.round(hoverInfo.upperBound)}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Uncertainty: ±{Math.round(hoverInfo.uncertainty / 2)} cases
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute bottom-4 right-4 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-md p-5 rounded-xl shadow-2xl border border-slate-700/50"
      >
        <h3 className="font-bold mb-3 text-sm text-white">
          Forecast Legend
        </h3>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-slate-400 mb-2">Risk Levels</div>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-[#ef4444] border-2 border-white rounded shadow-lg"></div>
                <span className="text-sm font-medium text-slate-200">High Risk</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-[#f59e0b] border-2 border-white rounded shadow-lg"></div>
                <span className="text-sm font-medium text-slate-200">Medium Risk</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-[#10b981] border-2 border-white rounded shadow-lg"></div>
                <span className="text-sm font-medium text-slate-200">Low Risk</span>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-3">
            <div className="text-xs text-slate-400 mb-2">Visualization</div>
            <div className="space-y-1 text-xs text-slate-300">
              <div>• Bubble size = predicted cases</div>
              <div>• Border thickness = uncertainty</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-sm text-gray-700">Loading forecast data...</p>
          </div>
        </div>
      )}
    </div>
  );
}
