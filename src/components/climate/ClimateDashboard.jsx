import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Thermometer, CloudRain, Droplet, TrendingDown, TrendingUp } from 'lucide-react';
import { useClimateData, useClimateStatistics } from '../../hooks/useClimateData';
import { useCurrentWeather } from '../../hooks/useCurrentWeather';
import UnifiedTrendChart from './UnifiedTrendChart';
import ClimateSankeyDiagram from './ClimateSankeyDiagram';
import { apiClient } from '@/lib/api';

/**
 * WeatherCard - Reusable card component for weather metrics
 */
const WeatherCard = ({ icon: Icon, label, value, unit, trend, trendValue, bgColor, textColor, minMax }) => (
  <div className={`${bgColor} rounded-lg overflow-hidden h-full min-h-[120px] cursor-pointer`}>
    <div className={`flex flex-col items-center justify-center h-full p-3 ${textColor}`}>
      <Icon className="h-8 w-8 mb-2" />
      <span className="text-xs font-semibold mb-1">{label}</span>
      <span className="text-xl font-bold">{value}{unit}</span>
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-xs opacity-80">
          {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span>{trendValue}</span>
        </div>
      )}
      {minMax && (
        <div className="mt-2 text-xs opacity-70">
          {minMax}
        </div>
      )}
    </div>
  </div>
);

/**
 * ClimateDashboard - Main climate data visualization component
 * @param {string} locationUid - DHIS2 location UID (default: Bo District)
 * @param {string} locationName - Location name for display
 * @param {string} period - Time period for data
 * @param {string} aggregation - Data aggregation level
 */
