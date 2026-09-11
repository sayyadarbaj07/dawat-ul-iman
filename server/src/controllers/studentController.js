const studentService = require("../services/studentService");
const fs = require("fs");
const path = require("path");
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

exports.createStudent = async (req, res) => {
  try {
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

    return sendSuccess(res, 201, "Student created successfully", student);
  } catch (error) {
    return sendError(res, 500, "Failed to create student", error);
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    const students = await studentService.getAllStudents(req.query);
    return sendSuccess(res, 200, "Students fetched successfully", students);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch students", error);
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const student = await studentService.getStudentById(req.params.id);
    if (!student) return sendError(res, 404, "Student not found");
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

    // Dispatch Activity (No global notification for basic updates to avoid noise)
    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "STUDENT_UPDATED",
      description: `Updated student profile: ${student.name}`,
      moduleName: "Students",
      notifyAdmins: false // Just log it, don't spam notifications
    });

    return sendSuccess(res, 200, "Student updated successfully", student);
  } catch (error) {
    return sendError(res, 500, "Failed to update student", error);
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const existingStudent = await studentService.getStudentById(req.params.id);
    if (!existingStudent) return sendError(res, 404, "Student not found");

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
