const HostelAttendance = require("../models/hostelAttendanceModel");
const HostelAllocation = require("../models/hostelAllocationModel");
const Student = require("../models/studentModel");

const sendSuccess = (res, statusCode, message, data = null) => {
  const payload = { success: true, message };
  if (data !== null) payload.data = data;
  return res.status(statusCode).json(payload);
};

const sendError = (res, statusCode, message, error = null) => {
  const payload = { success: false, message };
  if (error) payload.error = error.message || error;
  return res.status(statusCode).json(payload);
};

exports.getAttendanceByDateAndSession = async (req, res) => {
  try {
    const { date, session } = req.query;
    if (!date || !session) {
      return sendError(res, 400, "Date and session are required");
    }

    // Parse date securely to start of day
    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);

    // Get active hostel allocations
    const activeAllocations = await HostelAllocation.find({ status: "active" }).populate({
      path: "studentId",
      populate: { path: "classId" }
    });

    // Get existing attendance for this date/session
    const existingAttendance = await HostelAttendance.find({
      date: queryDate,
      session
    });

    const attendanceMap = new Map();
    existingAttendance.forEach(a => {
      attendanceMap.set(a.studentId.toString(), a);
    });

    // Merge students with attendance
    const combinedData = activeAllocations.filter(alloc => alloc.studentId).map(alloc => {
      const student = alloc.studentId;
      const attendance = attendanceMap.get(student._id.toString());
      return {
        student: {
          _id: student._id,
          name: student.name,
          urduName: student.urduName,
          nameUrdu: student.nameUrdu,
          admissionNumber: student.admissionNumber,
          classId: student.classId
        },
        allocation: {
          _id: alloc._id,
          hostelName: alloc.hostelName,
          room: alloc.room,
          bed: alloc.bed
        },
        attendance: attendance || null
      };
    });

    return sendSuccess(res, 200, "Hostel attendance fetched successfully", combinedData);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch hostel attendance", error);
  }
};

exports.saveAttendance = async (req, res) => {
  try {
    const { studentId, date, session, status, remarks } = req.body;
    
    if (!studentId || !date || !session || !status) {
      return sendError(res, 400, "Missing required fields");
    }

    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);

    // Verify active allocation
    const activeAlloc = await HostelAllocation.findOne({ studentId, status: "active" });
    if (!activeAlloc) {
      return sendError(res, 400, "Student is not currently an active hostel resident");
    }

    const attendance = await HostelAttendance.findOneAndUpdate(
      { studentId, date: queryDate, session },
      { status, remarks },
      { new: true, upsert: true }
    );

    return sendSuccess(res, 200, "Hostel attendance saved successfully", attendance);
  } catch (error) {
    return sendError(res, 500, "Failed to save hostel attendance", error);
  }
};

exports.deleteAttendance = async (req, res) => {
  try {
    const attendance = await HostelAttendance.findByIdAndDelete(req.params.id);
    if (!attendance) {
      return sendError(res, 404, "Attendance record not found");
    }
    return sendSuccess(res, 200, "Hostel attendance permanently deleted successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to delete hostel attendance", error);
  }
};
