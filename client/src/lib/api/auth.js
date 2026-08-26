import { request } from "./request";

export const authApi = {
  login(username, password) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },
  getProfile() {
    return request("/auth/profile");
  },
  changePassword(currentPassword, newPassword) {
    return request("/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }
};
