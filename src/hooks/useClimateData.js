import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

/**
 * Custom hook to fetch and manage climate data
 * @param {string} locationUid - DHIS2 location UID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {string} aggregation - 'day' | 'week' | 'month'
 */
export const useClimateData = (locationUid, startDate, endDate, aggregation = 'day') => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!locationUid || !startDate || !endDate) {
      setLoading(false);
      return;
    }

    const fetchClimateData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(`${API_BASE_URL}/climate/${locationUid}`, {
          params: {
            startDate,
            endDate,
            aggregation
          }
        });

        if (response.data.success) {
          setData(response.data.data);
        } else {
          setError('Failed to fetch climate data');
        }
      } catch (err) {
        console.error('Error fetching climate data:', err);
        setError(err.response?.data?.message || 'An error occurred while fetching climate data');
      } finally {
        setLoading(false);
      }
    };

    fetchClimateData();
  }, [locationUid, startDate, endDate, aggregation]);

  return { data, loading, error };
};

/**
 * Custom hook to fetch climate statistics
 * @param {string} locationUid - DHIS2 location UID
 */
export const useClimateStatistics = (locationUid) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!locationUid) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(`${API_BASE_URL}/climate/${locationUid}/statistics`);

        if (response.data.success) {
          setStats(response.data.data);
        } else {
          setError('Failed to fetch climate statistics');
        }
      } catch (err) {
        console.error('Error fetching climate statistics:', err);
        setError(err.response?.data?.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [locationUid]);

  return { stats, loading, error };
};

/**
 * Custom hook to fetch cache status
 */
export const useClimateCacheStatus = () => {
  const [cacheStatus, setCacheStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCacheStatus = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(`${API_BASE_URL}/climate/cache/status`);

        if (response.data.success) {
          setCacheStatus(response.data.data);
        } else {
          setError('Failed to fetch cache status');
        }
      } catch (err) {
        console.error('Error fetching cache status:', err);
        setError(err.response?.data?.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchCacheStatus();
  }, []);

  return { cacheStatus, loading, error };
};
