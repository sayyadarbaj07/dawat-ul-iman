import { request } from "./request";

export const studentTimelineApi = {
  getTimeline: (studentId, params = { page: 1, limit: 20 }) => {
    const searchParams = new URLSearchParams(params);
    return request(`/students/${studentId}/timeline?${searchParams.toString()}`);
  }
};
