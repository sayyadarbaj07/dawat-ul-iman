import { request } from "./request";

export const achievementApi = {
  list: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/achievements${query ? `?${query}` : ""}`);
  },
  create: (data) => request("/achievements", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => request(`/achievements/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id) => request(`/achievements/${id}`, { method: "DELETE" }),
};
