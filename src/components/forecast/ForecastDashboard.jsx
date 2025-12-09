import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForecast, useModelPerformance, useAnomalyDetection } from '../../hooks/useForecast';
import ForecastChart from './ForecastChart';
import ForecastHeatmap from './ForecastHeatmap';
import AnomalyDetectionChart from './AnomalyDetectionChart';
import EmptyState from '../common/EmptyState';
import LoadingSpinner from '../common/LoadingSpinner';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ForecastDashboard Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full bg-red-50 p-6">
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Forecast Dashboard</h2>
            <p className="text-gray-700 mb-4">Something went wrong:</p>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {this.state.error?.toString()}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ForecastDashboardContent() {
  console.log('ForecastDashboard rendering...');

  const [selectedDisease, setSelectedDisease] = useState('malariaIDSR');
  const [selectedLocation, setSelectedLocation] = useState('O6uvpzGd5pu'); // Bo District
  const [locations, setLocations] = useState([]);
  const [diseasesByCategory, setDiseasesByCategory] = useState({});
  const [showRetrainModal, setShowRetrainModal] = useState(false);
  const [showForecastInfo, setShowForecastInfo] = useState(false);
  const [showDataLagWarning, setShowDataLagWarning] = useState(false);
  const [viewMode, setViewMode] = useState('heatmap'); // 'chart' or 'heatmap'
  const [isIsolationForestExpanded, setIsIsolationForestExpanded] = useState(false);
  const [isSTLExpanded, setIsSTLExpanded] = useState(false);

  console.log('Component state:', { selectedDisease, selectedLocation, locations });

  const { forecast, loading: forecastLoading, error: forecastError, fetchForecast, generateForecast } = useForecast(
    selectedDisease,
    selectedLocation,
    true  // Auto-fetch when disease/location changes
  );

  const { performance, loading: perfLoading } = useModelPerformance(
    selectedDisease,
    selectedLocation,
    !!forecast
  );

  const { anomalyData, loading: anomalyLoading } = useAnomalyDetection(selectedDisease, 2, selectedLocation, true);

  console.log('Hook data:', { forecast, forecastLoading, forecastError, performance, perfLoading, anomalyData, anomalyLoading });

  // Fetch locations
  useEffect(() => {
    fetch('http://localhost:4000/api/locations?level=2')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLocations(data.data);
        }
      })
      .catch(err => console.error('Error fetching locations:', err));
  }, []);

  // Fetch diseases grouped by category
  useEffect(() => {
    fetch('http://localhost:4000/api/diseases/categories')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDiseasesByCategory(data.data);
        }
      })
      .catch(err => console.error('Error fetching diseases:', err));
  }, []);

  const handleRetrainClick = () => {
    setShowRetrainModal(true);
  };

  const handleConfirmRetrain = () => {
    setShowRetrainModal(false);
    generateForecast(4, true); // Force retrain
  };

  return (
    <div className="w-full">
      <div className="max-w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Prediction Risk</h1>
              <p className="text-gray-600">
                AI-powered predictions using ensemble SARIMA + XGBoost models
              </p>
            </div>

            {/* Info Button */}
            <div className="relative">
              <button
                onClick={() => setShowForecastInfo(!showForecastInfo)}
                className="w-9 h-9 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-colors group"
                title="How Forecasting Works"
              >
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Info Popover */}
              {showForecastInfo && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 text-sm">How Forecasting Works</h3>
                    <button
                      onClick={() => setShowForecastInfo(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-gray-700">
                    Forecasts automatically load using saved models for fast predictions.
                    Click <strong>Refresh & Retrain</strong> to pull the latest ERA5 climate data, retrain the model, and generate updated predictions (~2-3 min).
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm p-6 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Disease Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Disease
              </label>
              <select
                value={selectedDisease}
                onChange={(e) => setSelectedDisease(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(diseasesByCategory).map(([category, diseases]) => (
                  <optgroup key={category} label={category}>
                    {diseases.map((disease) => (
                      <option key={disease.id} value={disease.id}>
                        {disease.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Location Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {locations.map(loc => (
                  <option key={loc.uid} value={loc.uid}>{loc.name}</option>
                ))}
              </select>
            </div>

            {/* Refresh & Retrain Button */}
            <div className="flex items-end">
              <button
                onClick={handleRetrainClick}
                disabled={forecastLoading}
                className="w-full bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                title="Retrain model with latest data from ERA5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {forecastLoading ? 'Training...' : 'Refresh & Retrain'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Error Display */}
        {forecastError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6"
          >
            <EmptyState
              type={
                forecastError.toLowerCase().includes('insufficient')
                  ? 'insufficient-data'
                  : forecastError.toLowerCase().includes('no data') || forecastError.toLowerCase().includes('not found')
                  ? 'no-data'
                  : 'error'
              }
              message={forecastError.toLowerCase().includes('insufficient') ? 'Insufficient Data' : undefined}
              description={forecastError}
            />
          </motion.div>
        )}

        {/* Main Content - Redesigned Layout */}
        <div className="space-y-6">
          {/* Row 1: Forecast Chart (86%) + Model Performance Sidebar (14%) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col lg:flex-row gap-6"
          >
            {/* Left: Forecast Chart with Weekly Predictions - 86% width */}
            <div className="flex-1 lg:basis-[86%] flex flex-col gap-6">
              {/* 4-Week Forecast Card */}
              <div className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-xl shadow-lg p-5 border-2 border-blue-200 flex flex-col flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">4-Week Forecast</h2>
                    <p className="text-sm text-gray-600">AI-powered predictions with confidence intervals</p>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-2 bg-white/50 rounded-lg p-1 border border-blue-200">
                    <button
                      onClick={() => setViewMode('chart')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'chart'
                          ? 'bg-white text-blue-600 shadow-md'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                        </svg>
                        Chart
                      </div>
                    </button>
                    <button
                      onClick={() => setViewMode('heatmap')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'heatmap'
                          ? 'bg-white text-blue-600 shadow-md'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        Heatmap
                      </div>
                    </button>
                  </div>

                  {/* Outdated Forecast Warning - Pulsating i Button */}
                  {forecast?.predictions && forecast.predictions.length > 0 && (() => {
                    const lastForecastDate = new Date(forecast.predictions[forecast.predictions.length - 1].date);
                    const today = new Date();
                    const isStale = lastForecastDate < today;
                    const lastDataDate = forecast.data_availability?.end_date;

                    if (isStale && lastDataDate) {
                      return (
                        <div className="relative">
                          <button
                            onClick={() => setShowDataLagWarning(!showDataLagWarning)}
                            className="w-9 h-9 rounded-full bg-amber-100 hover:bg-amber-200 flex items-center justify-center transition-colors relative"
                            title="Outdated Forecast - Data Lag Detected"
                          >
                            {/* Pulsating rings */}
                            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping"></span>
                            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" style={{ animationDelay: '1s' }}></span>

                            {/* Icon */}
                            <svg className="w-5 h-5 text-amber-600 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </button>

                          {/* Warning Popover */}
                          {showDataLagWarning && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-amber-200 z-50"
                            >
                              <div className="bg-amber-50 border-b border-amber-200 p-4 rounded-t-lg">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <div>
                                      <h3 className="font-semibold text-amber-900 text-sm mb-1">
                                        Outdated Forecast - Data Lag Detected
                                      </h3>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => setShowDataLagWarning(false)}
                                    className="text-amber-600 hover:text-amber-800 ml-2"
                                  >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              <div className="p-4">
                                <p className="text-sm text-gray-700">
                                  The most recent data available is from <strong>{new Date(lastDataDate).toLocaleDateString()}</strong>.
                                  The forecast predicts from that date forward, resulting in predictions that are now in the past.
                                  Please contact data administrators to ensure recent disease surveillance data is being reported to the system.
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Forecast Chart */}
                <div className="flex-1 min-h-0 bg-white rounded-lg border border-blue-100 p-4 mb-4">
                  {forecastLoading ? (
                    <LoadingSpinner message="Generating forecast..." size="lg" className="h-full" />
                  ) : forecast ? (
                    viewMode === 'chart' ? (
                      <ForecastChart forecast={forecast} height={450} />
                    ) : (
                      <ForecastHeatmap
                        forecast={forecast}
                        selectedLocation={selectedLocation}
                        selectedDisease={selectedDisease}
                      />
                    )
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className="text-lg">No forecast data available</p>
                        <p className="text-sm mt-2">Select a different disease or location, or use "Refresh & Retrain" to generate new forecasts</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Weekly Predictions - Bottom of Forecast Card */}
                {forecast?.predictions && forecast.predictions.length > 0 && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2.5 border border-blue-200">
                    <div className="flex items-center gap-1.5 mb-2">
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                      </svg>
                      <h4 className="text-xs font-bold text-gray-900">Weekly Predictions</h4>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {forecast.predictions.map((p, i) => (
                        <div key={i} className="bg-white rounded-lg p-2 border border-blue-200 shadow-sm hover:shadow-md transition-all hover:scale-105">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs text-gray-600 font-medium">
                              Week {i + 1}
                            </div>
                            <div className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                              p.risk_level === 'HIGH' ? 'bg-red-100 text-red-700' :
                              p.risk_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {p.risk_level}
                            </div>
                          </div>
                          <div className="text-xs text-gray-600 mb-1">
                            {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          <div className="flex items-baseline gap-1 mb-0.5">
                            <div className="text-xl font-bold text-gray-900">
                              {p.predicted_cases}
                            </div>
                            <div className="text-xs text-gray-500">
                              cases
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {p.lower_bound} - {p.upper_bound}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Model Performance Sidebar - 14% width */}
            <div className="flex-shrink-0 lg:basis-[14%] flex flex-col">
              {/* Model Performance Card with 4x1 Vertical Layout */}
              <div className="bg-gradient-to-br from-white to-teal-50 rounded-xl shadow-md p-3 border-2 border-teal-100 flex flex-col h-full">
                <div className="flex flex-col items-center gap-2 mb-4">
                  <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center shadow-md">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 text-center leading-tight">Model Performance</h3>
                </div>

                {perfLoading ? (
                  <LoadingSpinner message="Loading..." size="sm" className="py-8" />
                ) : performance ? (
                  <div className="flex flex-col flex-1 justify-between">
                    {/* Vertical 4x1 Metrics Stack */}
                    <div className="flex flex-col flex-1 justify-evenly space-y-2.5">
                      <div className="bg-white rounded-lg p-3 shadow-sm border border-teal-100 hover:shadow-md transition-shadow flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center text-center w-full">
                          <div className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-1">MAE</div>
                          <div className="text-2xl font-bold text-teal-600 mb-1">
                            {performance.mae != null ? Number(performance.mae).toFixed(1) : 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500 leading-tight">Mean Abs. Error</div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-3 shadow-sm border border-teal-100 hover:shadow-md transition-shadow flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center text-center w-full">
                          <div className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-1">RMSE</div>
                          <div className="text-2xl font-bold text-teal-600 mb-1">
                            {performance.rmse != null ? Number(performance.rmse).toFixed(1) : 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500 leading-tight">Root Mean Sq.</div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-3 shadow-sm border border-teal-100 hover:shadow-md transition-shadow flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center text-center w-full">
                          <div className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-1">R² Score</div>
                          <div className="text-2xl font-bold text-teal-600 mb-1">
                            {performance.r_squared != null ? Number(performance.r_squared).toFixed(2) : 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500 leading-tight">Coeff. of Det.</div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-3 shadow-sm border border-teal-100 hover:shadow-md transition-shadow flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center text-center w-full">
                          <div className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-1">MAPE</div>
                          <div className="text-2xl font-bold text-teal-600 mb-1">
                            {performance.mape != null ? Number(performance.mape).toFixed(1) + '%' : 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500 leading-tight">Mean Abs. %</div>
                        </div>
                      </div>
                    </div>

                    {/* Contributing Factors - Climate Variables Only */}
                    {forecast && (() => {
                      // Filter to only show climate-related variables
                      const climateFactors = forecast.predictions?.[0]?.contributing_factors?.filter(factor => {
                        const factorName = factor.factor.toLowerCase();
                        return factorName.includes('temp') ||
                               factorName.includes('precip') ||
                               factorName.includes('rain') ||
                               factorName.includes('humid') ||
                               factorName.includes('climate') ||
                               factorName.includes('weather') ||
                               factorName.includes('pressure') ||
                               factorName.includes('wind');
                      }) || [];

                      return climateFactors.length > 0 && (
                        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-lg p-2.5 border border-teal-200 mt-3">
                          <div className="flex flex-col items-center gap-1.5 mb-2.5">
                            <svg className="w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                            </svg>
                            <h4 className="text-xs font-bold text-teal-900 text-center leading-tight">
                              Contributing Factors
                            </h4>
                          </div>
                          <div className="space-y-2">
                            {climateFactors.slice(0, 3).map((factor, i) => (
                              <div key={i} className="bg-white/60 rounded p-2">
                                <div className="flex flex-col items-center mb-1.5">
                                  <span className="text-xs font-semibold text-teal-900 text-center leading-tight mb-1">{factor.factor}</span>
                                  <span className="text-xs font-bold text-teal-700">
                                    {(factor.impact * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <div className="w-full bg-teal-200 rounded-full h-1.5">
                                  <div
                                    className="bg-gradient-to-r from-teal-500 to-teal-600 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${factor.impact * 100}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8 flex-1 flex items-center justify-center">
                    No metrics
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Row 2: Anomaly Detection - Full Width */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-white via-purple-50 to-indigo-50 rounded-xl shadow-lg p-5 border-2 border-purple-200"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Anomaly Detection with STL Decomposition</h3>
                <p className="text-sm text-gray-600">ML-powered pattern analysis using STL Decomposition</p>
              </div>
            </div>

            {anomalyLoading ? (
              <LoadingSpinner message="Analyzing patterns..." size="lg" className="py-16" />
            ) : anomalyData ? (
              <AnomalyDetectionChart
                data={anomalyData}
                forecast={forecast}
                isIsolationForestExpanded={isIsolationForestExpanded}
                setIsIsolationForestExpanded={setIsIsolationForestExpanded}
                isSTLExpanded={isSTLExpanded}
                setIsSTLExpanded={setIsSTLExpanded}
              />
            ) : (
              <EmptyState type="no-data" className="py-16" />
            )}
          </motion.div>
        </div>

        {/* Retrain Confirmation Modal */}
        {showRetrainModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-2xl p-6 max-w-md mx-4"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Confirm Model Retraining
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Retraining will fetch the latest ERA5 climate data and rebuild the forecasting model from scratch.
                    This process typically takes 2-3 minutes to complete.
                  </p>
                  <p className="text-gray-700 text-sm font-medium mb-4">
                    Are you sure you want to proceed?
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setShowRetrainModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRetrain}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Start Retraining
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ForecastDashboard() {
  return (
    <ErrorBoundary>
      <ForecastDashboardContent />
    </ErrorBoundary>
  );
}
