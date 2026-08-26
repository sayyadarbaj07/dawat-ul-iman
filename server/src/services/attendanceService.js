const Attendance = require("../models/attendanceModel");
const Student = require("../models/studentModel");
const Teacher = require("../models/teacherModel");

/**
 * Calculates the total working days recorded for a specific class or globally (for teachers).
 * @param {string} userType - "Student" or "Teacher"
 * @param {string} className - Name of the class (if student)
 * @returns {number} total distinct days
 */
const getTotalWorkingDays = async (userType, className) => {
  const matchQuery = { userType };
  if (userType === "Student" && className) {
    matchQuery.className = className;
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
  if (userType === "Student") {
    const student = await Student.findById(userId);
    if (!student) return;
    className = student.className;
  } else {
    const teacher = await Teacher.findById(userId);
    if (!teacher) return;
  }

  const totalWorkingDays = await getTotalWorkingDays(userType, className);
  
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
const saveBatchAttendance = async (date, records, reqUser) => {
  if (!records || records.length === 0) return;

  const targetDate = new Date(date);
  
  // 1. Validate Teachers RBAC
  if (reqUser.role === "teacher") {
    const teacherRecord = await Teacher.findOne({ userId: reqUser._id });
    if (!teacherRecord) {
      throw new Error("Teacher profile not found for the logged-in user.");
    }
    
    // Check if the teacher is authorized for all the classes in the records
    for (const record of records) {
      if (record.userType === "Student") {
        if (!teacherRecord.assignedClasses || teacherRecord.assignedClasses.length === 0) {
           const err = new Error(`Teacher is not assigned to any classes.`);
           err.status = 403; throw err;
        }
        if (!teacherRecord.assignedClasses.includes(record.className)) {
          const err = new Error(`Teacher is not authorized to mark attendance for class: ${record.className}`);
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
  if (studentIds.length > 0) {
    const students = await Student.find({ _id: { $in: studentIds } });
    const studentMap = new Map(students.map(s => [s._id.toString(), s]));
    
    for (const record of records) {
      if (record.userType === "Student") {
        const student = studentMap.get(record.userId.toString());
        if (!student) {
          const err = new Error(`Student ${record.userId} not found`);
          err.status = 404; throw err;
        }
        if (student.className !== record.className) {
          const err = new Error(`Student ${student.name} does not belong to class ${record.className}. Expected ${student.className}.`);
          err.status = 400; throw err;
        }
      }
    }
  }

  // 2. Process Upserts to Prevent Duplicates (One record per user per date)
  const bulkOps = records.map(record => ({
    updateOne: {
      filter: { date: targetDate, userId: record.userId },
      update: {
        $set: {
          date: targetDate,
          userType: record.userType,
          userId: record.userId,
          status: record.status,
          className: record.className,
        }
      },
      upsert: true
    }
  }));

  if (bulkOps.length > 0) {
    await Attendance.bulkWrite(bulkOps);
  }

  // 3. Recalculate Attendance Percentage for all affected users
  const uniqueUsers = records.map(r => ({ id: r.userId, type: r.userType }));
  for (const u of uniqueUsers) {
    await recalculateAttendancePercentage(u.id, u.type);
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
  const classMatchQuery  = { userType: "Student", className: student.className };

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
