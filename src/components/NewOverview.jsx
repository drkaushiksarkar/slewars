import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  MapPin,
  Users,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import KPICard from './dashboard/KPICard';
import DiseaseBarChart from './dashboard/DiseaseBarChart';
import TimeSeriesChart from './dashboard/TimeSeriesChart';
import DiseaseMap from './DiseaseMap';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';

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

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={`Total Cases (${selectedDays} days)`}
          value={overview?.totalCases || 0}
          icon={Activity}
          colorScheme="blue"
          trend={overview?.totalCases > 0 ? 'up' : 'neutral'}
          trendValue={overview?.changePercent ? `${overview.changePercent}%` : null}
          delay={0}
        />
        <KPICard
          title={`Total Deaths (${selectedDays} days)`}
          value={overview?.totalDeaths || 0}
          icon={Users}
          colorScheme="rose"
          trend={overview?.totalDeaths > 0 ? 'up' : 'neutral'}
          subtitle="All diseases"
          delay={0.1}
        />
        <KPICard
          title="High Risk Districts"
          value={overview?.highRiskDistricts || 0}
          icon={MapPin}
          colorScheme="purple"
          subtitle={`Out of 13 districts`}
          delay={0.2}
        />
        <KPICard
          title="Affected Facilities"
          value={overview?.affectedFacilities || 0}
          icon={Building2}
          colorScheme="green"
          subtitle="Reporting facilities"
          delay={0.3}
        />
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
