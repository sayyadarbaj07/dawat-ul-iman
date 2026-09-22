const mongoose = require("mongoose");
const EmployeeAttendance = require("../models/employeeAttendanceModel");
const Employee = require("../models/employeeModel");
const ActivityLog = require("../models/activityLogModel");

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

// Normalize Date
const normalizeDate = (dateString) => {
  const d = new Date(dateString);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Log wrapper
const logActivity = async (req, action, description) => {
  try {
    await ActivityLog.create({
      user: req.user._id,
      username: req.user.username,
      role: req.user.role,
      action,
      description,
      module: "EmployeeAttendance"
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};

exports.getEmployeeAttendance = async (req, res) => {
  try {
    const { employeeId, date, startDate, endDate, status } = req.query;

    const query = {};

    if (employeeId) {
      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return sendError(res, 400, "Invalid employeeId");
      }
      query.employeeId = employeeId;
    }

    if (date) {
      query.date = normalizeDate(date);
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = normalizeDate(startDate);
      if (endDate) query.date.$lte = normalizeDate(endDate);
    }

    if (status) {
      query.status = status;
    }

    const { page = 1, limit = 500 } = req.query;
    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.min(parseInt(limit, 10), 1000);
    const skip = (parsedPage - 1) * parsedLimit;

    const total = await EmployeeAttendance.countDocuments(query);
    const attendance = await EmployeeAttendance.find(query)
      .populate('employeeId', 'employeeId name designation')
      .populate('markedBy', 'username')
      .populate('updatedBy', 'username')
      .skip(skip)
      .limit(parsedLimit)
      .sort({ date: -1 })
      .lean();

    return sendSuccess(res, 200, "Employee attendance fetched", {
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

exports.getEmployeeAttendanceById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 400, "Invalid ObjectId");
    }

    const attendance = await EmployeeAttendance.findById(req.params.id)
      .populate('employeeId', 'employeeId name designation')
      .lean();
      
    if (!attendance) {
      return sendError(res, 404, "Attendance record not found");
    }

    return sendSuccess(res, 200, "Fetched successfully", attendance);
  } catch (error) {
    return sendError(res, 500, "Error fetching record", error);
  }
};

exports.createEmployeeAttendance = async (req, res) => {
  try {
    const { employeeId, date, status, remarks } = req.body;

    if (!employeeId || !date || !status) {
      return sendError(res, 400, "employeeId, date, and status are required");
    }

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return sendError(res, 400, "Invalid employeeId");
    }

    const validStatuses = ["Present", "Absent", "Late", "Leave"];
    if (!validStatuses.includes(status)) {
      return sendError(res, 400, "Invalid status");
    }

    const targetDate = normalizeDate(date);
    if (isNaN(targetDate.getTime())) {
      return sendError(res, 400, "Invalid date");
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return sendError(res, 404, "Employee not found");
    }

    if (!employee.isActive) {
      return sendError(res, 409, "Cannot mark new attendance for an inactive employee");
    }

    const setFields = {
      status,
      updatedBy: req.user._id
    };
    if (remarks !== undefined) {
      setFields.remarks = remarks;
    }

    const newAttendance = await EmployeeAttendance.findOneAndUpdate(
      { employeeId, date: targetDate },
      {
        $set: setFields,
        $setOnInsert: { markedBy: req.user._id }
      },
      { new: true, upsert: true }
    );
    
    await logActivity(req, "EMPLOYEE_ATTENDANCE_CREATED", `Admin created/updated ${status} attendance for employee ${employee.name} on ${targetDate.toISOString().split('T')[0]}`);

    return sendSuccess(res, 201, "Attendance created/updated successfully", newAttendance);
  } catch (error) {
    return sendError(res, 500, "Error creating attendance", error);
  }
};

exports.updateEmployeeAttendance = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 400, "Invalid ObjectId");
    }

    const { status, remarks } = req.body;

    // Do NOT allow changing employeeId or date
    const attendance = await EmployeeAttendance.findById(req.params.id);
    if (!attendance) {
      return sendError(res, 404, "Attendance not found");
    }

    if (status) {
      const validStatuses = ["Present", "Absent", "Late", "Leave"];
      if (!validStatuses.includes(status)) {
        return sendError(res, 400, "Invalid status");
      }
      attendance.status = status;
    }

    if (remarks !== undefined) {
      attendance.remarks = remarks;
    }

    attendance.updatedBy = req.user._id;
    await attendance.save();

    const employee = await Employee.findById(attendance.employeeId);
    
    await logActivity(req, "EMPLOYEE_ATTENDANCE_UPDATED", `Admin updated attendance to ${attendance.status} for employee ${employee ? employee.name : attendance.employeeId}`);

    return sendSuccess(res, 200, "Attendance updated", attendance);
  } catch (error) {
    return sendError(res, 500, "Error updating attendance", error);
  }
};

