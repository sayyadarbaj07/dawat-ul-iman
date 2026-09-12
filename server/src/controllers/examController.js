const Exam = require("../models/examModel");
const ExamResult = require("../models/examResultModel");
const Student = require("../models/studentModel");
const Class = require("../models/classModel");
const { verifyTeacherClassAccess } = require("../middleware/authMiddleware");
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

exports.getAllExams = async (req, res) => {
  try {
    const { academicYear, class: className, examType } = req.query;
    const filter = {};
    if (academicYear) filter.academicYear = academicYear;
    if (className) filter.class = className;
    if (examType) filter.examType = examType;

    if (req.user && req.user.role === "teacher") {
      const Teacher = require("../models/teacherModel");
      const teacher = await Teacher.findOne({ userId: req.user._id });
      if (teacher && ((teacher.assignedClasses && teacher.assignedClasses.length > 0) || (teacher.assignedClassIds && teacher.assignedClassIds.length > 0))) {
        if (filter.class) {
          // If a specific class was requested, ensure it's in their assigned list
          const hasAccess = await verifyTeacherClassAccess(req.user, req.query.classId, filter.class);
          if (!hasAccess) {
             return sendSuccess(res, 200, "Exams fetched successfully", []);
          }
        } else {
           // If no specific class is requested, restrict exams to assigned classes or assigned classIds
           filter.$or = [
              { class: { $in: teacher.assignedClasses } },
              { classId: { $in: teacher.assignedClassIds } }
           ];
        }
      } else {
        return sendSuccess(res, 200, "Exams fetched successfully", []);
      }
    }

    const exams = await Exam.find(filter).sort({ date: -1 });
    return sendSuccess(res, 200, "Exams fetched successfully", exams);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch exams", error);
  }
};

exports.createExam = async (req, res) => {
  try {
    if (req.body.classId) {
       const classDoc = await Class.findById(req.body.classId);
       if (!classDoc) {
          return sendError(res, 400, "Invalid classId: Class not found.");
       }
       if (classDoc.status !== 'active') {
          return sendError(res, 400, "Invalid classId: Class is inactive.");
       }
       // Derive class string automatically, ignoring frontend value
       req.body.class = classDoc.fullName;
    }

    if (req.user && req.user.role === "teacher") {
      const hasAccess = await verifyTeacherClassAccess(
        req.user,
        req.body.classId,
        req.body.class
      );
      if (!hasAccess) {
        return sendError(res, 403, "You are not authorized to manage exams for this class.");
      }
    }

    // Proactive Duplicate Check
    let duplicateQuery = { name: req.body.name, academicYear: req.body.academicYear };
    if (req.body.classId) {
      duplicateQuery.classId = req.body.classId;
    } else {
      duplicateQuery.classId = { $exists: false };
      duplicateQuery.class = req.body.class;
    }
    const existingExam = await Exam.findOne(duplicateQuery);
    if (existingExam) {
      return sendError(res, 400, "An exam with this name already exists for this class in this academic year.");
    }

    const exam = await Exam.create(req.body);

    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "EXAM_CREATED",
      description: `Created exam: ${exam.name} for class ${exam.class}`,
      moduleName: "Exams",
      notification: {
        title: "New Exam Created",
        message: `${exam.name} has been scheduled for class ${exam.class}.`,
        type: "success",
        link: `/exams`,
        relatedEntity: { entityId: exam._id, entityModel: "Exam" }
      },
      notifyAdmins: true,
      classId: exam.classId
    });

    return sendSuccess(res, 201, "Exam created successfully", exam);
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 400, "An exam with this name already exists for this class in this academic year.");
    }
    return sendError(res, 500, "Failed to create exam", error);
  }
};

