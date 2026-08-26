import { request } from "./request";

export const examApi = {
  listExams() {
    return request("/exams");
  },
  createExam(payload) {
    return request("/exams", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  removeExam(id) {
    return request(`/exams/${id}`, { method: "DELETE" });
  },
  listResults() {
    return request("/exams/results");
  },
  saveResult(payload) {
    return request("/exams/results", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  removeResult(id) {
    return request(`/exams/results/${id}`, { method: "DELETE" });
  }
};
