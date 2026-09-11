import { API_BASE } from "./request";

export const pdfApi = {
  getStudentReportCard(studentId, examId, language = 'en') {
    const query = new URLSearchParams({ examId, language }).toString();
    return `${API_BASE}/pdf/student/${studentId}/report-card?${query}`;
  },
  getYearlyResult(studentId, language = 'en') {
    return `${API_BASE}/pdf/student/${studentId}/yearly-result?language=${language}`;
  },
  getAcademicHistory(studentId, language = 'en') {
    return `${API_BASE}/pdf/student/${studentId}/academic-history?language=${language}`;
  },
  getFinanceSummary(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return `${API_BASE}/pdf/finance/summary?${query}`;
  },
  getWeakStudentsReport(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return `${API_BASE}/pdf/weak-students?${query}`;
  },
  getStudentListReport(classId, language = 'en') {
    const params = { language };
    if (classId && classId !== "all") params.classId = classId;
    const query = new URLSearchParams(params).toString();
    return `${API_BASE}/pdf/student-list?${query}`;
  },
  getClassAttendanceReport(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return `${API_BASE}/pdf/attendance/class?${query}`;
  },
  getStudentAttendanceReport(studentId, filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return `${API_BASE}/pdf/attendance/student/${studentId}?${query}`;
  },
  getClassResult(classId, examId, examType, language = 'en') {
    const params = { language };
    if (classId && classId !== "all") params.class = classId;
    if (examId) params.examId = examId;
    else if (examType) params.examType = examType;
    const query = new URLSearchParams(params).toString();
    return `${API_BASE}/pdf/class/result?${query}`;
  },
  getClassMarksheets(classId, examId, examType, language = 'en') {
    const params = { language };
    if (classId && classId !== "all") params.class = classId;
    if (examId) params.examId = examId;
    else if (examType) params.examType = examType;
    const query = new URLSearchParams(params).toString();
    return `${API_BASE}/pdf/class/marksheets?${query}`;
  }
};
