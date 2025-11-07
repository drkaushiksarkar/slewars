const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const buildUrl = (path) => {
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path}`.replace(/([^:]\/)\/+/g, "$1");
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || "Unexpected API error");
  }
  if (response.status === 204) return null;
  return response.json();
};

export const apiClient = {
  async get(path, options = {}) {
    const response = await fetch(buildUrl(path), {
      ...options,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    return handleResponse(response);
  },
  async post(path, body, options = {}) {
    const response = await fetch(buildUrl(path), {
      ...options,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      body: JSON.stringify(body)
    });
    return handleResponse(response);
  }
};
