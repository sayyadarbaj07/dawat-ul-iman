import { request } from "./request";

export const examApi = {
  listExams(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/exams${query ? `?${query}` : ''}`);
  },
  createExam(payload) {
    return request("/exams", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  removeExam(id) {
    return request(`/exams/${id}`, { method: "DELETE" });
  },
  listResults(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/exams/results${query ? `?${query}` : ''}`);
  },
  saveResult(payload) {
    return request("/exams/results", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  removeResult(id) {
    return request(`/exams/results/${id}`, { method: "DELETE" });
  },
  saveBulkMarks(payload) {
    return request("/exams/results/bulk", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getCalculatedResults(examId) {
    return request(`/exams/${examId}/calculated`);
  },
  getStudentHistoricalResults(studentId) {
    return request(`/exams/results/student/${studentId}`);
  },
  async downloadPdf(url, filename) {
    const token = localStorage.getItem("dawat_token");
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const response = await fetch(`${baseUrl}${url}`, {
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
