const Student = require("../models/studentModel");
const Attendance = require("../models/attendanceModel");
const Exam = require("../models/examModel");
const Curriculum = require("../models/curriculumModel");
const Teacher = require("../models/teacherModel");
const Class = require("../models/classModel");
const ActivityLog = require("../models/activityLogModel");

/**
 * Helper to fetch unresolved records
 */
const getUnresolvedStudents = async () => {
  return await Student.find({ classId: null, $or: [{ className: { $nin: [null, ""] } }, { studentClass: { $nin: [null, ""] } }] }).lean();
};

const getUnresolvedAttendances = async () => {
  return await Attendance.find({ classId: null, className: { $nin: [null, ""] } }).populate("userId", "name classId className studentClass").lean();
};

const getUnresolvedExams = async () => {
  return await Exam.find({ classId: null, class: { $nin: [null, ""] } }).lean();
};

const getUnresolvedCurriculums = async () => {
  return await Curriculum.find({ classId: null, $or: [{ department: { $nin: [null, ""] } }, { class: { $nin: [null, ""] } }] }).lean();
};

const getUnresolvedTeachers = async () => {
  return await Teacher.find({ "assignedClasses.0": { $exists: true } }).lean();
};

exports.getSummary = async (req, res, next) => {
  try {
    const students = await getUnresolvedStudents();
    const attendances = await getUnresolvedAttendances();
    const exams = await getUnresolvedExams();
    const curriculums = await getUnresolvedCurriculums();
    const teachers = await getUnresolvedTeachers();

    // Check attendance orphans accurately
    const allAttendances = await Attendance.find({ userType: "Student" }).lean();
    let realOrphans = 0;
    let validReferences = 0;
    
    // Doing manual checking because populate might drop missing references or keep them as null
    const studentIds = new Set((await Student.find().select("_id").lean()).map(s => s._id.toString()));

    for (const a of allAttendances) {
      if (a.userId && studentIds.has(a.userId.toString())) {
        validReferences++;
      } else {
        realOrphans++;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        unresolvedCounts: {
          students: students.length,
          attendances: attendances.length,
          exams: exams.length,
          curriculums: curriculums.length,
          teachers: teachers.length
        },
        orphanStats: {
          realStudentOrphans: realOrphans,
          validStudentReferences: validReferences
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getStudents = async (req, res, next) => {
  try {
    const students = await getUnresolvedStudents();
    res.status(200).json({ success: true, data: students });
  } catch (err) {
    next(err);
  }
};

exports.getAttendance = async (req, res, next) => {
  try {
    const attendances = await getUnresolvedAttendances();
    res.status(200).json({ success: true, data: attendances });
  } catch (err) {
    next(err);
  }
};

exports.getExams = async (req, res, next) => {
  try {
    const exams = await getUnresolvedExams();
    res.status(200).json({ success: true, data: exams });
  } catch (err) {
    next(err);
  }
};

exports.getCurriculum = async (req, res, next) => {
  try {
    const curriculums = await getUnresolvedCurriculums();
    res.status(200).json({ success: true, data: curriculums });
  } catch (err) {
    next(err);
  }
};

exports.getTeachers = async (req, res, next) => {
  try {
    const teachers = await getUnresolvedTeachers();
    res.status(200).json({ success: true, data: teachers });
  } catch (err) {
    next(err);
  }
};

/**
 * Common Audit Logger
 */
const logResolution = async (req, entityType, entityId, oldClassId, newClassId, legacyValue, action = "UPDATE", extra = {}) => {
  try {
    await ActivityLog.create({
      user: req.user._id,
      username: req.user.username || req.user.name || "Admin",
      role: req.user.role,
      action: action,
      module: "DataResolution",
      description: `Manual resolution of ${entityType} ${entityId} to Canonical Class ${newClassId}. Legacy: ${legacyValue}. ${JSON.stringify(extra)}`
    });
    return true;
  } catch (error) {
    console.error("Audit log failed:", error);
    return false;
  }
};

/**
 * Resolve Functions
 */
exports.resolveStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { classId, reason } = req.body;

    if (!classId) return res.status(400).json({ success: false, message: "classId is required" });
    const targetClass = await Class.findById(classId);
    if (!targetClass) return res.status(400).json({ success: false, message: "Canonical Class not found" });

    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    if (student.classId?.toString() === classId) {
      return res.status(200).json({ success: true, alreadyResolved: true, message: "Record is already resolved to the selected canonical class." });
    }

    const oldClassId = student.classId;
    const legacyValue = student.className || student.studentClass;
    
    // Update
    student.classId = classId;
    await student.save();

    // Log
    const logged = await logResolution(req, "Student", id, oldClassId, classId, legacyValue);
    if (!logged) {
      student.classId = oldClassId;
      await student.save();
      return res.status(500).json({ success: false, message: "Failed to create audit log. Rollback successful." });
    }

    res.status(200).json({ success: true, message: "Student resolved successfully" });
  } catch (err) {
    next(err);
  }
};

exports.resolveAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { classId, reason } = req.body;

    if (!classId) return res.status(400).json({ success: false, message: "classId is required" });
    const targetClass = await Class.findById(classId);
    if (!targetClass) return res.status(400).json({ success: false, message: "Canonical Class not found" });

    const attendance = await Attendance.findById(id);
    if (!attendance) return res.status(404).json({ success: false, message: "Attendance not found" });

    if (attendance.classId?.toString() === classId) {
      return res.status(200).json({ success: true, alreadyResolved: true, message: "Record is already resolved to the selected canonical class." });
    }

    const student = await Student.findById(attendance.userId);
    // Explicit conflicts handled by UI confirmation, backend just persists it safely.
    
    const oldClassId = attendance.classId;
    const legacyValue = attendance.className;

    attendance.classId = classId;
    await attendance.save();

    const logged = await logResolution(req, "Attendance", id, oldClassId, classId, legacyValue);
    if (!logged) {
      attendance.classId = oldClassId;
      await attendance.save();
      return res.status(500).json({ success: false, message: "Failed to create audit log. Rollback successful." });
    }

    res.status(200).json({ success: true, message: "Attendance resolved successfully" });
  } catch (err) {
    next(err);
  }
};

exports.resolveExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { classId, reason } = req.body;

    if (!classId) return res.status(400).json({ success: false, message: "classId is required" });
    const targetClass = await Class.findById(classId);
    if (!targetClass) return res.status(400).json({ success: false, message: "Canonical Class not found" });

    const exam = await Exam.findById(id);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });

    if (exam.classId?.toString() === classId) {
      return res.status(200).json({ success: true, alreadyResolved: true, message: "Record is already resolved to the selected canonical class." });
    }

    const oldClassId = exam.classId;
    const legacyValue = exam.class;

    exam.classId = classId;
    await exam.save();

    const logged = await logResolution(req, "Exam", id, oldClassId, classId, legacyValue);
    if (!logged) {
      exam.classId = oldClassId;
      await exam.save();
      return res.status(500).json({ success: false, message: "Failed to create audit log. Rollback successful." });
    }

    res.status(200).json({ success: true, message: "Exam resolved successfully" });
  } catch (err) {
    next(err);
  }
};

