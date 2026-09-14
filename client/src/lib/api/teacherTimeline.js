import { request } from "./request";

export const teacherTimelineApi = {
  getTimeline(teacherId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/teacher-timeline/${teacherId}${query ? `?${query}` : ""}`);
  }
};
