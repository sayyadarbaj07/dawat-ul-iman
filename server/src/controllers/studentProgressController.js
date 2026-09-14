const StudentLearningProgress = require("../models/studentLearningProgressModel");
const Curriculum = require("../models/curriculumModel");
const ActivityNotificationService = require("../services/activityNotificationService");

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

exports.addLearningProgress = async (req, res) => {
  try {
    const { curriculumId, studentId } = req.params;
    const { date, lessonFrom, lessonTo, remarks } = req.body;

    const curriculum = await Curriculum.findById(curriculumId);
    if (!curriculum) {
      return sendError(res, 404, "Curriculum not found");
    }

    // RBAC
    if (req.user.role !== "admin" && req.user.role !== "teacher") {
      return sendError(res, 403, "Forbidden: Not authorized");
    }

    const from = parseInt(lessonFrom, 10);
    const to = parseInt(lessonTo, 10);

    if (isNaN(from) || isNaN(to) || from < 1 || to < from) {
      return sendError(res, 400, "Invalid lesson range");
    }

    const progressLog = await StudentLearningProgress.create({
      curriculumId,
      studentId,
      date: date || Date.now(),
      lessonFrom: from,
      lessonTo: to,
      remarks,
    });

    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "STUDENT_LEARNING_PROGRESS_UPDATED",
      description: `Logged learning progress for student (Lessons ${from}-${to})`,
      moduleName: "Curriculum",
    });

    return sendSuccess(res, 201, "Learning progress logged successfully", progressLog);
  } catch (error) {
    return sendError(res, 500, "Failed to log learning progress", error);
  }
};

exports.getLearningProgressHistory = async (req, res) => {
  try {
    const { curriculumId, studentId } = req.params;
    const history = await StudentLearningProgress.find({ curriculumId, studentId }).sort({ date: -1, createdAt: -1 });
    return sendSuccess(res, 200, "Learning progress history fetched", history);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch learning progress history", error);
  }
};
