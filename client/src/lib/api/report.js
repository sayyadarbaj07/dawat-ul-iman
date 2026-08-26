import { request } from "./request";

export const reportApi = {
  getSummary: () => request("/reports/summary"),
  getWeakStudents: (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return request(`/reports/weak-students?${query}`);
  },
};