exports.updateExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return sendError(res, 404, "Exam not found");

    if (req.user && req.user.role === "teacher") {
      const Teacher = require("../models/teacherModel");
      const teacher = await Teacher.findOne({ userId: req.user._id });
      
      const hasClassIdAuth = exam.classId && teacher.assignedClassIds && teacher.assignedClassIds.some(id => id.toString() === exam.classId.toString());
      const hasClassStringAuth = teacher.assignedClasses && teacher.assignedClasses.includes(exam.class);
      
      if (!teacher || (!hasClassIdAuth && !hasClassStringAuth)) {
        return sendError(res, 403, "You are not authorized to edit this exam");
      }
    }

    const { name, examType, examName, date, academicYear, maxMarks, passingMarks, subjects } = req.body;

    // Validation
    if (maxMarks <= 0) return sendError(res, 400, "Max marks must be greater than 0");
    if (passingMarks < 0) return sendError(res, 400, "Passing marks cannot be negative");
    if (passingMarks > maxMarks) return sendError(res, 400, "Passing marks cannot exceed max marks");

    // Check if maxMarks is being reduced dangerously
    if (maxMarks < exam.maxMarks) {
      const existingHighMarks = await ExamResult.findOne({ examId: exam._id, marks: { $gt: maxMarks } });
      if (existingHighMarks) {
        return sendError(res, 400, "Cannot reduce max marks: some students have already scored higher than the new max marks limit");
      }
    }

    // Apply safe updates
    if (name !== undefined) exam.name = name;
    if (examType !== undefined) exam.examType = examType;
    if (examName !== undefined) exam.examName = examName;
    if (date !== undefined) exam.date = date;
    if (academicYear !== undefined) exam.academicYear = academicYear;
    if (maxMarks !== undefined) exam.maxMarks = maxMarks;
    if (passingMarks !== undefined) exam.passingMarks = passingMarks;
    if (subjects !== undefined) exam.subjects = subjects;

    // Proactive Duplicate Check for Update
    let duplicateQuery = { 
      _id: { $ne: exam._id },
      name: exam.name, 
      academicYear: exam.academicYear 
    };
    if (exam.classId) {
      duplicateQuery.classId = exam.classId;
    } else {
      duplicateQuery.classId = { $exists: false };
      duplicateQuery.class = exam.class;
    }
    const existingExam = await Exam.findOne(duplicateQuery);
    if (existingExam) {
      return sendError(res, 400, "An exam with this name already exists for this class in this academic year.");
    }

    await exam.save();

    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "EXAM_UPDATED",
      description: `Updated exam: ${exam.name}`,
      moduleName: "Exams",
      notification: {
        title: "Exam Updated",
        message: `${exam.name} details have been updated.`,
        type: "info",
        link: `/exams`,
        relatedEntity: { entityId: exam._id, entityModel: "Exam" }
      },
      notifyAdmins: true,
      classId: exam.classId
    });

    return sendSuccess(res, 200, "Exam updated successfully", exam);
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 400, "An exam with this name already exists for this class in this academic year.");
    }
    return sendError(res, 500, "Failed to update exam", error);
  }
};


exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return sendError(res, 404, "Exam not found");

    if (req.user && req.user.role === "teacher") {
      const hasAccess = await verifyTeacherClassAccess(
        req.user,
        exam.classId,
        exam.class
      );
      if (!hasAccess) {
        return sendError(res, 403, "You are not authorized to delete this exam.");
      }
    }

    await exam.deleteOne();
    // Also delete associated results
    await ExamResult.deleteMany({ examId: req.params.id });

    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "EXAM_DELETED",
      description: `Deleted exam: ${exam.name}`,
      moduleName: "Exams",
      notifyAdmins: true
    });

    return sendSuccess(res, 200, "Exam deleted successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to delete exam", error);
  }
};

exports.getAllExamResults = async (req, res) => {
  try {
    const { examId, subject } = req.query;
    const filter = {};
    if (examId) filter.examId = examId;
    if (subject) filter.subject = subject;

    const results = await ExamResult.find(filter).lean();
    return sendSuccess(res, 200, "Exam results fetched successfully", results);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch exam results", error);
  }
};

