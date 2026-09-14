import { request } from "./request";

export const employeeApi = {
  list(params = {}) {
    // Convert params to query string
    const query = new URLSearchParams();
    if (params.isActive !== undefined) query.append("isActive", params.isActive);
    if (params.search) query.append("search", params.search);
    
    const queryString = query.toString();
    return request(`/employees${queryString ? `?${queryString}` : ""}`);
  },
  getById(id) {
    return request(`/employees/${id}`);
  },
  create(payload) {
    return request("/employees", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(id, payload) {
    return request(`/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  createWithFile(formData) {
    return request("/employees", {
      method: "POST",
      body: formData,
    });
  },
  updateWithFile(id, formData) {
    return request(`/employees/${id}`, {
      method: "PUT",
      body: formData,
    });
  },
  deactivate(id, payload) {
    return request(`/employees/${id}`, { 
      method: "DELETE",
      body: payload ? JSON.stringify(payload) : undefined
    });
  }
};
