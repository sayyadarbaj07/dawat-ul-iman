import { request, API_BASE } from "./request";

export const teacherDocumentsApi = {
  list(teacherId) {
    return request(`/teachers/${teacherId}/documents`);
  },

  upload(teacherId, formData) {
    return request(`/teachers/${teacherId}/documents`, {
      method: "POST",
      body: formData,
    });
  },

  replace(documentId, formData) {
    return request(`/teacher-documents/${documentId}/replace`, {
      method: "PUT",
      body: formData,
    });
  },

  verify(documentId) {
    return request(`/teacher-documents/${documentId}/verify`, {
      method: "PATCH",
    });
  },

  reject(documentId, rejectionReason) {
    return request(`/teacher-documents/${documentId}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ rejectionReason }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  },

  delete(documentId) {
    return request(`/teacher-documents/${documentId}`, {
      method: "DELETE",
    });
  },

  async download(documentId) {
    const token = localStorage.getItem("dawat_token");
    const response = await fetch(`${API_BASE}/teacher-documents/${documentId}/download`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || "Failed to download document");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "download";
    if (contentDisposition && contentDisposition.indexOf("attachment") !== -1) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = filenameRegex.exec(contentDisposition);
      if (matches != null && matches[1]) {
        filename = matches[1].replace(/['"]/g, "");
      }
    }

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};
