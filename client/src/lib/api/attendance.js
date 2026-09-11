import { request } from "./request";

export const attendanceApi = {
  getByDate: (date, userType, className, classId) => {
    let url = `/attendance?date=${date}`;
    if (userType) url += `&userType=${userType}`;
    if (className) url += `&className=${className}`;
    if (classId) url += `&classId=${classId}`;
    return request(url);
  },
  
  saveBatch: (date, classId, records) => {
    // We send classId at the root level if provided, along with the records array
    const body = { date, records };
    if (classId) body.classId = classId;
    
    return request("/attendance/batch", {
      method: "POST",
      body: JSON.stringify(body)
    });
  },
  
  getClassAttendance: (className, month, year, classId) => {
    let url = `/attendance/class?className=${encodeURIComponent(className)}`;
    if (month) url += `&month=${month}`;
    if (year) url += `&year=${year}`;
    if (classId) url += `&classId=${classId}`;
    return request(url);
  },
  
  getStudentSummary: (studentId) => {
    return request(`/attendance/student/${studentId}`);
  },
  
  getTeacherSummary: (teacherId) => {
    return request(`/attendance/teacher/${teacherId}`);
  }
};
