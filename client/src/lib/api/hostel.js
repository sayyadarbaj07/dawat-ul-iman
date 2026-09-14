import { request } from "./request";

export const hostelApi = {
  // GET all allocations for a student
  getAllocations: (studentId) => request(`/students/${studentId}/hostel`),
  
  // POST create a new allocation
  assignHostel: (studentId, payload) => request(`/students/${studentId}/hostel`, {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  
  // PUT update existing allocation (remarks/inventory)
  updateAllocation: (allocationId, payload) => request(`/student-hostel/${allocationId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }),
  
  // PATCH transfer to a new room
  transferHostel: (allocationId, payload) => request(`/student-hostel/${allocationId}/transfer`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }),
  
  // PATCH vacate current room
  vacateHostel: (allocationId, payload) => request(`/student-hostel/${allocationId}/vacate`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }),
};

export default hostelApi;
