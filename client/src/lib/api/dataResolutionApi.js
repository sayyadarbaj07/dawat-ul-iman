import { request } from "./request";

export const dataResolutionApi = {
  getSummary: () => request("/data-resolution/summary"),
  getStudents: () => request("/data-resolution/students"),
  getAttendance: () => request("/data-resolution/attendance"),
  getExams: () => request("/data-resolution/exams"),
  getCurriculum: () => request("/data-resolution/curriculum"),
  getTeachers: () => request("/data-resolution/teachers"),

  resolveStudent: (id, payload) => request(`/data-resolution/students/${id}/resolve`, {
    method: "POST", body: JSON.stringify(payload)
  }),
  resolveAttendance: (id, payload) => request(`/data-resolution/attendance/${id}/resolve`, {
    method: "POST", body: JSON.stringify(payload)
  }),
  resolveExam: (id, payload) => request(`/data-resolution/exams/${id}/resolve`, {
    method: "POST", body: JSON.stringify(payload)
  }),
  resolveCurriculum: (id, payload) => request(`/data-resolution/curriculum/${id}/resolve`, {
    method: "POST", body: JSON.stringify(payload)
  }),
  resolveTeacher: (id, payload) => request(`/data-resolution/teachers/${id}/resolve`, {
    method: "POST", body: JSON.stringify(payload)
  }),
};
