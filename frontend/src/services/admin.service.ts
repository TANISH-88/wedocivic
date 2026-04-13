import adminApi from "@/lib/adminApi";

export const adminService = {
  // Auth
  login: (email: string, password: string) =>
    adminApi.post("/admin/login", { email, password }),

  // Stats
  getStats: () => adminApi.get("/admin/stats"),

  // Users
  getUsers: (page = 1, limit = 20, search?: string, role?: string) =>
    adminApi.get("/admin/users", { params: { page, limit, search, role } }),

  toggleUserActive: (userId: string) =>
    adminApi.patch(`/admin/users/${userId}/toggle-active`),

  updateUserRole: (userId: string, role: string) =>
    adminApi.patch(`/admin/users/${userId}/role`, null, { params: { role } }),

  resetUserPassword: (userId: string, newPassword: string) =>
    adminApi.patch(`/admin/users/${userId}/reset-password`, { new_password: newPassword }),

  deleteUser: (userId: string) =>
    adminApi.delete(`/admin/users/${userId}`),

  // User Points Management
  updateUserPoints: (userId: string, points: number, action: string = "admin_adjustment") =>
    adminApi.patch(`/admin/users/${userId}/points`, { points, action }),

  getUserImpactLog: (userId: string) =>
    adminApi.get(`/admin/users/${userId}/impact-log`),

  // Posts
  getPosts: (page = 1, limit = 20) =>
    adminApi.get("/admin/posts", { params: { page, limit } }),

  deletePost: (postId: string) =>
    adminApi.delete(`/admin/posts/${postId}`),

  // Events
  getEvents: (page = 1, limit = 20) =>
    adminApi.get("/admin/events", { params: { page, limit } }),

  deleteEvent: (eventId: string) =>
    adminApi.delete(`/admin/events/${eventId}`),
};
