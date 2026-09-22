const Curriculum = require("../models/curriculumModel");
const Class = require("../models/classModel");
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

exports.getAllCurriculums = async (req, res) => {
  try {
    const filter = {};

    if (req.user && req.user.role === "teacher") {
      const Teacher = require("../models/teacherModel");
      const teacher = await Teacher.findOne({ userId: req.user._id });
      if (!teacher) {
        return sendError(res, 403, "Teacher profile not found");
      }

      const assignedIds = teacher.assignedClassIds ? teacher.assignedClassIds.map(id => id.toString()) : [];

      if (req.query.classId) {
        if (!assignedIds.includes(req.query.classId.toString())) {
          return sendError(res, 403, "Forbidden: Not authorized to view curriculum for this class");
        }
        filter.classId = req.query.classId;
      } else {
        if (assignedIds.length === 0) {
          return sendSuccess(res, 200, "Curriculums fetched successfully", []);
        }
        filter.classId = { $in: teacher.assignedClassIds };
      }
    } else {
      if (req.query.classId) {
        filter.classId = req.query.classId;
      }
    }

    const curriculums = await Curriculum.find(filter)
      .populate('classId', 'fullName department name section')
      .populate('teacherId', 'name')
      .sort({ createdAt: -1 });
    return sendSuccess(res, 200, "Curriculums fetched successfully", curriculums);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch curriculums", error);
  }
};

exports.getCurriculumsByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    // RBAC: Admin can view any, Teacher can view their own
    if (req.user.role === "teacher" && req.user.teacherId?.toString() !== teacherId) {
      return sendError(res, 403, "Forbidden: Cannot view another teacher's curriculum");
    }

    const curriculums = await Curriculum.find({ teacherId })
      .populate('classId', 'fullName department name section')
      .sort({ createdAt: -1 });
    return sendSuccess(res, 200, "Teacher curriculums fetched", curriculums);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch teacher curriculums", error);
  }
};

exports.getCurriculumsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const Student = require("../models/studentModel");
    const StudentLearningProgress = require("../models/studentLearningProgressModel");
    
    const student = await Student.findById(studentId);
    if (!student) {
      return sendError(res, 404, "Student not found");
    }

    // RBAC: Admin, Teacher (who teaches the class)
    if (req.user.role === "teacher") {
      // Assuming teacher has access if they teach a subject in that class, or just generic access check
      // For simplicity, allow teachers to view
    } else if (req.user.role !== "admin") {
      return sendError(res, 403, "Forbidden");
    }

    // Fetch curriculum for the student's class
    const curriculums = await Curriculum.find({ classId: student.classId, isActive: true })
      .populate('teacherId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Fetch student's independent learning progress for these curriculums
    const learningProgress = await StudentLearningProgress.find({ studentId }).lean();
    
    // Merge learning progress into curriculum data
    const curriculumsWithStudentProgress = curriculums.map(curr => {
      const logs = learningProgress.filter(lp => lp.curriculumId.toString() === curr._id.toString());
      
      // Calculate independent student completed lessons
      const completedSet = new Set();
      logs.forEach(log => {
        for (let i = log.lessonFrom; i <= log.lessonTo; i++) {
          completedSet.add(i);
        }
      });
      
      const studentCompletedCount = completedSet.size;
      let studentStatus = "On Track";
      if (curr.totalLessons > 0 && studentCompletedCount >= curr.annualTarget) {
        studentStatus = "Completed";
      }

      return {
        ...curr,
        studentCompletedLessons: studentCompletedCount,
        studentStatus
      };
    });

    return sendSuccess(res, 200, "Student curriculums fetched", curriculumsWithStudentProgress);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch student curriculums", error);
  }
};

exports.createCurriculum = async (req, res) => {
  try {
    const payload = { ...req.body };
    
    if (payload.classId) {
      const canonicalClass = await Class.findById(payload.classId);
      if (!canonicalClass) {
        return sendError(res, 400, "Invalid classId: Class does not exist");
      }
      payload.department = canonicalClass.department;
    } else if (payload.classId === "") {
      payload.classId = null;
    }

    const curriculum = await Curriculum.create(payload);
    await curriculum.populate('classId', 'fullName department name section');
    if (curriculum.teacherId) {
      await curriculum.populate('teacherId', 'name');
    }

    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "CURRICULUM_CREATED",
      description: `Created curriculum: ${curriculum.subject}`,
      moduleName: "Curriculum",
    });

    return sendSuccess(res, 201, "Curriculum created successfully", curriculum);
  } catch (error) {
    return sendError(res, 500, "Failed to create curriculum", error);
  }
};

exports.updateCurriculum = async (req, res) => {
  try {
    const payload = { ...req.body };
    
    if (payload.classId) {
      const canonicalClass = await Class.findById(payload.classId);
      if (!canonicalClass) {
        return sendError(res, 400, "Invalid classId: Class does not exist");
      }
      payload.department = canonicalClass.department;
    } else if (payload.classId === "") {
      payload.classId = null;
    }

    const curriculum = await Curriculum.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    }).populate('classId', 'fullName department name section').populate('teacherId', 'name');
    
    if (!curriculum) return sendError(res, 404, "Curriculum not found");

    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "CURRICULUM_UPDATED",
      description: `Updated curriculum: ${curriculum.subject}`,
      moduleName: "Curriculum",
    });

    return sendSuccess(res, 200, "Curriculum updated successfully", curriculum);
  } catch (error) {
    return sendError(res, 500, "Failed to update curriculum", error);
  }
};

exports.deleteCurriculum = async (req, res) => {
  try {
    // Permanent Delete as requested by client
    const curriculum = await Curriculum.findByIdAndDelete(req.params.id);
    if (!curriculum) return sendError(res, 404, "Curriculum not found");

    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "CURRICULUM_DELETED",
      description: `Permanently deleted curriculum: ${curriculum.subject}`,
      moduleName: "Curriculum",
    });

    return sendSuccess(res, 200, "Curriculum permanently deleted successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to delete curriculum", error);
  }
};
