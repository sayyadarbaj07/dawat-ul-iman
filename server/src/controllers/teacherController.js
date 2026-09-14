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
    if (req.user && req.user.role === "teacher") {
       return sendError(res, 403, "Teachers are not allowed to fetch all teachers");
    }
    const teachers = await Teacher.find().populate("userId", "username").sort({ createdAt: -1 });
    return sendSuccess(res, 200, "Teachers fetched successfully", teachers);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch teachers", error);
  }
};

exports.getCurrentTeacher = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "teacher") {
      return sendError(res, 403, "Only teachers can access this endpoint");
    }
    const teacher = await Teacher.findOne({ userId: req.user._id }).populate("userId", "username");
    if (!teacher) return sendError(res, 404, "Teacher profile not found");
    return sendSuccess(res, 200, "Teacher profile fetched successfully", teacher);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch teacher profile", error);
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

const Class = require("../models/classModel");

exports.createTeacher = async (req, res) => {
  try {
    const { username, password, isActive, joiningDate, deactivationDate, ...teacherData } = req.body;

    if (!username || !password) {
      return sendError(res, 400, "Username and password are required for teacher accounts");
    }
    
    if (!joiningDate || isNaN(new Date(joiningDate).getTime())) {
      return sendError(res, 400, "Valid joining date is required for new teachers");
    }

    // Process teachingAssignments if provided
    if (teacherData.teachingAssignments !== undefined) {
      if (typeof teacherData.teachingAssignments === 'string') {
        try {
          teacherData.teachingAssignments = JSON.parse(teacherData.teachingAssignments);
        } catch(e) {}
      }
      if (Array.isArray(teacherData.teachingAssignments)) {
        const uniqueCombos = new Map();
        const classIdSet = new Set();
        for (const assignment of teacherData.teachingAssignments) {
          if (!assignment.classId || !assignment.subjectId) continue;
          
          const subject = String(assignment.subjectId).trim();
          if (!subject) continue;
          
          const mongoose = require("mongoose");
          if (!mongoose.Types.ObjectId.isValid(assignment.classId)) {
            return sendError(res, 400, `Invalid class ID format: ${assignment.classId}`);
          }
          const cls = await Class.findById(assignment.classId);
          if (!cls || cls.status !== "active") {
            return sendError(res, 400, `Invalid or inactive class ID provided: ${assignment.classId}`);
          }
          
          const key = `${assignment.classId.toString()}_${subject.toLowerCase()}`;
          if (!uniqueCombos.has(key)) {
            uniqueCombos.set(key, { classId: assignment.classId, subjectId: subject });
            classIdSet.add(assignment.classId.toString());
          }
        }
        teacherData.teachingAssignments = Array.from(uniqueCombos.values());
        teacherData.assignedClassIds = Array.from(classIdSet);
        delete teacherData.assignedClasses;
      }
    } else if (teacherData.assignedClassIds && Array.isArray(teacherData.assignedClassIds)) {
      // Legacy validation
      for (const cid of teacherData.assignedClassIds) {
        const cls = await Class.findById(cid);
        if (!cls || cls.status !== "active") {
          return sendError(res, 400, `Invalid or inactive class ID provided: ${cid}`);
        }
      }
      delete teacherData.assignedClasses;
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
      const payload = {
        ...teacherData,
        joiningDate: new Date(joiningDate),
        deactivationDate: deactivationDate ? new Date(deactivationDate) : null,
        userId: user._id,
      };
      if (payload.deactivationDate && payload.deactivationDate < payload.joiningDate) {
        return sendError(res, 400, "Deactivation date cannot be earlier than joining date");
      }
      if (req.file) {
        payload.photo = `/uploads/profiles/${req.file.filename}`;
      }
      const teacher = await Teacher.create(payload);
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
    const payload = { ...req.body };
    
    // Process teachingAssignments if provided
    if (payload.teachingAssignments !== undefined) {
      if (typeof payload.teachingAssignments === 'string') {
        try {
          payload.teachingAssignments = JSON.parse(payload.teachingAssignments);
        } catch(e) {}
      }
      if (Array.isArray(payload.teachingAssignments)) {
        const uniqueCombos = new Map();
        const classIdSet = new Set();
        for (const assignment of payload.teachingAssignments) {
          if (!assignment.classId || !assignment.subjectId) continue;
          
          const subject = String(assignment.subjectId).trim();
          if (!subject) continue;
          
          const cls = await Class.findById(assignment.classId);
          if (!cls || cls.status !== "active") {
            return sendError(res, 400, `Invalid or inactive class ID provided: ${assignment.classId}`);
          }
          
          const key = `${assignment.classId.toString()}_${subject.toLowerCase()}`;
          if (!uniqueCombos.has(key)) {
            uniqueCombos.set(key, { classId: assignment.classId, subjectId: subject });
            classIdSet.add(assignment.classId.toString());
          }
        }
        payload.teachingAssignments = Array.from(uniqueCombos.values());
        payload.assignedClassIds = Array.from(classIdSet);
        delete payload.assignedClasses;
      }
    } else if (payload.assignedClassIds && Array.isArray(payload.assignedClassIds)) {
      // Legacy validation
      for (const cid of payload.assignedClassIds) {
        const cls = await Class.findById(cid);
        if (!cls || cls.status !== "active") {
          return sendError(res, 400, `Invalid or inactive class ID provided: ${cid}`);
        }
      }
      delete payload.assignedClasses;
    }

    if (payload.joiningDate && isNaN(new Date(payload.joiningDate).getTime())) {
      return sendError(res, 400, "Valid joining date is required");
    }
    if (payload.deactivationDate && isNaN(new Date(payload.deactivationDate).getTime())) {
      return sendError(res, 400, "Valid deactivation date is required");
    }
    
    // Fetch existing teacher to compare dates if not fully provided
    const existingTeacher = await Teacher.findById(req.params.id);
    if (!existingTeacher) return sendError(res, 404, "Teacher not found");
    
    const effectiveJoiningDate = payload.joiningDate ? new Date(payload.joiningDate) : existingTeacher.joiningDate;
    const effectiveDeactivationDate = payload.deactivationDate !== undefined ? (payload.deactivationDate ? new Date(payload.deactivationDate) : null) : existingTeacher.deactivationDate;
    
    if (effectiveDeactivationDate && effectiveJoiningDate && effectiveDeactivationDate < effectiveJoiningDate) {
      return sendError(res, 400, "Deactivation date cannot be earlier than joining date");
    }

    if (req.file) {
      payload.photo = `/uploads/profiles/${req.file.filename}`;
    }
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, payload, {
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
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return sendError(res, 404, "Teacher not found");

    const deactivationDate = req.body.deactivationDate || new Date();
    if (teacher.joiningDate && new Date(deactivationDate) < new Date(teacher.joiningDate)) {
      return sendError(res, 400, "Deactivation date cannot be earlier than joining date");
    }

    // Soft delete via User model
    const user = await User.findById(teacher.userId);
    if (user) {
      user.isActive = false;
      await user.save();
    }
    
    teacher.deactivationDate = deactivationDate;
    await teacher.save();

    return sendSuccess(res, 200, "Teacher deactivated successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to deactivate teacher", error);
  }
};
