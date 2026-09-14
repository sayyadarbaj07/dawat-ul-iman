import { request } from "./request";

export const teacherDutiesApi = {
  // Get all duties for a specific teacher with optional filters
  getTeacherDuties: (teacherId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.dutyType) params.append("dutyType", filters.dutyType);
    if (filters.classId) params.append("classId", filters.classId);

    const queryString = params.toString();
    const url = `/teachers/${teacherId}/duties${queryString ? `?${queryString}` : ""}`;
    return request(url);
  },

  // Create a new duty for a teacher (Admin only)
  createTeacherDuty: (teacherId, data) => {
    return request(`/teachers/${teacherId}/duties`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  // Update an existing duty (Admin only)
  updateTeacherDuty: (dutyId, data) => {
    return request(`/teacher-duties/${dutyId}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  // Update duty status (Admin only)
  updateTeacherDutyStatus: (dutyId, status) => {
    return request(`/teacher-duties/${dutyId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  },

  // Soft delete a duty (Admin only)
  deleteTeacherDuty: (dutyId) => {
    return request(`/teacher-duties/${dutyId}`, {
      method: "DELETE"
    });
  }
};
