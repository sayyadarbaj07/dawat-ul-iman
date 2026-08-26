const Attendance = require("../models/attendanceModel");
const attendanceService = require("../services/attendanceService");

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

exports.getAttendanceByDate = async (req, res) => {
  try {
    const { date, userType, className } = req.query;
    
    if (!date) {
      return sendError(res, 400, "Date is required");
    }

    const query = {
      date: new Date(date)
    };
    
    if (userType) query.userType = userType;
    if (className && className !== "all") query.className = className;

    const attendance = await Attendance.find(query).populate('userId', 'name fullName');
    
    return sendSuccess(res, 200, "Attendance fetched successfully", attendance);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch attendance", error);
  }
};

exports.saveBatchAttendance = async (req, res) => {
  try {
    const { date, records } = req.body;
    
    if (!date || !records || !Array.isArray(records)) {
      return sendError(res, 400, "Date and records array are required");
    }

    const targetDate = new Date(date);
    
    await attendanceService.saveBatchAttendance(targetDate, records, req.user);
    
    return sendSuccess(res, 200, "Attendance saved successfully");
  } catch (error) {
    const statusCode = error.status || 500;
    return sendError(res, statusCode, error.message || "Failed to save attendance", error);
  }
};

exports.getStudentAttendanceSummary = async (req, res) => {
  try {
    const { studentId } = req.params;
    const records = await Attendance.find({ userId: studentId, userType: "Student" }).sort({ date: -1 });
    
    let present = 0, absent = 0, late = 0;
    records.forEach(r => {
      if (r.status === "Present") present++;
      else if (r.status === "Absent") absent++;
      else if (r.status === "Late") late++;
    });

    return sendSuccess(res, 200, "Student attendance summary fetched successfully", { records, summary: { present, absent, late, total: records.length } });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch student attendance", error);
  }
};

exports.getTeacherAttendanceSummary = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const records = await Attendance.find({ userId: teacherId, userType: "Teacher" }).sort({ date: -1 });
    
    let present = 0, absent = 0, late = 0;
    records.forEach(r => {
      if (r.status === "Present") present++;
      else if (r.status === "Absent") absent++;
      else if (r.status === "Late") late++;
    });

    return sendSuccess(res, 200, "Teacher attendance summary fetched successfully", { records, summary: { present, absent, late, total: records.length } });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch teacher attendance", error);
  }
};

exports.getClassAttendance = async (req, res) => {
  try {
    const { className, month, year } = req.query;
    
    const query = { userType: "Student", className };
    
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const records = await Attendance.find(query).populate('userId', 'name fullName');
    return sendSuccess(res, 200, "Class attendance fetched successfully", records);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch class attendance", error);
  }
};
