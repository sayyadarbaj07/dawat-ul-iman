import { request } from "./request";

export const hostelSupervisorApi = {
  getAll() {
    return request("/hostel-supervisor");
  },
  create(payload) {
    return request("/hostel-supervisor", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(id, payload) {
    return request(`/hostel-supervisor/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  remove(id) {
    return request(`/hostel-supervisor/${id}`, { method: "DELETE" });
  }
};
