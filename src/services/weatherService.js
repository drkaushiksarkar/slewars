// Weather service to fetch OpenWeather and Pexels data with caching

const FREETOWN_LAT = 8.4657;
const FREETOWN_LON = -13.2317;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Cache storage
const cache = {
  weather: null,
  images: {},
  timestamps: {}
};

// Check if cache is valid
const isCacheValid = (key) => {
  if (!cache.timestamps[key]) return false;
  return Date.now() - cache.timestamps[key] < CACHE_DURATION;
};

// Fetch Pexels image
export const fetchPexelsImage = async (query) => {
  // Check cache first
  if (cache.images[query] && isCacheValid(`image_${query}`)) {
    return cache.images[query];
  }

  const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY || 'pOW8EFApbRg8S8xZnUQzwQmCg8EULUz3tG3OaV2OG1dVwhriRd5hsFln';

  try {
    const response = await fetch(`https://api.pexels.com/v1/search?query=${query}&per_page=1&orientation=landscape`, {
      headers: {
        Authorization: PEXELS_API_KEY
      }
    });

    if (!response.ok) throw new Error('Failed to fetch image');

    const data = await response.json();
    const imageUrl = data.photos?.[0]?.src?.large || data.photos?.[0]?.src?.original;

    // Cache the image URL
    cache.images[query] = imageUrl;
    cache.timestamps[`image_${query}`] = Date.now();

    return imageUrl;
  } catch (error) {
    console.error(`Error fetching Pexels image for ${query}:`, error);
    return null;
  }
};

// Fetch weather data from OpenWeather
export const fetchWeatherData = async () => {
  // Check cache first
  if (cache.weather && isCacheValid('weather')) {
    return cache.weather;
  }

  const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || 'e3a6ee39d6ac8cfe030a04dd1a64cd65';

  try {
    // Fetch current weather and forecast
    const [currentResponse, forecastResponse] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${FREETOWN_LAT}&lon=${FREETOWN_LON}&units=metric&appid=${OPENWEATHER_API_KEY}`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${FREETOWN_LAT}&lon=${FREETOWN_LON}&units=metric&appid=${OPENWEATHER_API_KEY}`)
    ]);

    if (!currentResponse.ok || !forecastResponse.ok) {
      throw new Error('Failed to fetch weather data');
    }

    const currentData = await currentResponse.json();
    const forecastData = await forecastResponse.json();

    // Get tomorrow's forecast (24 hours from now)
    const tomorrow = forecastData.list.find((item, index) => index >= 7 && index <= 9) || forecastData.list[8];

    // Extract relevant data
    const weatherData = {
      current: {
        temperature: Math.round(currentData.main.temp),
        humidity: currentData.main.humidity,
        rainfall: currentData.rain?.['1h'] || 0,
        feelsLike: Math.round(currentData.main.feels_like),
        description: currentData.weather[0].description,
        icon: currentData.weather[0].icon
      },
      tomorrow: {
        temperature: Math.round(tomorrow.main.temp),
        humidity: tomorrow.main.humidity,
        rainfall: tomorrow.rain?.['3h'] || 0,
        description: tomorrow.weather[0].description,
        icon: tomorrow.weather[0].icon
      },
      location: 'Freetown, Sierra Leone'
    };

    // Cache the data
    cache.weather = weatherData;
    cache.timestamps.weather = Date.now();

    return weatherData;
  } catch (error) {
    console.error('Error fetching weather data:', error);

    // Return fallback data
    return {
      current: {
        temperature: 28,
        humidity: 78,
        rainfall: 0,
        feelsLike: 30,
        description: 'partly cloudy',
        icon: '02d'
      },
      tomorrow: {
        temperature: 29,
        humidity: 75,
        rainfall: 2,
        description: 'light rain',
        icon: '10d'
      },
      location: 'Freetown, Sierra Leone'
    };
  }
};

// Fetch all weather images
export const fetchWeatherImages = async () => {
  const queries = {
    rainfall: 'tropical rain weather',
    temperature: 'sunny tropical weather',
    humidity: 'misty tropical weather'
  };

  const images = {};

  for (const [key, query] of Object.entries(queries)) {
    images[key] = await fetchPexelsImage(query);
  }

  return images;
};

// Clear cache (useful for testing)
export const clearCache = () => {
  cache.weather = null;
  cache.images = {};
  cache.timestamps = {};
};
