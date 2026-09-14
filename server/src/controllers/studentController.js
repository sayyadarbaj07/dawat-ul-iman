const studentService = require("../services/studentService");
const fs = require("fs");
const path = require("path");
const ActivityNotificationService = require("../services/activityNotificationService");
const { createStudentTimelineEvent } = require("../services/studentTimelineService");

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

exports.createStudent = async (req, res) => {
  try {
    if (req.user && req.user.role === "teacher") {
      if (!req.body.classId) {
        return sendError(res, 403, "Forbidden: Teachers must explicitly specify a valid classId when creating students.");
      }
      const { verifyTeacherClassAccess } = require("../middleware/authMiddleware");
      const hasAccess = await verifyTeacherClassAccess(req.user, req.body.classId, null);
      if (!hasAccess) {
        return sendError(res, 403, "Forbidden: You are not authorized to add students to this class.");
      }
    }
    const payload = { ...req.body };
    if (req.file) {
      payload.photo = `/uploads/profiles/${req.file.filename}`;
    }
    const student = await studentService.createStudent(payload);
    
    // Dispatch Activity & Notification
    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "STUDENT_CREATED",
      description: `Created new student: ${student.name} (Roll: ${student.rollNumber || 'N/A'})`,
      moduleName: "Students",
      notification: {
        title: "New Student Registered",
        message: `${student.name} has been newly registered.`,
        type: "success",
        link: `/students/${student._id}`,
        relatedEntity: { entityId: student._id, entityModel: "Student" }
      },
      notifyAdmins: true,
      classId: student.classId
    });

    createStudentTimelineEvent({
      studentId: student._id,
      eventType: "STUDENT_CREATED",
      performedBy: req.user._id,
      descriptionKey: "student_created",
      metadata: {
        name: student.name,
        rollNumber: student.rollNumber,
        admissionNumber: student.admissionNumber
      }
    });

    return sendSuccess(res, 201, "Student created successfully", student);
  } catch (error) {
    return sendError(res, 500, "Failed to create student", error);
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    const query = { ...req.query };

    if (req.user && req.user.role === "teacher") {
      const Teacher = require("../models/teacherModel");
      const teacher = await Teacher.findOne({ userId: req.user._id }).lean();
      
      const assignedIds = (teacher && teacher.assignedClassIds) ? teacher.assignedClassIds.map(id => id.toString()) : [];
      
      if (assignedIds.length === 0) {
        return sendSuccess(res, 200, "Students fetched successfully", { data: [], meta: { total: 0, page: 1, limit: query.limit || 50, totalPages: 0 } });
      }

      if (query.classId) {
        if (!assignedIds.includes(query.classId.toString())) {
          return sendError(res, 403, "Forbidden: You are not authorized to access students of this class.");
        }
      } else {
        query.classId = { $in: assignedIds };
      }
    }

    const students = await studentService.getAllStudents(query);
    return sendSuccess(res, 200, "Students fetched successfully", students);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch students", error);
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const student = await studentService.getStudentById(req.params.id);
    if (!student) return sendError(res, 404, "Student not found");

    if (req.user && req.user.role === "teacher") {
      const { verifyTeacherClassAccess } = require("../middleware/authMiddleware");
      const hasAccess = await verifyTeacherClassAccess(req.user, student.classId, student.className || student.studentClass);
      if (!hasAccess) {
        return sendError(res, 403, "Forbidden: You are not authorized to access this student.");
      }
    }

    return sendSuccess(res, 200, "Student fetched successfully", student);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch student", error);
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const payload = { ...req.body };
    const existingStudent = await studentService.getStudentById(req.params.id);
    if (!existingStudent) return sendError(res, 404, "Student not found");

    if (req.user && req.user.role === "teacher") {
      const { verifyTeacherClassAccess } = require("../middleware/authMiddleware");
      const hasAccess = await verifyTeacherClassAccess(req.user, existingStudent.classId, existingStudent.className || existingStudent.studentClass);
      if (!hasAccess) {
        return sendError(res, 403, "Forbidden: You are not authorized to update this student.");
      }

      if (req.body.classId && req.body.classId.toString() !== (existingStudent.classId ? existingStudent.classId.toString() : "")) {
         const hasTargetAccess = await verifyTeacherClassAccess(req.user, req.body.classId, null);
         if (!hasTargetAccess) {
            return sendError(res, 403, "Forbidden: You are not authorized to move student to this class.");
         }
      }
    }

    if (req.body.removePhoto === "true") {
      payload.photo = "";
    }

    if (req.file) {
      payload.photo = `/uploads/profiles/${req.file.filename}`;
    }

    if ((req.file || req.body.removePhoto === "true") && existingStudent.photo) {
      const oldPath = path.join(__dirname, "../../", existingStudent.photo);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (err) {
          console.error("Failed to delete old photo:", err);
        }
      }
    }

    const student = await studentService.updateStudent(req.params.id, payload);

    // Calculate changed fields for timeline metadata
    const changedFields = {};
    Object.keys(payload).forEach(key => {
      // Exclude passwords or deep complex objects for simplicity/security
      if (key === 'password' || key === 'photo') return;
      // Weak comparison for string/number equivalents
      if (String(existingStudent[key]) !== String(student[key])) {
        changedFields[key] = {
          previous: existingStudent[key],
          new: student[key]
        };
      }
    });

    // Dispatch Activity (No global notification for basic updates to avoid noise)
    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "STUDENT_UPDATED",
      description: `Updated student profile: ${student.name}`,
      moduleName: "Students",
      notifyAdmins: false // Just log it, don't spam notifications
    });

    if (Object.keys(changedFields).length > 0) {
      createStudentTimelineEvent({
        studentId: student._id,
        eventType: "STUDENT_UPDATED",
        performedBy: req.user._id,
        descriptionKey: "student_updated",
        metadata: {
          changedFields
        }
      });
    }

    return sendSuccess(res, 200, "Student updated successfully", student);
  } catch (error) {
    return sendError(res, 500, "Failed to update student", error);
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const existingStudent = await studentService.getStudentById(req.params.id);
    if (!existingStudent) return sendError(res, 404, "Student not found");

    if (req.user && req.user.role === "teacher") {
      const { verifyTeacherClassAccess } = require("../middleware/authMiddleware");
      const hasAccess = await verifyTeacherClassAccess(req.user, existingStudent.classId, existingStudent.className || existingStudent.studentClass);
      if (!hasAccess) {
        return sendError(res, 403, "Forbidden: You are not authorized to delete this student.");
      }
    }

    const student = await studentService.deleteStudent(req.params.id);
    
    if (existingStudent.photo) {
      const oldPath = path.join(__dirname, "../../", existingStudent.photo);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (err) {
          console.error("Failed to delete old photo:", err);
        }
      }
    }

    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "STUDENT_DELETED",
      description: `Deleted student: ${existingStudent.name}`,
      moduleName: "Students",
      notifyAdmins: false
    });

    return sendSuccess(res, 200, "Student deleted successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to delete student", error);
  }
};

