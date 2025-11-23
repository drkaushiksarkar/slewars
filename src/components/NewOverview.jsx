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
import DiseaseBreakdown from './dashboard/DiseaseBreakdown';
import DiseaseTrend from './dashboard/DiseaseTrend';
import DiseaseMap from './DiseaseMap';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import { useCurrentWeather } from '@/hooks/useCurrentWeather';

/**
 * NewOverview - Phase 2 implementation using real DHIS2 data from Phase 1 APIs
 */
const NewOverview = () => {
  const [selectedLocation, setSelectedLocation] = React.useState('all');
  const [selectedDays, setSelectedDays] = React.useState(30);
  const [selectedDisease, setSelectedDisease] = React.useState(null);
  const [selectedAdminLevel, setSelectedAdminLevel] = React.useState(2);

  const {
    overview,
    diseases,
    diseasesByCategory,
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
    adminLevel: selectedAdminLevel,
  });

  // Set default disease when diseases are loaded
  React.useEffect(() => {
    if (diseases.length > 0 && !selectedDisease) {
      // Find IDSR Malaria or fall back to first disease alphabetically
      const defaultDisease = diseases.find(d => d.name === 'IDSR Malaria');
      if (defaultDisease) {
        setSelectedDisease(defaultDisease.id);
      } else {
        const sortedDiseases = [...diseases].sort((a, b) => a.name.localeCompare(b.name));
        setSelectedDisease(sortedDiseases[0].id);
      }
    }
  }, [diseases, selectedDisease]);

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
            value={selectedDisease || ''}
            onChange={(e) => setSelectedDisease(e.target.value)}
            className="flex-1 rounded-md border border-input bg-background px-4 py-2 min-w-[180px]"
            disabled={isLoading}
          >
            {Object.keys(diseasesByCategory).length > 0 ? (
              Object.entries(diseasesByCategory).map(([category, categoryDiseases]) => (
                <optgroup key={category} label={category}>
                  {categoryDiseases.map((disease) => (
                    <option key={disease.id} value={disease.id}>
                      {disease.name}
                    </option>
                  ))}
                </optgroup>
              ))
            ) : (
              diseases.map((disease) => (
                <option key={disease.id} value={disease.id}>
                  {disease.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-md">
          <span className="text-sm font-medium">{diseases.length}</span>
          <span className="text-sm text-muted-foreground">Diseases</span>
        </div>
      </div>

      {/* Combined KPI and Weather Cards Row - All 8 Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-3">
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

        {/* KPI Card 4 - National Risk Level */}
        {(() => {
          const highRiskDistricts = overview?.highRiskDistricts || 0;
          const totalDistricts = overview?.totalDistricts || 1;
          const riskPercentage = (highRiskDistricts / totalDistricts) * 100;

          let riskLevel = 'LOW';
          let riskColor = 'green';
          let borderColor = 'border-green-500';
          let textColor = 'text-green-600';
          let iconColor = 'text-green-400';

          if (riskPercentage >= 60) {
            riskLevel = 'HIGH';
            riskColor = 'red';
            borderColor = 'border-red-500';
            textColor = 'text-red-600';
            iconColor = 'text-red-400';
          } else if (riskPercentage >= 30) {
            riskLevel = 'MEDIUM';
            riskColor = 'yellow';
            borderColor = 'border-yellow-500';
            textColor = 'text-yellow-600';
            iconColor = 'text-yellow-400';
          }

          return (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={`bg-card p-3 rounded-lg border-2 ${borderColor} flex flex-col items-center justify-center min-h-[160px]`}
            >
              <Activity className={`h-8 w-8 ${iconColor} mb-2 flex-shrink-0`} />
              <h3 className="text-xs font-medium text-muted-foreground text-center mb-1">National Risk</h3>
              <p className={`text-xl font-bold ${textColor}`}>{riskLevel}</p>
              <span className="text-xs text-muted-foreground mt-1">{riskPercentage.toFixed(0)}% at risk</span>
            </motion.div>
          );
        })()}

        {/* KPI Card 5 - Affected Facilities */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4 }}
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
          transition={{ duration: 0.5, delay: 0.5 }}
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
          transition={{ duration: 0.5, delay: 0.6 }}
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
          transition={{ duration: 0.5, delay: 0.7 }}
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

      {/* Disease Breakdown by Category and Trends Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disease Breakdown by Category - 7 Groups */}
        <DiseaseBreakdown
          locationUid={selectedLocation}
          timeRange={`${selectedDays}d`}
        />

        {/* Disease Trends Chart */}
        <DiseaseTrend
          locationUid={selectedLocation}
          diseaseId={selectedDisease}
        />
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
          <div className="flex items-center gap-4">
            {/* Admin Level Selector */}
            <select
              value={selectedAdminLevel}
              onChange={(e) => setSelectedAdminLevel(Number(e.target.value))}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              disabled={isLoading}
            >
              <option value={2}>District (ADM2)</option>
              <option value={3}>Chiefdom (ADM3)</option>
              <option value={4}>Facility (ADM4)</option>
            </select>
            <div className="text-sm text-muted-foreground">
              {isLoading ? (
                <span>Loading...</span>
              ) : heatmap && heatmap.length > 0 ? (
                <span>{heatmap.length} locations</span>
              ) : (
                <span>No data</span>
              )}
            </div>
          </div>
        </div>
        <div className="w-full h-[600px]">
          <DiseaseMap
            heatmapData={heatmap}
            selectedDisease={selectedDisease}
            timeRange={selectedDays}
            adminLevel={selectedAdminLevel}
            isLoading={isLoading}
          />
        </div>
      </motion.div>

      {/* Loading Overlay - Only show on initial load */}
      {isLoading && !overview && (
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
