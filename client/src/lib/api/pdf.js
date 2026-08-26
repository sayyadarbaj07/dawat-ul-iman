import { API_BASE } from "./request";

export const pdfApi = {
  getStudentReportCard(id) {
    return `${API_BASE}/pdf/student/${id}/report-card`;
  },
  getFinanceSummary() {
    return `${API_BASE}/pdf/finance/summary`;
  },
  getWeakStudentsReport(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return `${API_BASE}/pdf/weak-students?${query}`;
  },
  getClassAttendanceReport(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return `${API_BASE}/pdf/attendance/class?${query}`;
  },
  getStudentAttendanceReport(studentId, filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return `${API_BASE}/pdf/attendance/student/${studentId}?${query}`;
  }
};
