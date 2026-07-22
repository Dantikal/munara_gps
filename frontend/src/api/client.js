import axios from "axios";

import { authStorage, clearAuthStorage } from "../features/auth/authStorage.js";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

const getAccessToken = () =>
  authStorage.getItem("access") || authStorage.getItem("access_token");

const getRefreshToken = () =>
  authStorage.getItem("refresh") || authStorage.getItem("refresh_token");

const setAccessToken = (token) => {
  authStorage.setItem("access", token);
  authStorage.setItem("access_token", token);
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
        clearAuthStorage();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
