import { request } from "./request";

export const teacherSalaryApi = {
  calculate(payload) {
    return request("/teacher-salary/calculate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  createDraft(payload) {
    return request("/teacher-salary", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getHistory(teacherId, params) {
    const qs = new URLSearchParams();
    if (params) {
      if (params.page) qs.append("page", params.page);
      if (params.limit) qs.append("limit", params.limit);
      if (params.month) qs.append("month", params.month);
      if (params.year) qs.append("year", params.year);
    }
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request(`/teacher-salary/history/${teacherId}${query}`);
  },
  paySalary(salaryId, payload) {
    return request(`/teacher-salary/pay/${salaryId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
};
