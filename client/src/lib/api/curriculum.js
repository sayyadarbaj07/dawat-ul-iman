import { request } from "./request";

export const curriculumApi = {
  list() {
    return request("/curriculums");
  },
  create(payload) {
    return request("/curriculums", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(id, payload) {
    return request(`/curriculums/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  remove(id) {
    return request(`/curriculums/${id}`, { method: "DELETE" });
  }
};
