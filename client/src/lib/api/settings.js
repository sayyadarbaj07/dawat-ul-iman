import { request } from "./request";

export const settingsApi = {
  getSettings: () => request("/settings"),
  updateSettings: (data) =>
    request("/settings", {
      method: "PUT",
      body: data,
    }),
};
