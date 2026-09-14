const TeacherTeachingProgress = require("../models/teacherTeachingProgressModel");
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

// Calculate progress status based on targets
const calculateStatus = (curriculum, completedCount) => {
  if (curriculum.totalLessons > 0 && completedCount >= curriculum.annualTarget) {
    return "Completed";
  }

  // Simple logic to determine if On Track vs Behind. 
  // If there's an expectedCompletionDate, calculate expected progress based on time elapsed.
  if (curriculum.startDate && curriculum.expectedCompletionDate && curriculum.annualTarget > 0) {
    const start = curriculum.startDate.getTime();
    const end = curriculum.expectedCompletionDate.getTime();
    const now = Date.now();

    if (now > end) {
      return completedCount >= curriculum.annualTarget ? "Completed" : "Behind";
    }

    const totalDuration = end - start;
    const elapsed = now - start;
    
    if (elapsed > 0) {
      const expectedPercentage = elapsed / totalDuration;
      const expectedCompleted = expectedPercentage * curriculum.annualTarget;
      
      if (completedCount >= expectedCompleted + (curriculum.annualTarget * 0.1)) {
        return "Ahead";
      } else if (completedCount < expectedCompleted - (curriculum.annualTarget * 0.1)) {
        return "Behind";
      }
    }
  }

  return "On Track";
};

exports.addTeachingProgress = async (req, res) => {
  try {
    const { curriculumId } = req.params;
    const { date, lessonFrom, lessonTo, topic, remarks } = req.body;

    const curriculum = await Curriculum.findById(curriculumId);
    if (!curriculum) {
      return sendError(res, 404, "Curriculum not found");
    }

    // Verify RBAC
    if (req.user.role === "teacher") {
      if (!curriculum.teacherId || curriculum.teacherId.toString() !== req.user.teacherId?.toString()) {
        return sendError(res, 403, "Forbidden: You are not assigned to this curriculum");
      }
    } else if (req.user.role !== "admin") {
      return sendError(res, 403, "Forbidden: Not authorized");
    }

    const from = parseInt(lessonFrom, 10);
    const to = parseInt(lessonTo, 10);

    if (isNaN(from) || isNaN(to) || from < 1 || to < from) {
      return sendError(res, 400, "Invalid lesson range");
    }

    // Create the log entry
    const progressLog = await TeacherTeachingProgress.create({
      curriculumId,
      teacherId: curriculum.teacherId || req.user.teacherId, // Fallback if admin logs for an unassigned curriculum (edge case)
      date: date || Date.now(),
      lessonFrom: from,
      lessonTo: to,
      topic,
      remarks,
    });

    // Update central curriculum completedLessonsList
    const newLessons = [];
    for (let i = from; i <= to; i++) {
      newLessons.push(i);
    }

    const updatedLessonsList = Array.from(new Set([...curriculum.completedLessonsList, ...newLessons])).sort((a, b) => a - b);
    const newStatus = calculateStatus(curriculum, updatedLessonsList.length);

    curriculum.completedLessonsList = updatedLessonsList;
    curriculum.status = newStatus;
    
    await curriculum.save();

    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "TEACHING_PROGRESS_UPDATED",
      description: `Logged teaching progress for ${curriculum.subject} (Lessons ${from}-${to})`,
      moduleName: "Curriculum",
    });

    return sendSuccess(res, 201, "Teaching progress logged successfully", { progressLog, completedLessons: updatedLessonsList.length, status: newStatus });
  } catch (error) {
    return sendError(res, 500, "Failed to log teaching progress", error);
  }
};

exports.getTeachingProgressHistory = async (req, res) => {
  try {
    const { curriculumId } = req.params;
    const history = await TeacherTeachingProgress.find({ curriculumId }).sort({ date: -1, createdAt: -1 });
    return sendSuccess(res, 200, "Teaching progress history fetched", history);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch teaching progress history", error);
  }
};
