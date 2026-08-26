import { request } from "./request";

export const userApi = {
  list() {
    return request("/users");
  },
  create(payload) {
    return request("/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(id, payload) {
    return request(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  resetPassword(id, password) {
    return request(`/users/${id}/reset-password`, {
      method: "PUT",
      body: JSON.stringify({ password }),
    });
  },
  remove(id) {
    return request(`/users/${id}`, { method: "DELETE" });
  },
};
