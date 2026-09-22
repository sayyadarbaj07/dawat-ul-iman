const Attendance = require("../models/attendanceModel");
const Student = require("../models/studentModel");
const Teacher = require("../models/teacherModel");
const Class = require("../models/classModel");

/**
 * Calculates the total working days recorded for a specific class or globally (for teachers).
 * @param {string} userType - "Student" or "Teacher"
 * @param {string} className - Name of the class (if student) - legacy fallback
 * @param {string} classId - canonical Class ID
 * @returns {number} total distinct days
 */
const getTotalWorkingDays = async (userType, className, classId = null) => {
  const matchQuery = { userType };
  if (userType === "Student") {
    if (classId) {
      matchQuery.classId = classId;
    } else if (className) {
      matchQuery.classId = { $exists: false };
      matchQuery.className = className;
    }
  }
  
  const result = await Attendance.aggregate([
    { $match: matchQuery },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } } } },
    { $count: "totalWorkingDays" }
  ]);
  
  return result.length > 0 ? result[0].totalWorkingDays : 0;
};

/**
 * Recalculates and updates the attendance percentage for a user.
 * Attendance Percentage = Present Days / Total Working Days * 100
 * @param {string} userId - ObjectId of the user
 * @param {string} userType - "Student" or "Teacher"
 */
const recalculateAttendancePercentage = async (userId, userType) => {
  // First, get the class for students to get the correct denominator
  let className = null;
  let classId = null;
  if (userType === "Student") {
    const student = await Student.findById(userId);
    if (!student) return;
    className = student.className;
    classId = student.classId;
  } else {
    const teacher = await Teacher.findById(userId);
    if (!teacher) return;
  }

  const totalWorkingDays = await getTotalWorkingDays(userType, className, classId);
  
  if (totalWorkingDays === 0) {
    return; // No working days recorded yet, leave percentage as is or set to 0.
  }

  // Count Present Days for this user
  const presentDays = await Attendance.countDocuments({
    userId,
    userType,
    status: { $in: ["Present", "Late"] } // Considering "Late" as present for percentage
  });

  const percentage = Math.round((presentDays / totalWorkingDays) * 100);

  if (userType === "Student") {
    await Student.findByIdAndUpdate(userId, { attendancePercent: percentage });
  } else if (userType === "Teacher") {
    await Teacher.findByIdAndUpdate(userId, { attendancePercent: percentage });
  }
};

/**
 * Save batch attendance records with duplicate prevention and percentage recalculation.
 * @param {Date} date - The date of attendance
 * @param {Array} records - Array of { userId, userType, status, className }
 * @param {Object} reqUser - The user making the request (for RBAC)
 */
