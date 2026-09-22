import { request } from "./request";

export const hostelAttendanceApi = {
  getByDateAndSession(date, session) {
    return request(`/hostel-attendance?date=${date}&session=${session}`);
  },
  save(payload) {
    return request("/hostel-attendance", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  remove(id) {
    return request(`/hostel-attendance/${id}`, { method: "DELETE" });
  }
};
