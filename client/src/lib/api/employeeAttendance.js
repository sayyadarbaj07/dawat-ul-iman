import { request } from "./request";

export const employeeAttendanceApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/employee-attendance${query ? `?${query}` : ''}`);
  },
  
  getById: (id) => {
    return request(`/employee-attendance/${id}`);
  },
  
  create: (data) => {
    return request("/employee-attendance", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },
  
  update: (id, data) => {
    return request(`/employee-attendance/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },
  
  remove: (id) => {
    return request(`/employee-attendance/${id}`, {
      method: "DELETE"
    });
  },

  bulkCreate: (records) => {
    return request("/employee-attendance/bulk", {
      method: "POST",
      body: JSON.stringify(records)
    });
  }
};
