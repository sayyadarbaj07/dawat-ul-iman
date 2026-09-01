import { request } from "./request";

export const studentApi = {
  list(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/students${query ? `?${query}` : ""}`);
  },
  get(id) {
    return request(`/students/${id}`);
  },
  create(payload) {
    return request("/students", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(id, payload) {
    return request(`/students/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  createWithFile(formData) {
    return request("/students", {
      method: "POST",
      body: formData,
    });
  },
  updateWithFile(id, formData) {
    return request(`/students/${id}`, {
      method: "PUT",
      body: formData,
    });
  },
  promote(id, payload) {
    return request(`/students/${id}/promote`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  bulkPromote(payload) {
    return request("/students/bulk-promote", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  remove(id) {
    return request(`/students/${id}`, { method: "DELETE" });
  },
};
