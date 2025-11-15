import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';

/**
 * Custom hook to fetch dashboard analytics data from Phase 1 API endpoints
 * @param {Object} filters - Filter options
 * @param {string} filters.locationUid - Selected location UID
 * @param {number} filters.days - Time range in days (7, 30, 90)
 * @param {string} filters.diseaseId - Selected disease ID
 */
export const useDashboardAnalytics = (filters = {}) => {
  const { locationUid, days = 30, diseaseId } = filters;

  const [data, setData] = useState({
    overview: null,
    diseases: [],
    breakdown: [],
    trends: [],
    heatmap: [],
    dataQuality: [],
    locations: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Calculate weeks from days for trends API
      const weeks = Math.ceil(days / 7);

      // Build query parameters
      const buildParams = (baseParams = {}) => {
        const params = new URLSearchParams(baseParams);
        if (locationUid && locationUid !== 'all') params.append('locationUid', locationUid);
        if (days) params.append('days', days.toString());
        if (diseaseId && diseaseId !== 'all') params.append('diseaseId', diseaseId);
        return params.toString();
      };

      // Build params for trends API (uses weeks instead of days)
      const buildTrendsParams = () => {
        const params = new URLSearchParams({ weeks: weeks.toString() });
        if (locationUid && locationUid !== 'all') params.append('locationUid', locationUid);
        if (diseaseId && diseaseId !== 'all') params.append('diseaseId', diseaseId);
        return params.toString();
      };

      // Fetch all data in parallel
      const [
        overviewRes,
        diseasesRes,
        breakdownRes,
        trendsRes,
        heatmapRes,
        dataQualityRes,
        locationsRes,
      ] = await Promise.allSettled([
        apiClient.get(`/analytics/overview?${buildParams()}`),
        apiClient.get('/diseases'),
        apiClient.get(`/diseases/breakdown/all?${buildParams()}`),
        apiClient.get(`/analytics/trends?${buildTrendsParams()}`),
        apiClient.get('/analytics/heatmap'),
        apiClient.get('/analytics/data-quality'),
        apiClient.get('/locations?level=2'), // Get districts
      ]);

      setData({
        overview: overviewRes.status === 'fulfilled' ? overviewRes.value?.data : null,
        diseases: diseasesRes.status === 'fulfilled' ? diseasesRes.value?.data : [],
        breakdown: breakdownRes.status === 'fulfilled' ? breakdownRes.value?.data : [],
        trends: trendsRes.status === 'fulfilled' ? trendsRes.value?.data : [],
        heatmap: heatmapRes.status === 'fulfilled' ? heatmapRes.value?.data : [],
        dataQuality: dataQualityRes.status === 'fulfilled' ? dataQualityRes.value?.data : [],
        locations: locationsRes.status === 'fulfilled' ? locationsRes.value?.data : [],
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [locationUid, days, diseaseId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    ...data,
    isLoading,
    error,
    refresh: fetchAll,
  };
};

/**
 * Hook to fetch disease-specific data
 */
export const useDiseaseData = (diseaseId) => {
  const [data, setData] = useState({
    summary: null,
    timeseries: [],
    locations: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!diseaseId) return;

    const fetchDiseaseData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [summaryRes, timeseriesRes, locationsRes] = await Promise.allSettled([
          apiClient.get(`/diseases/${diseaseId}/summary`),
          apiClient.get(`/diseases/${diseaseId}/timeseries`),
          apiClient.get(`/diseases/${diseaseId}/locations`),
        ]);

        setData({
          summary: summaryRes.status === 'fulfilled' ? summaryRes.value?.data : null,
          timeseries: timeseriesRes.status === 'fulfilled' ? timeseriesRes.value?.data : [],
          locations: locationsRes.status === 'fulfilled' ? locationsRes.value?.data : [],
        });
      } catch (err) {
        console.error(`Error fetching disease data for ${diseaseId}:`, err);
        setError(err.message || 'Failed to fetch disease data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiseaseData();
  }, [diseaseId]);

  return { ...data, isLoading, error };
};
