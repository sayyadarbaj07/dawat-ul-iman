import { request } from "./request";

export const financeApi = {
  list() {
    return request("/finance");
  },
  summary(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/finance/summary${query ? `?${query}` : ""}`);
  },
  create(payload) {
    return request("/finance", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getCategories() {
    return request("/finance/categories");
  },
  createCategory(payload) {
    return request("/finance/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  deleteCategory(id) {
    return request(`/finance/categories/${id}`, { method: "DELETE" });
  }
};
