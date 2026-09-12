import { API_BASE } from "./request";

export const pdfApi = {
  getStudentIdCard(studentId, language = 'en') {
    return `/pdf/student/${studentId}/id-card?language=${language}`;
  },
  getTeacherIdCard(teacherId, language = 'en') {
    return `/pdf/teacher/${teacherId}/id-card?language=${language}`;
  },
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
  },
  async downloadPdf(url, filename) {
    const token = localStorage.getItem("dawat_token");
    // Ensure URL doesn't duplicate /api if it comes from getStudentIdCard
    // because getStudentIdCard returns /pdf/..., we need API_BASE or baseUrl
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    // Check if url already starts with http
    const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;
    
    const response = await fetch(fullUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!response.ok) {
      if (response.status === 403) throw new Error("403 Forbidden");
      throw new Error("Failed to download PDF");
    }
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  }
};