exports.promoteStudent = async (req, res) => {
  try {
    const student = await studentService.promoteStudent(req.params.id, req.body, req.user);

    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "STUDENT_PROMOTED",
      description: `Promoted student ${student.name} to new class`,
      moduleName: "Students",
      notification: {
        title: "Student Promoted",
        message: `${student.name} has been promoted.`,
        type: "info",
        link: `/students/${student._id}`,
        relatedEntity: { entityId: student._id, entityModel: "Student" }
      },
      notifyAdmins: true,
      classId: student.classId
    });

    createStudentTimelineEvent({
      studentId: student._id,
      eventType: "STUDENT_PROMOTED",
      performedBy: req.user._id,
      descriptionKey: "student_promoted",
      metadata: {
        previousClassId: req.body.previousClassId || null,
        newClassId: req.body.newClassId || req.body.classId,
        newClassName: req.body.newClassName || req.body.className
      }
    });

    return sendSuccess(res, 200, "Student promoted successfully", student);
  } catch (error) {
    return sendError(res, 500, "Failed to promote student", error);
  }
};

exports.bulkPromoteStudents = async (req, res) => {
  try {
    const { studentIds, ...promotionData } = req.body;
    await studentService.bulkPromoteStudents(studentIds, promotionData, req.user);

    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "STUDENT_BULK_PROMOTED",
      description: `Bulk promoted ${studentIds.length} students`,
      moduleName: "Students",
      notification: {
        title: "Bulk Student Promotion",
        message: `${studentIds.length} students have been promoted.`,
        type: "success",
        link: `/students`
      },
      notifyAdmins: true
    });

    return sendSuccess(res, 200, "Students promoted successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to promote students", error);
  }
};
