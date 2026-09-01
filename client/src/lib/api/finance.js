import { request, API_BASE } from "./request";

export const financeApi = {
  list(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/finance${query ? `?${query}` : ""}`);
  },
  summary(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/finance/summary${query ? `?${query}` : ""}`);
  },
  create(payload) {
    return request("/finance", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  createWithFile(formData) {
    return request("/finance", {
      method: "POST",
      body: formData, // request wrapper handles FormData
    });
  },
  voidTransaction(id) {
    return request(`/finance/${id}/void`, { method: "PUT" });
  },
  getStudentFeeRecords(studentId) {
    return request(`/finance/student/${studentId}/fees`);
  },
  setStudentFee(studentId, payload) {
    return request(`/finance/student/${studentId}/fees`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  async downloadPdf(url, filename) {
    const token = localStorage.getItem("dawat_token");
    const response = await fetch(`${API_BASE}${url}`, {
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
