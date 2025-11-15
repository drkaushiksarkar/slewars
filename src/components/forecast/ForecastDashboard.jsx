import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForecast, useModelPerformance, useRiskAnalysis } from '../../hooks/useForecast';
import ForecastChart from './ForecastChart';

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

  const [selectedDisease, setSelectedDisease] = useState('Malaria');
  const [selectedLocation, setSelectedLocation] = useState('O6uvpzGd5pu'); // Bo District
  const [locations, setLocations] = useState([]);
  const [diseases] = useState(['Malaria', 'Measles', 'Typhoid', 'Yellow Fever', 'Cholera', 'Lassa Fever']);
  const [showRetrainModal, setShowRetrainModal] = useState(false);

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

  const { riskData, loading: riskLoading } = useRiskAnalysis(selectedDisease, true);

  console.log('Hook data:', { forecast, forecastLoading, forecastError, performance, perfLoading, riskData, riskLoading });

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Disease Forecasting</h1>
          <p className="text-gray-600">
            AI-powered predictions using ensemble SARIMA + XGBoost models
          </p>
        </motion.div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
        >
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1 text-sm text-blue-800">
              <p className="font-semibold mb-1">How Forecasting Works</p>
              <p>
                Forecasts automatically load using saved models for fast predictions.
                Click <strong>Refresh & Retrain</strong> to pull the latest ERA5 climate data, retrain the model, and generate updated predictions (~2-3 min).
              </p>
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
                {diseases.map(disease => (
                  <option key={disease} value={disease}>{disease}</option>
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
            className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-800">{forecastError}</p>
            </div>
          </motion.div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Forecast Chart - Main column */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              4-Week Forecast
            </h2>

            {forecastLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-gray-600">Generating forecast...</p>
                  <p className="text-sm text-gray-500 mt-2">This may take up to 60 seconds</p>
                </div>
              </div>
            ) : forecast ? (
              <>
                <ForecastChart forecast={forecast} />

                {/* Contributing Factors */}
                {forecast.predictions?.[0]?.contributing_factors?.length > 0 && (
                  <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h3 className="text-sm font-semibold text-blue-900 mb-3">
                      Key Contributing Factors
                    </h3>
                    <div className="space-y-2">
                      {forecast.predictions[0].contributing_factors.map((factor, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-sm text-blue-800">{factor.factor}</span>
                          <div className="flex items-center">
                            <div className="w-32 bg-blue-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${factor.impact * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-blue-900">
                              {(factor.impact * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-96 text-gray-500">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-lg">No forecast data available</p>
                  <p className="text-sm mt-2">Select a different disease or location, or use "Refresh & Retrain" to generate new forecasts</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Data Availability */}
            {forecast?.data_availability && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-blue-50 border border-blue-200 rounded-xl p-6"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">Data Availability</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Data Range:</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(forecast.data_availability.start_date).toLocaleDateString()} - {new Date(forecast.data_availability.end_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Points:</span>
                    <span className="font-semibold text-gray-900">
                      {forecast.data_availability.total_points}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Climate Data:</span>
                    <span className={`font-semibold ${forecast.data_availability.has_climate_data ? 'text-green-600' : 'text-gray-500'}`}>
                      {forecast.data_availability.has_climate_data ? 'Available' : 'Not Available'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Model Performance */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Model Performance</h3>

              {perfLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
                </div>
              ) : performance ? (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-600 mb-1">Mean Absolute Error</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {performance.mae?.toFixed(2) || 'N/A'}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-600 mb-1">RMSE</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {performance.rmse?.toFixed(2) || 'N/A'}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-600 mb-1">R² Score</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {performance.r_squared?.toFixed(3) || 'N/A'}
                    </div>
                  </div>

                  {performance.mape && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">MAPE</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {performance.mape.toFixed(2)}%
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  No performance metrics available
                </p>
              )}
            </motion.div>

            {/* Risk Summary */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl shadow-sm p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Risk Summary</h3>

              {riskLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
                </div>
              ) : riskData.length > 0 ? (
                <div className="space-y-2">
                  {riskData.slice(0, 5).map((district, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <span className="text-sm text-gray-700 truncate flex-1">
                        {district.location_name}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        district.risk_level === 'HIGH' ? 'bg-red-100 text-red-700' :
                        district.risk_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {district.risk_level || 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  No risk data available
                </p>
              )}
            </motion.div>
          </div>
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
