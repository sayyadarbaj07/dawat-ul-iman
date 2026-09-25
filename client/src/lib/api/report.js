import { request } from "./request";

export const reportApi = {
  getSummary: () => request("/reports/summary"),
  getWeakStudents: (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return request(`/reports/weak-students?${query}`);
  },
  getDetailedFinance: (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return request(`/reports/finance/detailed?${query}`);
  },

  getStudentList: (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return request(`/reports/students/list?${query}`);
  },
  getExamAnalytics: (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return request(`/reports/exams/analytics?${query}`);
  },
  getCombinedResult: (studentId, filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return request(`/reports/student/${studentId}/combined-result${query ? `?${query}` : ''}`);
  },
};
