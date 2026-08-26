import { request } from "./request";

export const teacherApi = {
  list() {
    return request("/teachers");
  },
  create(payload) {
    return request("/teachers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(id, payload) {
    return request(`/teachers/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  remove(id) {
    return request(`/teachers/${id}`, { method: "DELETE" });
  }
};