const saveBatchAttendance = async (date, records, reqUser, classId) => {
  if (!records || records.length === 0) return;

  const targetDate = new Date(date);
  
  // 0. 7-Day Historical Edit Restriction for Teachers
  if (reqUser.role === "teacher") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const editDate = new Date(targetDate);
    editDate.setHours(0, 0, 0, 0);
    
    const diffTime = today - editDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Allow if diffDays is between -1 (timezone edge case) and 7.
    if (diffDays > 7 || diffDays < -1) {
      const err = new Error("Teachers can only edit attendance for today and the past 7 days. Contact Admin for older records.");
      err.status = 403;
      throw err;
    }
  }

  // Phase 6.6: Canonical Class Resolution
  let classData = null;
  const hasStudentRecords = records.some(r => r.userType === "Student");
  
  if (hasStudentRecords) {
    if (!classId) {
      const err = new Error("classId is required for student attendance.");
      err.status = 400; throw err;
    }
    classData = await Class.findById(classId);
    if (!classData || classData.status !== "active") {
      const err = new Error("Invalid or inactive class selected.");
      err.status = 400; throw err;
    }
  }

  // 1. Validate Teachers RBAC
  if (reqUser.role === "teacher") {
    const teacherRecord = await Teacher.findOne({ userId: reqUser._id });
    if (!teacherRecord) {
      throw new Error("Teacher profile not found for the logged-in user.");
    }
    
    for (const record of records) {
      if (record.userType === "Student") {
        if (!teacherRecord.assignedClassIds || teacherRecord.assignedClassIds.length === 0) {
           const err = new Error(`Teacher is not assigned to any classes.`);
           err.status = 403; throw err;
        }
        if (!teacherRecord.assignedClassIds.includes(classId.toString())) {
          const err = new Error(`Teacher is not authorized to mark attendance for this class.`);
          err.status = 403; throw err;
        }
      } else if (record.userType === "Teacher") {
        const err = new Error("Teachers are not authorized to mark teacher attendance.");
        err.status = 403; throw err;
      }
    }
  }

  // 1.5 Validate Students belong to the class
  const studentIds = records.filter(r => r.userType === "Student").map(r => r.userId);
  let studentMap = new Map();
  if (studentIds.length > 0) {
    const students = await Student.find({ _id: { $in: studentIds } });
    studentMap = new Map(students.map(s => [s._id.toString(), s]));
    
    for (const record of records) {
      if (record.userType === "Student") {
        const student = studentMap.get(record.userId.toString());
        if (!student) {
          const err = new Error(`Student ${record.userId} not found`);
          err.status = 404; throw err;
        }
        if (!student.classId) {
          const err = new Error(`Student ${student.name} has not been assigned to a specific Class. Update their profile first.`);
          err.status = 400; throw err;
        }
        if (student.classId.toString() !== classId.toString()) {
          const err = new Error(`Student ${student.name} does not belong to the selected class.`);
          err.status = 400; throw err;
        }
      }
    }
  }

  // 2. Process Upserts to Prevent Duplicates (One record per user per date)
  const bulkOps = records.map(record => {
    // Only write className if no classId exists (legacy).
    // The requirement enforces we DO NOT dual-write department string to className which causes conflicts.
    let actualClassName = record.className;
    if (record.userType === "Student" && classId) {
      actualClassName = undefined;
    }
    const actualClassId = record.userType === "Student" ? classId : (record.classId || undefined);

    const setFields = {
      date: targetDate,
      userType: record.userType,
      userId: record.userId,
      status: record.status,
      updatedBy: reqUser._id,
      ...(actualClassName && { className: actualClassName }),
      ...(actualClassId && { classId: actualClassId }),
      ...(record.remarks !== undefined && { remarks: record.remarks })
    };

    return {
      updateOne: {
        filter: { date: targetDate, userId: record.userId },
        update: {
          $set: setFields,
          $setOnInsert: {
            markedBy: reqUser._id
          }
        },
        upsert: true
      }
    };
  });

  if (bulkOps.length > 0) {
    await Attendance.bulkWrite(bulkOps);
  }

  // 3. Recalculate Attendance Percentage for affected users efficiently
  try {
    const mongoose = require("mongoose");
    const studentRecords = records.filter(r => r.userType === "Student");
    if (studentRecords.length > 0 && classId) {
      const totalWorkingDays = await getTotalWorkingDays("Student", null, classId);
      if (totalWorkingDays > 0) {
        const userIds = studentRecords.map(r => new mongoose.Types.ObjectId(r.userId));
        
        const attendanceStats = await Attendance.aggregate([
          { $match: { userType: "Student", classId: new mongoose.Types.ObjectId(classId), userId: { $in: userIds }, status: { $in: ["Present", "Late"] } } },
          { $group: { _id: "$userId", presentDays: { $sum: 1 } } }
        ]);
        
        const statsMap = new Map();
        attendanceStats.forEach(stat => statsMap.set(stat._id.toString(), stat.presentDays));
        
        const studentBulkOps = userIds.map(userId => {
          const presentDays = statsMap.get(userId.toString()) || 0;
          const percentage = Math.round((presentDays / totalWorkingDays) * 100);
          return {
            updateOne: {
              filter: { _id: userId },
              update: { $set: { attendancePercent: percentage } }
            }
          };
        });
        
        if (studentBulkOps.length > 0) {
          await Student.bulkWrite(studentBulkOps);
        }
      }
    }
    
    const teacherRecords = records.filter(r => r.userType === "Teacher");
    if (teacherRecords.length > 0) {
      const totalWorkingDaysT = await getTotalWorkingDays("Teacher", null);
      if (totalWorkingDaysT > 0) {
        const tIds = teacherRecords.map(r => new mongoose.Types.ObjectId(r.userId));
        const tStats = await Attendance.aggregate([
          { $match: { userType: "Teacher", userId: { $in: tIds }, status: { $in: ["Present", "Late"] } } },
          { $group: { _id: "$userId", presentDays: { $sum: 1 } } }
        ]);
        const tStatsMap = new Map();
        tStats.forEach(s => tStatsMap.set(s._id.toString(), s.presentDays));
        const tBulkOps = tIds.map(tId => {
          const presentDays = tStatsMap.get(tId.toString()) || 0;
          const percentage = Math.round((presentDays / totalWorkingDaysT) * 100);
          return {
            updateOne: {
              filter: { _id: tId },
              update: { $set: { attendancePercent: percentage } }
            }
          };
        });
        if (tBulkOps.length > 0) {
          await Teacher.bulkWrite(tBulkOps);
        }
      }
    }
  } catch (error) {
    console.error("Failed to recalculate percentages in bulk:", error);
  }

  // 4. Trigger Absence Notifications efficiently
  try {
    const Notification = require("../models/notificationModel");
    const absentRecords = records.filter(r => r.userType === "Student" && r.status === "Absent");
    
    if (absentRecords.length > 0) {
      const classTeachers = classId 
        ? await Teacher.find({ assignedClassIds: classId, status: "active" })
        : await Teacher.find({ assignedClasses: { $in: [...new Set(absentRecords.map(r => r.className))] }, status: "active" });
      const adminUsers = await require("../models/userModel").find({ role: "admin", isActive: true });
      
      const newNotifications = [];
      const targetStart = new Date(targetDate); targetStart.setHours(0,0,0,0);
      const targetEnd = new Date(targetDate); targetEnd.setHours(23,59,59,999);
      const dateStr = targetDate.toLocaleDateString('en-IN');

      const studentIds = absentRecords.map(r => studentMap.get(r.userId.toString())?._id).filter(Boolean);
      
      const existingNotifications = await Notification.find({
        "relatedEntity.entityId": { $in: studentIds },
        createdAt: { $gte: targetStart, $lte: targetEnd }
      });
      
      for (const record of absentRecords) {
        const student = studentMap.get(record.userId.toString());
        if (!student) continue;

        const title = `Absence Alert: ${student.name}`;
        const classNameDisplay = classData ? classData.fullName : student.className;
        const message = `${student.name} (Roll: ${student.rollNumber || "N/A"}) from Class ${classNameDisplay} has been marked absent on ${dateStr}.`;
        
        const studentExisting = existingNotifications.filter(n => 
          n.relatedEntity?.entityId?.toString() === student._id.toString()
        );

        const notificationBase = {
          title,
          message,
          type: "warning",
          link: "/attendance",
          relatedEntity: {
            entityId: student._id,
            entityModel: "Student"
          }
        };

        for (const admin of adminUsers) {
          if (!studentExisting.some(n => n.recipient?.toString() === admin._id.toString())) {
             newNotifications.push({ ...notificationBase, recipient: admin._id });
          }
        }

        const teachersForClass = classId
          ? classTeachers.filter(t => t.assignedClassIds && t.assignedClassIds.includes(classId.toString()))
          : classTeachers.filter(t => t.assignedClasses.includes(student.className));
          
        for (const teacher of teachersForClass) {
          if (reqUser && reqUser._id.toString() !== teacher.userId?.toString()) {
            if (!studentExisting.some(n => n.recipient?.toString() === teacher.userId.toString())) {
               newNotifications.push({ ...notificationBase, recipient: teacher.userId });
            }
          }
        }
      }

      if (newNotifications.length > 0) {
        await Notification.insertMany(newNotifications);
      }
    }
  } catch (error) {
    console.error("Failed to send absence notifications:", error);
  }
};

