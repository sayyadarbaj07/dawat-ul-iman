import { request, API_BASE } from "./request";

export const studentDocumentsApi = {
  list(studentId) {
    return request(`/students/${studentId}/documents`);
  },

  upload(studentId, formData) {
    return request(`/students/${studentId}/documents`, {
      method: "POST",
      body: formData,
    });
  },

  replace(documentId, formData) {
    return request(`/student-documents/${documentId}/replace`, {
      method: "PUT",
      body: formData,
    });
  },

  verify(documentId) {
    return request(`/student-documents/${documentId}/verify`, {
      method: "PATCH",
    });
  },

  reject(documentId, rejectionReason) {
    return request(`/student-documents/${documentId}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ rejectionReason }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  },

  delete(documentId) {
    return request(`/student-documents/${documentId}`, {
      method: "DELETE",
    });
  },

  async download(documentId) {
    const token = localStorage.getItem("dawat_token");
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/student-documents/${documentId}/download`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to download document");
    }

    // Get the filename from the Content-Disposition header if possible
    const disposition = response.headers.get("content-disposition");
    let filename = "document";
    if (disposition && disposition.indexOf("filename=") !== -1) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = filenameRegex.exec(disposition);
      if (matches != null && matches[1]) { 
        filename = matches[1].replace(/['"]/g, "");
      }
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
  
  async view(documentId) {
    const token = localStorage.getItem("dawat_token");
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/student-documents/${documentId}/download`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to view document");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank");
    // Revoke the URL after a delay to ensure it loads in the new tab
    setTimeout(() => window.URL.revokeObjectURL(url), 10000);
  }
};
