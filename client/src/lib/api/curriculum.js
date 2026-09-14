import { request } from "./request";

export const curriculumApi = {
  list(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/curriculums${query ? `?${query}` : ''}`);
  },
  getByTeacher(teacherId) {
    return request(`/curriculums/teacher/${teacherId}`);
  },
  getByStudent(studentId) {
    return request(`/curriculums/student/${studentId}`);
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
  },
  
  // Progress endpoints
  logTeachingProgress(curriculumId, payload) {
    return request(`/curriculums/${curriculumId}/teaching-progress`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  getTeachingProgressHistory(curriculumId) {
    return request(`/curriculums/${curriculumId}/teaching-progress`);
  },
  logLearningProgress(curriculumId, studentId, payload) {
    return request(`/curriculums/${curriculumId}/student/${studentId}/learning-progress`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  getLearningProgressHistory(curriculumId, studentId) {
    return request(`/curriculums/${curriculumId}/student/${studentId}/learning-progress`);
  }
};
