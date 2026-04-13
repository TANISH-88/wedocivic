import axios from "axios";

const adminApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
});

// Request interceptor - attach admin token
adminApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("ci_admin_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor - handle 401/403
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("ci_admin_token");
        if (!window.location.pathname.includes("/admin/login")) {
          window.location.href = "/admin/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default adminApi;
