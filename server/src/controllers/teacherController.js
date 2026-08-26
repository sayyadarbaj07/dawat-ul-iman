const Teacher = require("../models/teacherModel");
const User = require("../models/userModel");

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

exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find().populate("userId", "username").sort({ createdAt: -1 });
    return sendSuccess(res, 200, "Teachers fetched successfully", teachers);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch teachers", error);
  }
};

exports.getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id).populate("userId", "username");
    if (!teacher) return sendError(res, 404, "Teacher not found");
    return sendSuccess(res, 200, "Teacher fetched successfully", teacher);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch teacher", error);
  }
};

exports.createTeacher = async (req, res) => {
  try {
    const { username, password, isActive, ...teacherData } = req.body;

    if (!username || !password) {
      return sendError(res, 400, "Username and password are required for teacher accounts");
    }

    // Check if username exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return sendError(res, 400, "Username already exists");
    }

    // Create User account
    const user = await User.create({
      username,
      password,
      name: teacherData.name,
      role: "teacher",
      isActive: isActive !== undefined ? isActive : true,
      initials: teacherData.name.substring(0, 2).toUpperCase(),
    });

    try {
      // Create Teacher profile linked to User
      const teacher = await Teacher.create({
        ...teacherData,
        userId: user._id,
      });
      return sendSuccess(res, 201, "Teacher created successfully", teacher);
    } catch (teacherError) {
      // Rollback User creation if Teacher creation fails
      await User.findByIdAndDelete(user._id);
      throw teacherError;
    }
  } catch (error) {
    return sendError(res, 500, "Failed to create teacher", error);
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!teacher) return sendError(res, 404, "Teacher not found");
    return sendSuccess(res, 200, "Teacher updated successfully", teacher);
  } catch (error) {
    return sendError(res, 500, "Failed to update teacher", error);
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) return sendError(res, 404, "Teacher not found");
    return sendSuccess(res, 200, "Teacher deleted successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to delete teacher", error);
  }
};