exports.deleteEmployeeAttendance = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 400, "Invalid ObjectId");
    }

    const attendance = await EmployeeAttendance.findByIdAndDelete(req.params.id);
    if (!attendance) {
      return sendError(res, 404, "Attendance not found");
    }

    const employee = await Employee.findById(attendance.employeeId);

    await logActivity(req, "EMPLOYEE_ATTENDANCE_DELETED", `Admin deleted attendance for employee ${employee ? employee.name : attendance.employeeId} on ${attendance.date.toISOString().split('T')[0]}`);

    return sendSuccess(res, 200, "Attendance deleted successfully");
  } catch (error) {
    return sendError(res, 500, "Error deleting attendance", error);
  }
};

exports.bulkCreateEmployeeAttendance = async (req, res) => {
  try {
    const records = req.body; // Expecting an array
    if (!Array.isArray(records) || records.length === 0) {
      return sendError(res, 400, "Expected an array of attendance records");
    }

    // Validation
    const validStatuses = ["Present", "Absent", "Late", "Leave"];
    const bulkOps = [];
    const dateGroups = new Set();
    const employeeSet = new Set();

    // Gather unique employeeIds
    for (const r of records) {
      if (!mongoose.Types.ObjectId.isValid(r.employeeId)) return sendError(res, 400, `Invalid employeeId: ${r.employeeId}`);
      employeeSet.add(r.employeeId);
    }
    
    const employees = await Employee.find({ _id: { $in: Array.from(employeeSet) } });
    const empMap = new Map(employees.map(e => [e._id.toString(), e]));

    for (const r of records) {
      if (!r.employeeId || !r.date || !r.status) {
        return sendError(res, 400, "employeeId, date, and status are required for each record");
      }
      
      const emp = empMap.get(r.employeeId.toString());
      if (!emp) return sendError(res, 404, `Employee not found: ${r.employeeId}`);
      if (!emp.isActive) return sendError(res, 409, `Employee ${emp.name} is inactive. Cannot mark new attendance.`);

      if (!validStatuses.includes(r.status)) return sendError(res, 400, `Invalid status: ${r.status}`);
      
      const targetDate = normalizeDate(r.date);
      if (isNaN(targetDate.getTime())) return sendError(res, 400, `Invalid date: ${r.date}`);
      
      const combo = `${r.employeeId}-${targetDate.getTime()}`;
      if (dateGroups.has(combo)) {
        return sendError(res, 400, `Duplicate record found in payload for employee ${emp.name} on date ${r.date}`);
      }
      dateGroups.add(combo);

      bulkOps.push({
        updateOne: {
          filter: { employeeId: r.employeeId, date: targetDate },
          update: {
            $set: {
              status: r.status,
              updatedBy: req.user._id,
              ...(r.remarks !== undefined && { remarks: r.remarks })
            },
            $setOnInsert: { markedBy: req.user._id }
          },
          upsert: true
        }
      });
    }

    const result = await EmployeeAttendance.bulkWrite(bulkOps);
    
    await logActivity(req, "EMPLOYEE_ATTENDANCE_BULK", `Admin marked/updated attendance for ${records.length} employees`);

    return sendSuccess(res, 200, "Bulk attendance processed successfully", {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount
    });

  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 409, "Duplicate attendance conflict");
    }
    return sendError(res, 500, "Error bulk creating attendance", error);
  }
};
