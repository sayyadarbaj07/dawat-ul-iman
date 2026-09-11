import { request } from "./request";

export const notificationApi = {
  getNotifications: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/notifications${qs ? `?${qs}` : ''}`);
  },
  getUnreadCount: () => request("/notifications/unread-count"),
  markAsRead: (id) => request(`/notifications/${id}/read`, { method: "PUT" }),
  markAllAsRead: () => request("/notifications/read-all", { method: "PUT" }),
  deleteNotification: (id) => request(`/notifications/${id}`, { method: "DELETE" }),
};