exports.resolveCurriculum = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { classId, reason } = req.body;

    if (!classId) return res.status(400).json({ success: false, message: "classId is required" });
    const targetClass = await Class.findById(classId);
    if (!targetClass) return res.status(400).json({ success: false, message: "Canonical Class not found" });

    const curriculum = await Curriculum.findById(id);
    if (!curriculum) return res.status(404).json({ success: false, message: "Curriculum not found" });

    if (curriculum.classId?.toString() === classId) {
      return res.status(200).json({ success: true, alreadyResolved: true, message: "Record is already resolved to the selected canonical class." });
    }

    const oldClassId = curriculum.classId;
    const legacyValue = curriculum.department || curriculum.class;

    curriculum.classId = classId;
    await curriculum.save();

    const logged = await logResolution(req, "Curriculum", id, oldClassId, classId, legacyValue);
    if (!logged) {
      curriculum.classId = oldClassId;
      await curriculum.save();
      return res.status(500).json({ success: false, message: "Failed to create audit log. Rollback successful." });
    }

    res.status(200).json({ success: true, message: "Curriculum resolved successfully" });
  } catch (err) {
    next(err);
  }
};

exports.resolveTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { classId, reason } = req.body;

    if (!classId) return res.status(400).json({ success: false, message: "classId is required" });
    const targetClass = await Class.findById(classId);
    if (!targetClass) return res.status(400).json({ success: false, message: "Canonical Class not found" });

    const teacher = await Teacher.findById(id);
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    if (teacher.assignedClassIds && teacher.assignedClassIds.map(c => c.toString()).includes(classId)) {
      return res.status(200).json({ success: true, alreadyResolved: true, message: "Record is already resolved to the selected canonical class." });
    }

    const oldAssignedClassIds = [...(teacher.assignedClassIds || [])];
    const legacyValue = teacher.assignedClasses?.join(",") || "";

    if (!teacher.assignedClassIds) teacher.assignedClassIds = [];
    teacher.assignedClassIds.push(classId);
    await teacher.save();

    const logged = await logResolution(req, "Teacher", id, null, classId, legacyValue, "UPDATE", { oldAssignedClassIds });
    if (!logged) {
      teacher.assignedClassIds = oldAssignedClassIds;
      await teacher.save();
      return res.status(500).json({ success: false, message: "Failed to create audit log. Rollback successful." });
    }

    res.status(200).json({ success: true, message: "Teacher resolved successfully" });
  } catch (err) {
    next(err);
  }
};