const ClimateDashboard = ({
  locationUid = 'O6uvpzGd5pu',
  locationName = 'Bo District',
  period = '365',
  aggregation = 'week'
}) => {
  // State for diseases and selected disease
  const [diseasesByCategory, setDiseasesByCategory] = useState({});
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [diseaseData, setDiseaseData] = useState([]);
  const [allDiseasesData, setAllDiseasesData] = useState([]); // For multi-level Sankey
  const [loadingDiseases, setLoadingDiseases] = useState(true);
  const [loadingDiseaseData, setLoadingDiseaseData] = useState(false);
  const [loadingAllDiseases, setLoadingAllDiseases] = useState(false);

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }, [period]);

  // Fetch current weather
  const { data: currentWeather, loading: currentWeatherLoading } = useCurrentWeather(locationName);

  // Fetch historical data
  const { data: climateData, loading, error } = useClimateData(
    locationUid,
    dateRange.startDate,
    dateRange.endDate,
    aggregation
  );

  const { stats, loading: statsLoading } = useClimateStatistics(locationUid);

  // Fetch diseases list grouped by category
  useEffect(() => {
    const fetchDiseases = async () => {
      try {
        setLoadingDiseases(true);
        const response = await apiClient.get('/diseases/categories');
        const categorizedDiseases = response.data || {};
        setDiseasesByCategory(categorizedDiseases);

        // Set default disease (malariaIDSR or first disease)
        if (Object.keys(categorizedDiseases).length > 0 && !selectedDisease) {
          // Flatten all diseases to find default
          const allDiseases = Object.values(categorizedDiseases).flat();
          const defaultDisease = allDiseases.find(d => d.id === 'malariaIDSR' || d.name === 'IDSR Malaria');
          if (defaultDisease) {
            setSelectedDisease(defaultDisease.id);
          } else if (allDiseases.length > 0) {
            setSelectedDisease(allDiseases[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching diseases:', error);
      } finally {
        setLoadingDiseases(false);
      }
    };

    fetchDiseases();
  }, []);

  // Fetch disease timeseries data when disease or location changes
  useEffect(() => {
    if (!selectedDisease) {
      setDiseaseData([]);
      return;
    }

    const fetchDiseaseData = async () => {
      try {
        setLoadingDiseaseData(true);

        // Build params for disease data with same date range as climate data
        const params = new URLSearchParams();
        params.append('startDate', dateRange.startDate);
        params.append('endDate', dateRange.endDate);
        if (locationUid && locationUid !== 'all') {
          params.append('locationUid', locationUid);
        }

        const response = await apiClient.get(`/diseases/${selectedDisease}/timeseries?${params}`);

        if (response.data) {
          setDiseaseData(response.data);
        } else {
          setDiseaseData([]);
        }
      } catch (error) {
        console.error('Error fetching disease data:', error);
        setDiseaseData([]);
      } finally {
        setLoadingDiseaseData(false);
      }
    };

    fetchDiseaseData();
  }, [selectedDisease, locationUid, dateRange.startDate, dateRange.endDate]);

  // Fetch ALL diseases data for multi-level Sankey diagram
  useEffect(() => {
    if (Object.keys(diseasesByCategory).length === 0) {
      setAllDiseasesData([]);
      return;
    }

    const fetchAllDiseasesData = async () => {
      try {
        setLoadingAllDiseases(true);

        // Get all disease IDs from diseasesByCategory
        const allDiseaseIds = Object.values(diseasesByCategory).flat().map(d => d.id);

        // Fetch data for all diseases in parallel
        const promises = allDiseaseIds.map(async (diseaseId) => {
          const params = new URLSearchParams();
          params.append('startDate', dateRange.startDate);
          params.append('endDate', dateRange.endDate);
          if (locationUid && locationUid !== 'all') {
            params.append('locationUid', locationUid);
          }

          try {
            const response = await apiClient.get(`/diseases/${diseaseId}/timeseries?${params}`);
            return response.data || [];
          } catch (error) {
            console.error(`Error fetching data for disease ${diseaseId}:`, error);
            return [];
          }
        });

        const results = await Promise.all(promises);
        const combinedData = results.flat();
        setAllDiseasesData(combinedData);
      } catch (error) {
        console.error('Error fetching all diseases data:', error);
        setAllDiseasesData([]);
      } finally {
        setLoadingAllDiseases(false);
      }
    };

    fetchAllDiseasesData();
  }, [diseasesByCategory, locationUid, dateRange.startDate, dateRange.endDate]);

  // Calculate historical averages for comparison
  const historicalMetrics = useMemo(() => {
    if (!climateData || climateData.length === 0) {
      console.log('ClimateDashboard: No climate data for historical metrics');
      return null;
    }

    console.log('ClimateDashboard: Calculating historical metrics', { dataLength: climateData.length, sample: climateData[0] });

    const temps = climateData.map(d => {
      const val = d.temperature_mean || d.avg_temperature;
      return typeof val === 'string' ? parseFloat(val) : val;
    }).filter(t => t != null && !isNaN(t));

    const precips = climateData.map(d => {
      const val = d.precipitation || d.total_precipitation;
      return typeof val === 'string' ? parseFloat(val) : val;
    }).filter(p => p != null && !isNaN(p));

    const humidities = climateData.map(d => {
      const val = d.humidity || d.avg_humidity;
      return typeof val === 'string' ? parseFloat(val) : val;
    }).filter(h => h != null && !isNaN(h));

    // Calculate standard deviations
    const avgPrecip = precips.length > 0 ? (precips.reduce((a, b) => a + b, 0) / precips.length) : 0;
    const precipVariance = precips.length > 0
      ? precips.reduce((sum, val) => sum + Math.pow(val - avgPrecip, 2), 0) / precips.length
      : 0;
    const precipStdDev = Math.sqrt(precipVariance);

    return {
      avgTemp: temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length) : 0,
      maxTemp: temps.length > 0 ? Math.max(...temps) : 0,
      minTemp: temps.length > 0 ? Math.min(...temps) : 0,
      totalPrecip: precips.length > 0 ? precips.reduce((a, b) => a + b, 0) : 0,
      avgPrecip: avgPrecip,
      precipStdDev: precipStdDev,
      maxPrecip: precips.length > 0 ? Math.max(...precips) : 0,
      minPrecip: precips.length > 0 ? Math.min(...precips) : 0,
      avgHumidity: humidities.length > 0 ? (humidities.reduce((a, b) => a + b, 0) / humidities.length) : 0,
      maxHumidity: humidities.length > 0 ? Math.max(...humidities) : 0,
      minHumidity: humidities.length > 0 ? Math.min(...humidities) : 0,
      dataPoints: climateData.length
    };
  }, [climateData]);

  // Calculate trends (difference from historical average)
  const trends = useMemo(() => {
    if (!currentWeather || !historicalMetrics) return null;

    const tempDiff = currentWeather.temperature - historicalMetrics.avgTemp;
    const humidityDiff = currentWeather.humidity - historicalMetrics.avgHumidity;
    // For rainfall, compare with average daily rainfall (total / number of data points)
    const avgDailyRainfall = historicalMetrics.totalPrecip / Math.max(1, historicalMetrics.dataPoints);
    const rainfallDiff = currentWeather.rainfall_today - avgDailyRainfall;

    return {
      temperature: {
        trend: tempDiff > 0 ? 'up' : 'down',
        value: `${Math.abs(tempDiff).toFixed(1)}°C`
      },
      rainfall: {
        trend: rainfallDiff > 0 ? 'up' : 'down',
        value: `${Math.abs(rainfallDiff).toFixed(1)} mm`
      },
      humidity: {
        trend: humidityDiff > 0 ? 'up' : 'down',
        value: `${Math.abs(humidityDiff).toFixed(1)}%`
      }
    };
  }, [currentWeather, historicalMetrics]);

  if (loading || statsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error loading climate data: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Disease Dropdown */}
      <div className="flex items-center gap-4">
        <label htmlFor="disease-select" className="text-sm font-medium text-foreground">
          Select Disease:
        </label>
        <select
          id="disease-select"
          value={selectedDisease || ''}
          onChange={(e) => setSelectedDisease(e.target.value)}
          disabled={loadingDiseases}
          className="flex-1 max-w-md rounded-md border border-input bg-background px-4 py-2 text-sm"
        >
          {loadingDiseases ? (
            <option>Loading diseases...</option>
          ) : (
            Object.entries(diseasesByCategory).map(([category, diseases]) => (
              <optgroup key={category} label={category}>
                {diseases.map((disease) => (
                  <option key={disease.id} value={disease.id}>
                    {disease.name}
                  </option>
                ))}
              </optgroup>
            ))
          )}
        </select>
      </div>

      {/* Weather Cards in Two Separate Boxes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Weather Box */}
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">Current Weather</h3>
          {currentWeatherLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : currentWeather ? (
            <div className="grid grid-cols-3 gap-4">
              {/* Current Temperature */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <WeatherCard
                  icon={Thermometer}
                  label="Temperature"
                  value={currentWeather.temperature.toFixed(1)}
                  unit="°C"
                  trend={trends?.temperature.trend}
                  trendValue={trends?.temperature.value}
                  bgColor="bg-rose-100"
                  textColor="text-rose-900"
                />
              </motion.div>

              {/* Current Rainfall */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <WeatherCard
                  icon={CloudRain}
                  label="Rainfall"
                  value={currentWeather.rainfall_today.toFixed(1)}
                  unit=" mm"
                  trend={trends?.rainfall.trend}
                  trendValue={trends?.rainfall.value}
                  bgColor="bg-blue-100"
                  textColor="text-blue-900"
                />
              </motion.div>

              {/* Current Humidity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <WeatherCard
                  icon={Droplet}
                  label="Humidity"
                  value={currentWeather.humidity.toFixed(0)}
                  unit="%"
                  trend={trends?.humidity.trend}
                  trendValue={trends?.humidity.value}
                  bgColor="bg-yellow-100"
                  textColor="text-yellow-900"
                />
              </motion.div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <p>Current weather data unavailable</p>
            </div>
          )}
        </div>

        {/* Historical Weather Box */}
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">Historical Weather</h3>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : historicalMetrics ? (
            <div className="grid grid-cols-3 gap-4">
              {/* Historical Temperature */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <WeatherCard
                  icon={Thermometer}
                  label="Avg Temperature"
                  value={historicalMetrics.avgTemp.toFixed(1)}
                  unit="°C"
                  bgColor="bg-rose-100"
                  textColor="text-rose-900"
                  minMax={`min: ${historicalMetrics.minTemp.toFixed(1)}°C | max: ${historicalMetrics.maxTemp.toFixed(1)}°C`}
                />
              </motion.div>

              {/* Historical Rainfall */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <WeatherCard
                  icon={CloudRain}
                  label="Avg Rainfall"
                  value={historicalMetrics.avgPrecip.toFixed(1)}
                  unit=" mm"
                  bgColor="bg-blue-100"
                  textColor="text-blue-900"
                  minMax={`σ: ${historicalMetrics.precipStdDev.toFixed(1)} mm | CV: ${((historicalMetrics.precipStdDev / historicalMetrics.avgPrecip) * 100).toFixed(0)}%`}
                />
              </motion.div>

              {/* Historical Humidity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <WeatherCard
                  icon={Droplet}
                  label="Avg Humidity"
                  value={historicalMetrics.avgHumidity.toFixed(0)}
                  unit="%"
                  bgColor="bg-yellow-100"
                  textColor="text-yellow-900"
                  minMax={`min: ${historicalMetrics.minHumidity.toFixed(0)}% | max: ${historicalMetrics.maxHumidity.toFixed(0)}%`}
                />
              </motion.div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <p>No historical data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Unified Trend Chart */}
      {climateData && climateData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <UnifiedTrendChart
            data={climateData}
            diseaseData={diseaseData}
            selectedDisease={Object.values(diseasesByCategory).flat().find(d => d.id === selectedDisease)}
            loadingDiseaseData={loadingDiseaseData}
            locationUid={locationUid}
          />
        </motion.div>
      )}

      {/* Climate Impact Sankey Diagram */}
      {climateData && climateData.length > 0 && !loadingAllDiseases && allDiseasesData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <ClimateSankeyDiagram
            climateData={climateData}
            diseaseData={allDiseasesData}
            diseasesByCategory={diseasesByCategory}
          />
        </motion.div>
      )}
    </div>
  );
};

export default ClimateDashboard;
