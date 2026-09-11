const Attendance = require("../models/attendanceModel");
const attendanceService = require("../services/attendanceService");
const mongoose = require("mongoose");
const Teacher = require("../models/teacherModel");
const Class = require("../models/classModel");

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
    const { date, userType, className, classId } = req.query;
    
    if (!date) {
      return sendError(res, 400, "Date is required");
    }

    if (classId && !mongoose.Types.ObjectId.isValid(classId)) {
      return sendError(res, 400, "Invalid classId format");
    }

    // Teacher authorization check
    let teacherFilter = null;
    if (req.user.role === "teacher") {
      const teacherProfile = await Teacher.findOne({ userId: req.user._id });
      
      const hasClassIds = teacherProfile && teacherProfile.assignedClassIds && teacherProfile.assignedClassIds.length > 0;
      const hasLegacyClasses = teacherProfile && teacherProfile.assignedClasses && teacherProfile.assignedClasses.length > 0;

      if (!hasClassIds && !hasLegacyClasses) {
        return sendError(res, 403, "Teacher is not assigned to any classes");
      }
      
      if (classId) {
        if (!hasClassIds || !teacherProfile.assignedClassIds.includes(classId.toString())) {
          return sendError(res, 403, "Not authorized to access this class");
        }
      } else if (className && className !== "all") {
        if (!hasLegacyClasses || !teacherProfile.assignedClasses.includes(className)) {
          return sendError(res, 403, "Not authorized to access this class (legacy)");
        }
      } else {
        // Global request (e.g. from Dashboard): automatically restrict to assigned classes
        teacherFilter = { $or: [] };
        if (hasClassIds) {
          teacherFilter.$or.push({ classId: { $in: teacherProfile.assignedClassIds } });
        }
        if (hasLegacyClasses) {
          teacherFilter.$or.push({ className: { $in: teacherProfile.assignedClasses } });
        }
      }
    }

    const query = {
      date: new Date(date)
    };
    
    if (userType) query.userType = userType;
    if (className && className !== "all") query.className = className;
    if (classId) query.classId = classId;
    
    if (teacherFilter) {
      Object.assign(query, teacherFilter);
    }

    const { page = 1, limit = 500 } = req.query; // High default for single-day class view
    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.min(parseInt(limit, 10), 1000);
    const skip = (parsedPage - 1) * parsedLimit;

    const total = await Attendance.countDocuments(query);
    const attendance = await Attendance.find(query)
      .populate('userId', 'name fullName')
      .skip(skip)
      .limit(parsedLimit)
      .lean();
    
    return sendSuccess(res, 200, "Attendance fetched successfully", {
      data: attendance,
      meta: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch attendance", error);
  }
};

exports.saveBatchAttendance = async (req, res) => {
  try {
    const { date, records, classId } = req.body;
    
    if (!date || !records || !Array.isArray(records)) {
      return sendError(res, 400, "Date and records array are required");
    }

    const targetDate = new Date(date);
    
    await attendanceService.saveBatchAttendance(targetDate, records, req.user, classId);
    
    const ActivityNotificationService = require("../services/activityNotificationService");
    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "ATTENDANCE_MARKED",
      description: `Marked attendance for ${records.length} records on ${targetDate.toLocaleDateString()}`,
      moduleName: "Attendance",
      notification: {
        title: "Attendance Updated",
        message: `Attendance has been recorded for ${records.length} students/teachers.`,
        type: "info",
        link: `/attendance`
      },
      notifyAdmins: true,
      classId: classId
    });

    return sendSuccess(res, 200, "Attendance saved successfully");
  } catch (error) {
    const statusCode = error.status || 500;
    return sendError(res, statusCode, error.message || "Failed to save attendance", error);
  }
};

exports.getStudentAttendanceSummary = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return sendError(res, 400, "Invalid studentId format");
    }

    // IDOR Protection
    if (req.user.role === "student" && req.user._id.toString() !== studentId) {
      return sendError(res, 403, "Not authorized to view this student's attendance");
    }
    // Note: Parent IDOR is implicitly deferred to existing relationship logic if it exists,
    // otherwise they cannot access another student. If a parent is linked, they should pass through
    // specific parent endpoints. Here we block blatant misuse if necessary, but keep it simple.
    
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
    
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return sendError(res, 400, "Invalid teacherId format");
    }
    
    if (req.user.role === "teacher" && req.user._id.toString() !== teacherId) {
      return sendError(res, 403, "Teachers can only view their own attendance");
    }

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
    const { className, month, year, classId } = req.query;
    
    if (classId && !mongoose.Types.ObjectId.isValid(classId)) {
      return sendError(res, 400, "Invalid classId format");
    }

    if (req.user.role === "teacher") {
      const teacherProfile = await Teacher.findOne({ userId: req.user._id });
      
      const hasClassIds = teacherProfile && teacherProfile.assignedClassIds && teacherProfile.assignedClassIds.length > 0;
      const hasLegacyClasses = teacherProfile && teacherProfile.assignedClasses && teacherProfile.assignedClasses.length > 0;

      if (!hasClassIds && !hasLegacyClasses) {
        return sendError(res, 403, "Teacher is not assigned to any classes");
      }
      let authorized = false;
      let resolvedFullName = null;

      if (classId) {
        const cls = await Class.findById(classId);
        if (cls) {
          resolvedFullName = cls.fullName;
        }

        if (hasClassIds && teacherProfile.assignedClassIds.includes(classId.toString())) {
          authorized = true;
        } else if (hasLegacyClasses && resolvedFullName && teacherProfile.assignedClasses.includes(resolvedFullName)) {
          authorized = true;
        }
      } else if (className) {
        if (hasLegacyClasses && teacherProfile.assignedClasses.includes(className)) {
          authorized = true;
        }
      }

      if (!authorized) {
        return sendError(res, 403, "Not authorized to access this class history");
      }
    }

    let secureClassName = className;

    if (classId) {
      const cls = await Class.findById(classId);
      if (cls) {
        secureClassName = cls.fullName;
      }
    }



    const query = { userType: "Student" };
    
    // Support querying both new canonical records and old legacy records
    if (classId && secureClassName) {
      query.$or = [{ classId }, { className: secureClassName }];
    } else if (classId) {
      query.classId = classId;
    } else if (secureClassName) {
      query.className = secureClassName;
    }
    
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const { page = 1, limit = 2000 } = req.query; // Huge default to allow month-grid rendering
    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.min(parseInt(limit, 10), 3000);
    const skip = (parsedPage - 1) * parsedLimit;

    const total = await Attendance.countDocuments(query);
    const records = await Attendance.find(query)
      .populate('userId', 'name fullName')
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    return sendSuccess(res, 200, "Class attendance fetched successfully", {
      data: records,
      meta: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch class attendance", error);
  }
};

