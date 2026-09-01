const studentService = require("../services/studentService");

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
    if (req.file) {
      payload.photo = `/uploads/profiles/${req.file.filename}`;
    }
    const student = await studentService.updateStudent(req.params.id, payload);
    if (!student) return sendError(res, 404, "Student not found");
    return sendSuccess(res, 200, "Student updated successfully", student);
  } catch (error) {
    return sendError(res, 500, "Failed to update student", error);
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const student = await studentService.deleteStudent(req.params.id);
    if (!student) return sendError(res, 404, "Student not found");
    return sendSuccess(res, 200, "Student deleted successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to delete student", error);
  }
};

exports.promoteStudent = async (req, res) => {
  try {
    const student = await studentService.promoteStudent(req.params.id, req.body, req.user);
    return sendSuccess(res, 200, "Student promoted successfully", student);
  } catch (error) {
    return sendError(res, 500, "Failed to promote student", error);
  }
};

exports.bulkPromoteStudents = async (req, res) => {
  try {
    const { studentIds, ...promotionData } = req.body;
    await studentService.bulkPromoteStudents(studentIds, promotionData, req.user);
    return sendSuccess(res, 200, "Students promoted successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to promote students", error);
  }
};
