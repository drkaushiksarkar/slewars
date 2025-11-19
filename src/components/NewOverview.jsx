import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  MapPin,
  Users,
  Building2,
  Thermometer,
  CloudRain,
  Droplets,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import DiseaseBarChart from './dashboard/DiseaseBarChart';
import TimeSeriesChart from './dashboard/TimeSeriesChart';
import DiseaseMap from './DiseaseMap';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import { useCurrentWeather } from '@/hooks/useCurrentWeather';

/**
 * NewOverview - Phase 2 implementation using real DHIS2 data from Phase 1 APIs
 */
const NewOverview = () => {
  const [selectedLocation, setSelectedLocation] = React.useState('all');
  const [selectedDays, setSelectedDays] = React.useState(30);
  const [selectedDisease, setSelectedDisease] = React.useState('all');

  const {
    overview,
    diseases,
    breakdown,
    trends,
    heatmap,
    locations,
    isLoading,
    error,
    refresh,
  } = useDashboardAnalytics({
    locationUid: selectedLocation,
    days: selectedDays,
    diseaseId: selectedDisease,
  });

  // Fetch current weather data (default location: Bo)
  const { data: currentWeather, loading: weatherLoading } = useCurrentWeather('Bo');

  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-md border border-red-300 bg-red-50 p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Data</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <Button onClick={refresh} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          {/* Location Filter */}
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="flex-1 rounded-md border border-input bg-background px-4 py-2 min-w-[180px]"
            disabled={isLoading}
          >
            <option value="all">All Locations</option>
            {locations.map((location) => (
              <option key={location.uid} value={location.uid}>
                {location.name}
              </option>
            ))}
          </select>

          {/* Time Range Filter */}
          <select
            value={selectedDays}
            onChange={(e) => setSelectedDays(Number(e.target.value))}
            className="flex-1 rounded-md border border-input bg-background px-4 py-2 min-w-[150px]"
            disabled={isLoading}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
          </select>

          {/* Disease Filter */}
          <select
            value={selectedDisease}
            onChange={(e) => setSelectedDisease(e.target.value)}
            className="flex-1 rounded-md border border-input bg-background px-4 py-2 min-w-[180px]"
            disabled={isLoading}
          >
            <option value="all">All Diseases</option>
            {diseases.map((disease) => (
              <option key={disease.id} value={disease.id}>
                {disease.name}
              </option>
            ))}
          </select>
        </div>

        <Button onClick={refresh} variant="outline" size="sm" disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Combined KPI and Weather Cards Row - All 7 Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* KPI Card 1 - Total Cases */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0 }}
          className="bg-card p-3 rounded-lg border-2 border-blue-300 flex flex-col items-center justify-center min-h-[160px]"
        >
          <Activity className="h-8 w-8 text-blue-400 mb-2 flex-shrink-0" />
          <h3 className="text-xs font-medium text-muted-foreground text-center mb-1">Total Cases</h3>
          <p className="text-xl font-bold">{overview?.totalCases || 0}</p>
          {overview?.changePercent && (
            <span className="text-xs text-green-500 mt-1">+{overview.changePercent}%</span>
          )}
        </motion.div>

        {/* KPI Card 2 - Total Deaths */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-card p-3 rounded-lg border-2 border-rose-300 flex flex-col items-center justify-center min-h-[160px]"
        >
          <Users className="h-8 w-8 text-rose-400 mb-2 flex-shrink-0" />
          <h3 className="text-xs font-medium text-muted-foreground text-center mb-1">Total Deaths</h3>
          <p className="text-xl font-bold">{overview?.totalDeaths || 0}</p>
          <span className="text-xs text-muted-foreground mt-1">All diseases</span>
        </motion.div>

        {/* KPI Card 3 - High Risk Districts */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card p-3 rounded-lg border-2 border-purple-300 flex flex-col items-center justify-center min-h-[160px]"
        >
          <MapPin className="h-8 w-8 text-purple-400 mb-2 flex-shrink-0" />
          <h3 className="text-xs font-medium text-muted-foreground text-center mb-1">High Risk</h3>
          <p className="text-xl font-bold">{overview?.highRiskDistricts || 0}</p>
          <span className="text-xs text-muted-foreground mt-1">Districts</span>
        </motion.div>

        {/* KPI Card 4 - Affected Facilities */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-card p-3 rounded-lg border-2 border-green-300 flex flex-col items-center justify-center min-h-[160px]"
        >
          <Building2 className="h-8 w-8 text-green-400 mb-2 flex-shrink-0" />
          <h3 className="text-xs font-medium text-muted-foreground text-center mb-1">Affected</h3>
          <p className="text-xl font-bold">{overview?.affectedFacilities || 0}</p>
          <span className="text-xs text-muted-foreground mt-1">Facilities</span>
        </motion.div>

        {/* Weather Card 1 - Temperature */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="relative rounded-lg overflow-hidden min-h-[160px] cursor-pointer bg-rose-100"
        >
          <div className="flex flex-col items-center justify-center h-full p-3 text-rose-900">
            <Thermometer className="h-8 w-8 mb-2" />
            <span className="text-xs font-semibold mb-1">Temperature</span>
            {currentWeather && !weatherLoading ? (
              <>
                <span className="text-xl font-bold">
                  {currentWeather.temperature.toFixed(1)}°C
                </span>
                <span className="text-xs opacity-70 mt-1">
                  Feels {currentWeather.feels_like.toFixed(0)}°C
                </span>
              </>
            ) : (
              <span className="text-sm">Loading...</span>
            )}
          </div>
        </motion.div>

        {/* Weather Card 2 - Rainfall */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="relative rounded-lg overflow-hidden min-h-[160px] cursor-pointer bg-sky-100"
        >
          <div className="flex flex-col items-center justify-center h-full p-3 text-sky-900">
            <CloudRain className="h-8 w-8 mb-2" />
            <span className="text-xs font-semibold mb-1">Rainfall</span>
            {currentWeather && !weatherLoading ? (
              <>
                <span className="text-xl font-bold">
                  {currentWeather.rainfall_today.toFixed(1)} mm
                </span>
                <span className="text-xs opacity-70 mt-1">
                  {currentWeather.weather}
                </span>
              </>
            ) : (
              <span className="text-sm">Loading...</span>
            )}
          </div>
        </motion.div>

        {/* Weather Card 3 - Humidity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="relative rounded-lg overflow-hidden min-h-[160px] cursor-pointer bg-amber-100"
        >
          <div className="flex flex-col items-center justify-center h-full p-3 text-amber-900">
            <Droplets className="h-8 w-8 mb-2" />
            <span className="text-xs font-semibold mb-1">Humidity</span>
            {currentWeather && !weatherLoading ? (
              <>
                <span className="text-xl font-bold">
                  {currentWeather.humidity}%
                </span>
                <span className="text-xs opacity-70 mt-1">
                  Wind {currentWeather.wind_speed.toFixed(1)} m/s
                </span>
              </>
            ) : (
              <span className="text-sm">Loading...</span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Disease Breakdown and Trends Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disease Breakdown Chart */}
        <DiseaseBarChart data={breakdown} showFacilities={true} />

        {/* Disease Trends Chart */}
        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">
            Disease Trends (Last {Math.ceil(selectedDays / 7)} Weeks)
          </h3>
          <TimeSeriesChart
            data={trends}
            height={450}
            showTitle={false}
          />
        </div>
      </div>

      {/* Geographic Map */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="border rounded-lg p-6 bg-card"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Geographic Distribution</h3>
          {heatmap && heatmap.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {heatmap.length} districts with data
            </div>
          )}
        </div>
        <div className="w-full h-[600px]">
          <DiseaseMap heatmapData={heatmap} />
        </div>
      </motion.div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              <span className="font-medium">Loading dashboard data...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewOverview;
