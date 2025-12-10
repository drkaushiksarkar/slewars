import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE = '/api';

export function useForecast(disease, locationUid, autoFetch = true) {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchForecast = useCallback(async (regenerate = false) => {
    if (!disease || !locationUid) return;

    setLoading(true);
    setError(null);

    try {
      const url = regenerate
        ? `${API_BASE}/forecast/${encodeURIComponent(disease)}/${locationUid}?regenerate=true`
        : `${API_BASE}/forecast/${encodeURIComponent(disease)}/${locationUid}`;

      const response = await axios.get(url);

      if (response.data.success) {
        setForecast(response.data.data);
      } else {
        setError(response.data.error || 'Failed to fetch forecast');
        setForecast(null);
      }
    } catch (err) {
      console.error('Error fetching forecast:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch forecast');
      setForecast(null);
    } finally {
      setLoading(false);
    }
  }, [disease, locationUid]);

  const generateForecast = useCallback(async (horizon = 4, forceRetrain = false) => {
    if (!disease || !locationUid) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE}/forecast/generate`, {
        disease,
        location_uid: locationUid,
        horizon,
        auto_train: true,
        force_retrain: forceRetrain
      });

      if (response.data.success) {
        setForecast(response.data.data.data);
      } else {
        setError(response.data.error || 'Failed to generate forecast');
      }
    } catch (err) {
      console.error('Error generating forecast:', err);
      setError(err.response?.data?.message || err.message || 'Failed to generate forecast');
    } finally {
      setLoading(false);
    }
  }, [disease, locationUid]);

  useEffect(() => {
    if (autoFetch) {
      fetchForecast();
    }
  }, [disease, locationUid, autoFetch, fetchForecast]);

  return {
    forecast,
    loading,
    error,
    fetchForecast,
    generateForecast
  };
}

export function useRiskAnalysis(disease, autoFetch = true) {
  const [riskData, setRiskData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRiskAnalysis = useCallback(async () => {
    if (!disease) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_BASE}/forecast/risk-analysis/${encodeURIComponent(disease)}`);

      if (response.data.success) {
        setRiskData(response.data.data);
      } else {
        setError(response.data.error || 'Failed to fetch risk analysis');
      }
    } catch (err) {
      console.error('Error fetching risk analysis:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch risk analysis');
    } finally {
      setLoading(false);
    }
  }, [disease]);

  useEffect(() => {
    if (autoFetch) {
      fetchRiskAnalysis();
    }
  }, [disease, autoFetch, fetchRiskAnalysis]);

  return {
    riskData,
    loading,
    error,
    fetchRiskAnalysis
  };
}

export function useModelPerformance(disease, locationUid, autoFetch = true) {
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPerformance = useCallback(async () => {
    if (!disease || !locationUid) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_BASE}/forecast/performance/${encodeURIComponent(disease)}/${locationUid}`);

      if (response.data.success) {
        setPerformance(response.data.data);
      } else {
        setError(response.data.error || 'No performance metrics found');
      }
    } catch (err) {
      console.error('Error fetching performance:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch performance');
    } finally {
      setLoading(false);
    }
  }, [disease, locationUid]);

  useEffect(() => {
    if (autoFetch) {
      fetchPerformance();
    }
  }, [disease, locationUid, autoFetch, fetchPerformance]);

  return {
    performance,
    loading,
    error,
    fetchPerformance
  };
}

export function useAnomalyDetection(disease, level = 2, locationUid = null, autoFetch = true) {
  const [anomalyData, setAnomalyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnomalyDetection = useCallback(async (startDate = null, endDate = null) => {
    if (!disease) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ level: level.toString() });
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (locationUid) params.append('location_uid', locationUid);

      const response = await axios.get(
        `${API_BASE}/forecast/anomaly-detection/${encodeURIComponent(disease)}?${params.toString()}`
      );

      if (response.data.success) {
        setAnomalyData(response.data.data);
      } else {
        setError(response.data.error || 'Failed to fetch anomaly detection');
        setAnomalyData(null);
      }
    } catch (err) {
      console.error('Error fetching anomaly detection:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch anomaly detection');
      setAnomalyData(null);
    } finally {
      setLoading(false);
    }
  }, [disease, level, locationUid]);

  useEffect(() => {
    if (autoFetch) {
      fetchAnomalyDetection();
    }
  }, [disease, level, locationUid, autoFetch, fetchAnomalyDetection]);

  return {
    anomalyData,
    loading,
    error,
    fetchAnomalyDetection
  };
}
