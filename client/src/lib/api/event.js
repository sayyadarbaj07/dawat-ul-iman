import { request } from "./request";

export const eventApi = {
  list: (params) => {
    const query = params ? new URLSearchParams(params).toString() : "";
    return request(`/calendar${query ? `?${query}` : ""}`);
  },
  create: (data) => request("/calendar", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => request(`/calendar/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id) => request(`/calendar/${id}`, { method: "DELETE" }),
};
