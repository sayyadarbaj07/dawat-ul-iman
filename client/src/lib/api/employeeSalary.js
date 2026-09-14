import { request } from "./request";

export const employeeSalaryApi = {
  calculate(payload) {
    return request("/employee-salary/calculate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  createDraft(payload) {
    return request("/employee-salary", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
};
