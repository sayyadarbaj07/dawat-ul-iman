import { request } from "./request";

export const eventApi = {
  list: () => request("/calendar"),
  create: (data) => request("/calendar", { method: "POST", body: JSON.stringify(data) }),
  delete: (id) => request(`/calendar/${id}`, { method: "DELETE" }),
};
