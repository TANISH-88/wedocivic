import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("ci_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      // Don't redirect if we're in admin area (admin has its own auth flow)
      if (!window.location.pathname.startsWith("/admin")) {
        localStorage.removeItem("ci_token");
        if (!window.location.pathname.includes("/login")) window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
