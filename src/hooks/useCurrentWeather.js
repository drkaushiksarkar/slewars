import { useState, useEffect } from 'react';

/**
 * Hook to fetch current weather data from OpenWeather API
 * @param {string} locationName - Location name (e.g., "Bo", "Freetown")
 * @returns {Object} { data, loading, error }
 */
export const useCurrentWeather = (locationName) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!locationName) {
      setLoading(false);
      return;
    }

    const fetchCurrentWeather = async () => {
      setLoading(true);
      setError(null);

      try {
        const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

        if (!apiKey) {
          throw new Error('OpenWeather API key not configured');
        }

        // Add "Sierra Leone" to improve location accuracy
        const query = `${locationName}, Sierra Leone`;
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&appid=${apiKey}&units=metric`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Weather API error: ${response.status}`);
        }

        const weatherData = await response.json();

        // Transform to our format
        const transformed = {
          temperature: weatherData.main.temp,
          feels_like: weatherData.main.feels_like,
          temp_min: weatherData.main.temp_min,
          temp_max: weatherData.main.temp_max,
          humidity: weatherData.main.humidity,
          precipitation: weatherData.rain?.['1h'] || weatherData.rain?.['3h'] || 0,
          rainfall_today: weatherData.rain?.['1h'] || 0,
          weather: weatherData.weather[0]?.main || 'Clear',
          weather_description: weatherData.weather[0]?.description || '',
          wind_speed: weatherData.wind.speed,
          pressure: weatherData.main.pressure,
          clouds: weatherData.clouds.all,
          timestamp: new Date(weatherData.dt * 1000)
        };

        setData(transformed);
      } catch (err) {
        console.error('Error fetching current weather:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentWeather();
  }, [locationName]);

  return { data, loading, error };
};
