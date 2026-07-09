import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

const getAccessToken = () =>
  localStorage.getItem("access") || localStorage.getItem("access_token");

const getRefreshToken = () =>
  localStorage.getItem("refresh") || localStorage.getItem("refresh_token");

const setAccessToken = (token) => {
  localStorage.setItem("access", token);
  localStorage.setItem("access_token", token);
};

const clearTokens = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
};

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const refresh = getRefreshToken();

    if (error.response?.status === 401 && refresh && !originalRequest?._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
          refresh,
        });
        setAccessToken(data.access);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearTokens();
        localStorage.removeItem("user");
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
