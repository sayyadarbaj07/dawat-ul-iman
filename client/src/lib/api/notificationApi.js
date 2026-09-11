import api from "./api";

const notificationApi = {
  getNotifications: async (page = 1, limit = 20, isRead) => {
    const params = new URLSearchParams({ page, limit });
    if (isRead !== undefined) params.append("isRead", isRead);
    const res = await api.get(`/notifications?${params.toString()}`);
    return res.data;
  },

  getUnreadCount: async () => {
    const res = await api.get("/notifications/unread-count");
    return res.data;
  },

  markAsRead: async (id) => {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
  },

  markAllAsRead: async () => {
    const res = await api.patch("/notifications/read-all");
    return res.data;
  },

  deleteNotification: async (id) => {
    const res = await api.delete(`/notifications/${id}`);
    return res.data;
  }
};

export default notificationApi;
