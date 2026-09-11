import { request } from "./request";

export const classApi = {
  getClasses: async () => {
    return request("/classes");
  },

  getClassById: async (id) => {
    return request(`/classes/${id}`);
  },

  createClass: async (data) => {
    return request("/classes", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateClass: async (id, data) => {
    return request(`/classes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  updateClassStatus: async (id, status) => {
    return request(`/classes/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  deleteClass: async (id) => {
    return request(`/classes/${id}`, {
      method: "DELETE",
    });
  }
};
