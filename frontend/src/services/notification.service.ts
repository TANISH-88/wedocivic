import api from "@/lib/api";
export const notificationService = {
  getNotifications: () => api.get("/notifications"),
  markAllRead:      () => api.put("/notifications/read-all"),
};
