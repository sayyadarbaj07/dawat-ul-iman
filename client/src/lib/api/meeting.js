import { request } from "./request";

export const meetingApi = {
  list: () => request("/meetings"),
  create: (data) => request("/meetings", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => request(`/meetings/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id) => request(`/meetings/${id}`, { method: "DELETE" }),
};