/**
 * Fetches all data needed to generate a student attendance PDF.
 * Keeps DB logic out of the controller.
 *
 * @param {string} studentId - Mongoose ObjectId string
 * @param {Object} filters   - { month, year, startDate, endDate }
 * @returns {Object}         - { student, records, summary, totalWorkingDays, periodLabel }
 */
const getStudentAttendanceForPDF = async (studentId, filters) => {
  const { month, year, startDate, endDate } = filters;

  // Fetch student (lean — read-only)
  const student = await Student.findById(studentId).lean();
  if (!student) {
    const err = new Error("Student not found");
    err.status = 404;
    throw err;
  }

  // Build date range for student's own records
  const studentMatchQuery = { userType: "Student", userId: student._id };
  // Build parallel query for class-wide working-day count
  const classMatchQuery  = { userType: "Student" };
  if (student.classId) {
    classMatchQuery.classId = student.classId;
  } else if (student.className) {
    classMatchQuery.classId = { $exists: false };
    classMatchQuery.className = student.className;
  }

  let periodLabel = "All Time";

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end   = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    studentMatchQuery.date = { $gte: start, $lte: end };
    classMatchQuery.date   = { $gte: start, $lte: end };
    periodLabel = `${start.toLocaleDateString("en-IN")} – ${end.toLocaleDateString("en-IN")}`;
  } else if (month && year) {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m, 0, 23, 59, 59, 999);
    studentMatchQuery.date = { $gte: start, $lte: end };
    classMatchQuery.date   = { $gte: start, $lte: end };
    periodLabel = `${new Date(y, m - 1).toLocaleString("en-IN", { month: "long" })} ${y}`;
  }

  // Two targeted queries — both use the compound index { date: 1, userId: 1 }
  const [records, workingDates] = await Promise.all([
    Attendance.find(studentMatchQuery).sort({ date: 1 }).lean(),
    Attendance.distinct("date", classMatchQuery),
  ]);

  const totalWorkingDays = workingDates.length;

  // Compute summary from the fetched records (no extra DB round-trip)
  let present = 0, absent = 0, late = 0;
  for (const r of records) {
    if (r.status === "Present") present++;
    else if (r.status === "Absent") absent++;
    else if (r.status === "Late") late++;
  }
  const attended   = present + late;
  const percentage = totalWorkingDays > 0 ? Math.round((attended / totalWorkingDays) * 100) : 0;

  return {
    student,
    records,
    summary: { present, absent, late, attended, percentage },
    totalWorkingDays,
    periodLabel,
  };
};

module.exports = {
  saveBatchAttendance,
  recalculateAttendancePercentage,
  getTotalWorkingDays,
  getStudentAttendanceForPDF,
};
