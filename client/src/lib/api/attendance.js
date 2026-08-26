import { request } from "./request";

export const attendanceApi = {
  getByDate: (date, userType, className) => {
    let url = `/attendance?date=${date}`;
    if (userType) url += `&userType=${userType}`;
    if (className) url += `&className=${className}`;
    return request(url);
  },
  
  saveBatch: (date, records) => {
    return request("/attendance/batch", {
      method: "POST",
      body: JSON.stringify({ date, records })
    });
  },
  
  getClassAttendance: (className, month, year) => {
    let url = `/attendance/class?className=${className}`;
    if (month) url += `&month=${month}`;
    if (year) url += `&year=${year}`;
    return request(url);
  },
  
  getStudentSummary: (studentId) => {
    return request(`/attendance/student/${studentId}`);
  },
  
  getTeacherSummary: (teacherId) => {
    return request(`/attendance/teacher/${teacherId}`);
  }
};
