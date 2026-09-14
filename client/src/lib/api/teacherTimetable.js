import { request } from "./request";

export const teacherTimetableApi = {
  list(teacherId) {
    return request(`/teacher-timetable/${teacherId}`);
  },
  create(data) {
    return request(`/teacher-timetable`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  update(id, data) {
    return request(`/teacher-timetable/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  delete(id) {
    return request(`/teacher-timetable/${id}`, {
      method: "DELETE",
    });
  }
};
