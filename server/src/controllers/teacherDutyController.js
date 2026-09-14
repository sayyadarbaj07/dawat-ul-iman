const mongoose = require("mongoose");
const TeacherDuty = require("../models/teacherDutyModel");
const Teacher = require("../models/teacherModel");
const Class = require("../models/classModel");
const ActivityLog = require("../models/activityLogModel");
const TeacherTimeline = require("../models/teacherTimelineModel");

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

// Helper to log activities
const logActivity = async (req, action, description) => {
  try {
    await ActivityLog.create({
      user: req.user._id,
      username: req.user.name || "Admin",
      role: req.user.role,
      action,
      description,
      module: "TeacherDuties"
    });
  } catch (error) {
    console.error("ActivityLog Error:", error);
  }
};

// Authorization helper
const checkTeacherAuth = async (req, teacherId) => {
  if (req.user.role === "admin") return true;
  if (req.user.role === "teacher") {
    const teacher = await Teacher.findById(teacherId);
    if (teacher && teacher.userId.toString() === req.user._id.toString()) {
      return true;
    }
  }
  return false;
};

// @desc    Get duties for a teacher
// @route   GET /api/teachers/:teacherId/duties
// @access  Private (Admin or Own Teacher)
exports.getDuties = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { status, dutyType, classId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return sendError(res, 400, "Invalid teacherId format");
    }

    const isAuthorized = await checkTeacherAuth(req, teacherId);
    if (!isAuthorized) {
      return sendError(res, 403, "Not authorized to view these duties");
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return sendError(res, 404, "Teacher not found");
    }

    const filter = { teacherId, isActive: true };
    if (status) filter.status = status;
    if (dutyType) filter.dutyType = dutyType;
    if (classId) {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return sendError(res, 400, "Invalid classId format");
      }
      filter.classId = classId;
    }

    const duties = await TeacherDuty.find(filter)
      .populate("classId", "className section")
      .populate("assignedBy", "name")
      .sort({ startDate: -1 });

    return sendSuccess(res, 200, "Duties fetched successfully", duties);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch duties", error);
  }
};

// @desc    Create a new duty
// @route   POST /api/teachers/:teacherId/duties
// @access  Private (Admin only)
exports.createDuty = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { dutyType, title, classId, startDate, endDate, remarks } = req.body;

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return sendError(res, 400, "Invalid teacherId format");
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return sendError(res, 404, "Teacher not found");
    }

    if (!dutyType || !title || !startDate) {
      return sendError(res, 400, "dutyType, title, and startDate are required");
    }

    if (endDate && new Date(endDate) < new Date(startDate)) {
      return sendError(res, 400, "endDate cannot be before startDate");
    }

    if (classId) {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return sendError(res, 400, "Invalid classId format");
      }
      const existingClass = await Class.findById(classId);
      if (!existingClass) {
        return sendError(res, 404, "Class not found");
      }
    }

    const duty = await TeacherDuty.create({
      teacherId,
      dutyType,
      title,
      classId: classId || undefined,
      startDate,
      endDate,
      remarks,
      assignedBy: req.user._id,
      status: "active",
      isActive: true
    });

    await logActivity(req, "TEACHER_DUTY_ASSIGNED", `Admin assigned duty ${dutyType} to teacher ${teacher.name}`);

    return sendSuccess(res, 201, "Duty created successfully", duty);
  } catch (error) {
    return sendError(res, 500, "Failed to create duty", error);
  }
};

// @desc    Update a duty
// @route   PUT /api/teacher-duties/:id
// @access  Private (Admin only)
exports.updateDuty = async (req, res) => {
  try {
    const { id } = req.params;
    const { dutyType, title, classId, startDate, endDate, remarks, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid duty ID format");
    }

    const duty = await TeacherDuty.findById(id);
    if (!duty || !duty.isActive) {
      return sendError(res, 404, "Duty not found");
    }

    const effectiveStartDate = startDate ? new Date(startDate) : duty.startDate;
    const effectiveEndDate = endDate ? new Date(endDate) : duty.endDate;

    if (effectiveEndDate && effectiveStartDate && effectiveEndDate < effectiveStartDate) {
      return sendError(res, 400, "endDate cannot be before startDate");
    }

    if (classId) {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return sendError(res, 400, "Invalid classId format");
      }
      const existingClass = await Class.findById(classId);
      if (!existingClass) {
        return sendError(res, 404, "Class not found");
      }
    }

    // Explicitly prevent mutating teacherId
    const updateData = {
      dutyType,
      title,
      classId,
      startDate,
      endDate,
      remarks,
      status
    };

    // Clean undefined fields
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const updatedDuty = await TeacherDuty.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    const teacher = await Teacher.findById(duty.teacherId);
    await logActivity(req, "TEACHER_DUTY_UPDATED", `Admin updated duty ${updatedDuty.dutyType} for teacher ${teacher ? teacher.name : duty.teacherId}`);

    return sendSuccess(res, 200, "Duty updated successfully", updatedDuty);
  } catch (error) {
    return sendError(res, 500, "Failed to update duty", error);
  }
};

// @desc    Change status of a duty
// @route   PATCH /api/teacher-duties/:id/status
// @access  Private (Admin only)
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid duty ID format");
    }

    const validStatuses = ["active", "completed", "cancelled"];
    if (!status || !validStatuses.includes(status)) {
      return sendError(res, 400, "Invalid status");
    }

    const duty = await TeacherDuty.findById(id);
    if (!duty || !duty.isActive) {
      return sendError(res, 404, "Duty not found");
    }

    duty.status = status;
    await duty.save();

    const teacher = await Teacher.findById(duty.teacherId);
    await logActivity(req, "TEACHER_DUTY_STATUS_CHANGED", `Admin changed status of duty ${duty.dutyType} to ${status} for teacher ${teacher ? teacher.name : duty.teacherId}`);

    return sendSuccess(res, 200, "Duty status updated successfully", duty);
  } catch (error) {
    return sendError(res, 500, "Failed to update duty status", error);
  }
};

// @desc    Soft delete a duty
// @route   DELETE /api/teacher-duties/:id
// @access  Private (Admin only)
exports.deleteDuty = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid duty ID format");
    }

    const duty = await TeacherDuty.findById(id);
    if (!duty || !duty.isActive) {
      return sendError(res, 404, "Duty not found");
    }

    duty.isActive = false;
    await duty.save();

    const teacher = await Teacher.findById(duty.teacherId);
    await logActivity(req, "TEACHER_DUTY_DELETED", `Admin deleted duty ${duty.dutyType} for teacher ${teacher ? teacher.name : duty.teacherId}`);

    return sendSuccess(res, 200, "Duty deleted successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to delete duty", error);
  }
};
