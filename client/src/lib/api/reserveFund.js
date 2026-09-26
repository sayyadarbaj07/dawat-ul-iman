import { request } from "./request";

export const reserveFundApi = {
  list(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/reserve-fund${query ? `?${query}` : ""}`);
  },
  summary(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/reserve-fund/summary${query ? `?${query}` : ""}`);
  },
  getSingle(id) {
    return request(`/reserve-fund/${id}`);
  },
  create(payload) {
    return request("/reserve-fund", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(id, payload) {
    return request(`/reserve-fund/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  delete(id) {
    return request(`/reserve-fund/${id}`, {
      method: "DELETE",
    });
  },
};
