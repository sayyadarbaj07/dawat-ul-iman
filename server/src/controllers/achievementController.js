const Achievement = require("../models/achievementModel");
const Student = require("../models/studentModel");
const Class = require("../models/classModel");
const Teacher = require("../models/teacherModel");

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

// @desc    Get achievements
// @route   GET /api/achievements
// @access  Private (Admin / Teacher)
exports.getAchievements = async (req, res) => {
  try {
    const { classId, studentId, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (studentId) filter.studentId = studentId;

    if (req.user.role === "teacher") {
      const teacherProfile = await Teacher.findOne({ userId: req.user._id });
      if (!teacherProfile) return sendError(res, 403, "Teacher profile not found");
      const assignedIds = teacherProfile.assignedClassIds || [];
      if (assignedIds.length === 0) return sendSuccess(res, 200, "Achievements fetched", { achievements: [], total: 0 });
      
      // If teacher explicitly queries a class, verify it is in their assigned classes
      if (classId) {
        if (!assignedIds.map(id => id.toString()).includes(classId)) {
          return sendError(res, 403, "Unauthorized to view achievements for this class");
        }
        filter.classId = classId;
      } else {
        filter.classId = { $in: assignedIds };
      }
    } else {
      // Admin
      if (classId) filter.classId = classId;
    }

    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.min(parseInt(limit, 10), 100);
    const skip = (parsedPage - 1) * parsedLimit;

    const total = await Achievement.countDocuments(filter);
    const achievements = await Achievement.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .populate("studentId", "name rollNumber")
      .populate("classId", "fullName name department");

    return sendSuccess(res, 200, "Achievements fetched", { achievements, total, page: parsedPage, pages: Math.ceil(total / parsedLimit) });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch achievements", error);
  }
};

// @desc    Create achievement
// @route   POST /api/achievements
// @access  Private (Admin only)
exports.createAchievement = async (req, res) => {
  try {
    const { studentId, classId, activityTitle, position, date, remarks } = req.body;

    if (!studentId || !classId || !activityTitle || !position || !date) {
      return sendError(res, 400, "Missing required fields");
    }

    const classObj = await Class.findById(classId);
    if (!classObj) return sendError(res, 400, "Class not found");

    const studentObj = await Student.findById(studentId);
    if (!studentObj) return sendError(res, 400, "Student not found");

    if (studentObj.classId.toString() !== classId.toString()) {
      return sendError(res, 400, "Student does not belong to the requested class");
    }

    const achievement = new Achievement({
      studentId,
      classId,
      activityTitle,
      position,
      date,
      remarks,
      createdBy: req.user._id
    });

    await achievement.save();
    return sendSuccess(res, 201, "Achievement created successfully", achievement);
  } catch (error) {
    return sendError(res, 500, "Failed to create achievement", error);
  }
};

// @desc    Update achievement
// @route   PUT /api/achievements/:id
// @access  Private (Admin only)
exports.updateAchievement = async (req, res) => {
  try {
    const { studentId, classId, activityTitle, position, date, remarks } = req.body;
    const achievement = await Achievement.findById(req.params.id);

    if (!achievement) return sendError(res, 404, "Achievement not found");

    if (classId && studentId) {
      const classObj = await Class.findById(classId);
      if (!classObj) return sendError(res, 400, "Class not found");
      const studentObj = await Student.findById(studentId);
      if (!studentObj) return sendError(res, 400, "Student not found");
      if (studentObj.classId.toString() !== classId.toString()) {
        return sendError(res, 400, "Student does not belong to the requested class");
      }
      achievement.classId = classId;
      achievement.studentId = studentId;
    }

    if (activityTitle) achievement.activityTitle = activityTitle;
    if (position) achievement.position = position;
    if (date) achievement.date = date;
    if (remarks !== undefined) achievement.remarks = remarks;

    await achievement.save();
    return sendSuccess(res, 200, "Achievement updated successfully", achievement);
  } catch (error) {
    return sendError(res, 500, "Failed to update achievement", error);
  }
};

// @desc    Delete achievement
// @route   DELETE /api/achievements/:id
// @access  Private (Admin only)
exports.deleteAchievement = async (req, res) => {
  try {
    const achievement = await Achievement.findByIdAndDelete(req.params.id);
    if (!achievement) return sendError(res, 404, "Achievement not found");
    return sendSuccess(res, 200, "Achievement deleted successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to delete achievement", error);
  }
};