exports.saveBulkMarks = async (req, res) => {
  try {
    const { examId, subject, records } = req.body; // records: [{studentId, marks}]

    if (!examId || !subject || !Array.isArray(records)) {
      return sendError(res, 400, "Invalid payload for bulk marks");
    }

    const exam = await Exam.findById(examId);
    if (!exam) return sendError(res, 404, "Exam not found");

    if (req.user && req.user.role === "teacher") {
      const Teacher = require("../models/teacherModel");
      const teacher = await Teacher.findOne({ userId: req.user._id });
      
      const hasClassIdAuth = exam.classId && teacher.assignedClassIds && teacher.assignedClassIds.some(id => id.toString() === exam.classId.toString());
      const hasClassStringAuth = teacher.assignedClasses && teacher.assignedClasses.includes(exam.class);
      
      if (!teacher || (!hasClassIdAuth && !hasClassStringAuth)) {
        return sendError(res, 403, "You are not authorized to manage marks for this class");
      }
    }

    for (const record of records) {
      if (record.marks === "" || record.marks === null || record.marks === undefined) {
        // -1 indicates Absent
        await ExamResult.findOneAndUpdate(
          { examId, studentId: record.studentId, subject },
          { marks: -1 },
          { upsert: true, new: true }
        );
        continue;
      }
      
      const numMarks = Number(record.marks);
      if (numMarks > exam.maxMarks || numMarks < 0) {
        return sendError(res, 400, `Marks for student ${record.studentId} are out of bounds (0 - ${exam.maxMarks})`);
      }

      await ExamResult.findOneAndUpdate(
        { examId, studentId: record.studentId, subject },
        { marks: numMarks },
        { upsert: true, new: true }
      );
    }

    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "EXAM_MARKS_UPDATED",
      description: `Updated marks for exam: ${exam.name} (${subject})`,
      moduleName: "Exams",
      notification: {
        title: "Exam Marks Updated",
        message: `Marks have been updated for ${exam.name} (${subject}).`,
        type: "info",
        link: `/results`,
        relatedEntity: { entityId: exam._id, entityModel: "Exam" }
      },
      notifyAdmins: true,
      classId: exam.classId
    });

    return sendSuccess(res, 200, "Bulk marks saved successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to save bulk marks", error);
  }
};

exports.getCalculatedResults = async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await Exam.findById(examId);
    if (!exam) return sendError(res, 404, "Exam not found");

    if (req.user && req.user.role === "teacher") {
      const Teacher = require("../models/teacherModel");
      const teacher = await Teacher.findOne({ userId: req.user._id });

      const hasClassIdAuth = exam.classId && teacher.assignedClassIds && teacher.assignedClassIds.some(id => id.toString() === exam.classId.toString());
      const hasClassStringAuth = teacher.assignedClasses && teacher.assignedClasses.includes(exam.class);

      if (!teacher || (!hasClassIdAuth && !hasClassStringAuth)) {
        return sendError(res, 403, "You are not authorized to view results for this class");
      }
    }

    // Get all students in this exam's class
    // studentClass takes precedence, fallback to className
    const students = await Student.find({
      $or: [
        { classId: exam.classId },
        { studentClass: exam.class },
        { className: exam.class }
      ]
    }).lean();

    // Get all marks for this exam
    const results = await ExamResult.find({ examId }).lean();

    // Calculate per student
    const calculated = students.map(student => {
      const studentResults = results.filter(r => String(r.studentId) === String(student._id));
      
      let totalMarks = 0;
      let obtainedMarks = 0;
      let hasFailed = false;
      let subjectMarks = {};

      // Initialize all subjects with null (Absent)
      exam.subjects.forEach(sub => {
        subjectMarks[sub] = null;
      });

      studentResults.forEach(r => {
        if (exam.subjects.includes(r.subject)) {
          if (r.marks === -1) {
            subjectMarks[r.subject] = "Absent";
            hasFailed = true;
          } else {
            subjectMarks[r.subject] = r.marks;
            obtainedMarks += r.marks;
            if (r.marks < exam.passingMarks) {
              hasFailed = true;
            }
          }
        }
      });

      const finalTotalMarks = exam.subjects.length * exam.maxMarks;
      const percentage = finalTotalMarks > 0 ? (obtainedMarks / finalTotalMarks) * 100 : 0;
      
      let grade = "F";
      if (!hasFailed) {
        if (percentage >= 90) grade = "A+";
        else if (percentage >= 80) grade = "A";
        else if (percentage >= 70) grade = "B";
        else if (percentage >= 60) grade = "C";
        else if (percentage >= 50) grade = "D";
        else { grade = "F"; hasFailed = true; }
      }
      
      exam.subjects.forEach(sub => {
        if (subjectMarks[sub] === null) {
          hasFailed = true; // Missing marks = Fail
          grade = "F";
        }
      });

      return {
        studentId: student._id,
        rollNumber: student.rollNumber,
        fullName: student.fullName || student.name,
        studentClass: student.studentClass || student.className,
        subjectMarks,
        obtainedMarks,
        totalMarks: finalTotalMarks,
        percentage: percentage.toFixed(2),
        grade,
        status: hasFailed ? "Fail" : "Pass"
      };
    });

    return sendSuccess(res, 200, "Calculated results fetched", calculated);
  } catch (error) {
    return sendError(res, 500, "Failed to calculate results", error);
  }
};

