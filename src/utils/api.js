/**
 * API utility for making requests
 *
 * In production, uses relative URLs (/api/...) which Nginx proxies to backend
 * In development, can use VITE_API_BASE_URL env var or defaults to relative URLs
 */

// Use relative URL by default - works in both dev (Vite proxy) and production (Nginx proxy)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Helper to construct full API URL
 * @param {string} path - API endpoint path (e.g., '/diseases', '/locations?level=2')
 * @returns {string} Full API URL
 */
export const getApiUrl = (path) => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
};

/**
 * Fetch wrapper with error handling
 * @param {string} path - API endpoint path
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<any>} Response data
 */
export const apiFetch = async (path, options = {}) => {
  const url = getApiUrl(path);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    throw error;
  }
};
