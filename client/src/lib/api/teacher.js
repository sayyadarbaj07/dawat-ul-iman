import { request } from "./request";

export const teacherApi = {
  list() {
    return request("/teachers");
  },
  getMe() {
    return request("/teachers/me");
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
  createWithFile(formData) {
    return request("/teachers", {
      method: "POST",
      body: formData,
    });
  },
  updateWithFile(id, formData) {
    return request(`/teachers/${id}`, {
      method: "PUT",
      body: formData,
    });
  },
  remove(id, payload) {
    return request(`/teachers/${id}`, { 
      method: "DELETE",
      body: payload ? JSON.stringify(payload) : undefined
    });
  }
};