exports.getStudentHistoricalResults = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId).lean();
    if (!student) return sendError(res, 404, "Student not found");

    // Get all results for this student
    const studentResults = await ExamResult.find({ studentId }).lean();
    
    // Extract unique exam IDs
    const examIds = [...new Set(studentResults.map(r => String(r.examId)))];
    
    // Fetch those exams
    const exams = await Exam.find({ _id: { $in: examIds } }).lean();

    // Calculate historical results
    const history = exams.map(exam => {
      const examResults = studentResults.filter(r => String(r.examId) === String(exam._id));
      
      let obtainedMarks = 0;
      let hasFailed = false;
      let subjectMarks = {};

      exam.subjects.forEach(sub => {
        subjectMarks[sub] = null;
      });

      examResults.forEach(r => {
        if (exam.subjects.includes(r.subject)) {
          if (r.marks === -1) {
            subjectMarks[r.subject] = "Absent";
            hasFailed = true;
          } else {
            subjectMarks[r.subject] = r.marks;
            obtainedMarks += r.marks;
            if (r.marks < exam.passingMarks) {
              hasFailed = true;
            }
          }
        }
      });

      const totalMarks = exam.subjects.length * exam.maxMarks;
      const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
      
      let grade = "F";
      if (!hasFailed) {
        if (percentage >= 90) grade = "A+";
        else if (percentage >= 80) grade = "A";
        else if (percentage >= 70) grade = "B";
        else if (percentage >= 60) grade = "C";
        else if (percentage >= 50) grade = "D";
        else { grade = "F"; hasFailed = true; }
      }
      
      exam.subjects.forEach(sub => {
        if (subjectMarks[sub] === null) {
          hasFailed = true;
          grade = "F";
        }
      });

      return {
        examId: exam._id,
        examName: exam.name || exam.examName,
        examType: exam.examType,
        academicYear: exam.academicYear,
        className: exam.class,
        subjectMarks,
        obtainedMarks,
        totalMarks,
        percentage: percentage.toFixed(2),
        grade,
        status: hasFailed ? "Fail" : "Pass"
      };
    });

    // Sort by academic year descending, then by term/type (if possible, otherwise just year)
    history.sort((a, b) => b.academicYear.localeCompare(a.academicYear));

    return sendSuccess(res, 200, "Historical results fetched", history);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch historical results", error);
  }
};
