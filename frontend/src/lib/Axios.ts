// lib/axios-instance.ts
import { getTokens } from "@/actions/getRefreshToken";
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:4000/v1",
});

// in your api.ts (server-side only)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const newToken = await getTokens();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken.accessToken}`;
        return api(originalRequest); // retry
      }
    }
    return Promise.reject(error);
  },
);

export default api;
