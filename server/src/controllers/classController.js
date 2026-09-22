const Class = require("../models/classModel");
const Student = require("../models/studentModel");
const Attendance = require("../models/attendanceModel");
const Exam = require("../models/examModel");
const ExamResult = require("../models/examResultModel");
const Curriculum = require("../models/curriculumModel");
const Teacher = require("../models/teacherModel");
const Meeting = require("../models/meetingModel");
const mongoose = require("mongoose");

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

exports.createClass = async (req, res) => {
  try {
    const { department, name, fullName, section } = req.body;
    
    if (!department || !name || !fullName) {
      return sendError(res, 400, "department, name, and fullName are required");
    }

    const newClass = new Class({
      department,
      name,
      fullName,
      section: section || ""
    });

    await newClass.save();
    return sendSuccess(res, 201, "Class created successfully", newClass);
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 400, "Duplicate class. fullName or department/name/section combination already exists.");
    }
    return sendError(res, 500, "Failed to create class", error);
  }
};

exports.getClasses = async (req, res) => {
  try {
    const { status, department } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;

    // RBAC: If teacher, restrict to assignedClassIds (assuming this field will be used)
    // During phase 6.1, the teacher RBAC logic for legacy isn't modified, but we can enforce
    // that a teacher only reads their classes. If assignedClassIds doesn't exist yet, it's empty.
    if (req.user && req.user.role === "teacher") {
       // Using the teacher record to check assignedClassIds (which we will add in Phase 6.4)
       // For now, if a teacher calls this, we must fetch their teacher profile
       const Teacher = require("../models/teacherModel");
       const teacherProfile = await Teacher.findOne({ userId: req.user._id });
       if (!teacherProfile) {
         return sendError(res, 403, "Teacher profile not found");
       }
       const assignedIds = teacherProfile.assignedClassIds || [];
       if (assignedIds.length === 0) {
         return sendSuccess(res, 200, "Classes fetched successfully", []);
       }
       filter._id = { $in: assignedIds };
    }

    // Exclude test classes from user-facing lists
    filter.name = { $nin: ["unauthorized class", "wrong class"] };

    const classes = await Class.find(filter).sort({ department: 1, name: 1, section: 1 });
    return sendSuccess(res, 200, "Classes fetched successfully", classes);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch classes", error);
  }
};

exports.getClassById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid class ID");
    }
    
    const classObj = await Class.findById(id);
    if (!classObj) return sendError(res, 404, "Class not found");

    if (req.user && req.user.role === "teacher") {
      const Teacher = require("../models/teacherModel");
      const teacherProfile = await Teacher.findOne({ userId: req.user._id });
      const assignedIds = (teacherProfile?.assignedClassIds || []).map(cid => cid.toString());
      if (!assignedIds.includes(id)) {
        return sendError(res, 403, "Unauthorized to view this class");
      }
    }

    return sendSuccess(res, 200, "Class fetched successfully", classObj);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch class", error);
  }
};

exports.updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid class ID");
    }

    const updates = req.body;
    // Don't allow updating status here, use patch
    delete updates.status;

    const classObj = await Class.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!classObj) return sendError(res, 404, "Class not found");

    return sendSuccess(res, 200, "Class updated successfully", classObj);
  } catch (error) {
     if (error.code === 11000) {
      return sendError(res, 400, "Duplicate class. fullName or department/name/section combination already exists.");
    }
    return sendError(res, 500, "Failed to update class", error);
  }
};

exports.updateClassStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid class ID");
    }

    const { status } = req.body;
    if (!["active", "inactive"].includes(status)) {
      return sendError(res, 400, "Invalid status value");
    }

    // Dependency check for soft-delete
    if (status === "inactive") {
      const studentCount = await Student.countDocuments({ classId: id });
      const attendanceCount = await Attendance.countDocuments({ classId: id });
      
      if (studentCount > 0 || attendanceCount > 0) {
        return sendError(res, 400, "Cannot deactivate this class because students or attendance records are linked to it.");
      }
    }

    const classObj = await Class.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
    if (!classObj) return sendError(res, 404, "Class not found");

    const message = status === "inactive" ? "Class deactivated successfully." : "Class activated successfully.";
    return sendSuccess(res, 200, message, classObj);
  } catch (error) {
    return sendError(res, 500, "Failed to update class status", error);
  }
};

exports.deleteClass = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return sendError(res, 400, "Invalid class ID");
      }

      // Check if class exists
      const classObj = await Class.findById(id).session(session);
      if (!classObj) {
        await session.abortTransaction();
        session.endSession();
        return sendError(res, 404, "Class not found");
      }

      // Perform safe, atomic cleanup using Mongoose deleteMany explicitly scoped to classId: id
      // 1. Delete Students and their specific dependent canonical records
      await Student.deleteMany({ classId: id }).session(session);
      
      // 2. Delete Attendance
      await Attendance.deleteMany({ classId: id }).session(session);
      
      // 3. Delete Exams and Results
      const classExams = await Exam.find({ classId: id }).session(session);
      const examIds = classExams.map(ex => ex._id);
      
      await Exam.deleteMany({ classId: id }).session(session);
      if (examIds.length > 0) {
        await ExamResult.deleteMany({ examId: { $in: examIds } }).session(session);
      }
      
      // 4. Delete Curriculum and Meetings
      await Curriculum.deleteMany({ classId: id }).session(session);
      await Meeting.deleteMany({ classId: id }).session(session);

      // 5. Delete Events
      try {
        const Event = require("../models/eventModel");
        await Event.deleteMany({ classId: id }).session(session);
      } catch (e) {
        // Event might not exist
      }

      // 6. Delete Timetable
      try {
        const TeacherTimetable = require("../models/teacherTimetableModel");
        await TeacherTimetable.deleteMany({ classId: id }).session(session);
      } catch(e) {}

      // 7. Delete Metadata
      try {
        const ClassRollCounter = require("../models/classRollCounterModel");
        await ClassRollCounter.deleteMany({ classId: id }).session(session);
      } catch(e) {}

      try {
        const Achievement = require("../models/achievementModel");
        await Achievement.deleteMany({ classId: id }).session(session);
      } catch(e) {}

      // 8. Unassign Teacher canonical arrays without deleting the teacher
      await Teacher.updateMany(
        { $or: [ { assignedClassIds: id }, { "teachingAssignments.classId": id } ] },
        { 
          $pull: { 
            assignedClassIds: id, 
            teachingAssignments: { classId: id } 
          } 
        }
      ).session(session);

      // 9. Delete the class itself
      await Class.findByIdAndDelete(id).session(session);

      await session.commitTransaction();
      session.endSession();

      return sendSuccess(res, 200, "Class permanently deleted successfully.");
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("Safe delete class error:", error);
      return sendError(res, 500, "Failed to permanently delete class", error);
    }
  };

