const mongoose = require("mongoose");
const Teacher = require("../models/teacherModel");
const Attendance = require("../models/attendanceModel");
const TeacherSalary = require("../models/teacherSalaryModel");
const ActivityLog = require("../models/activityLogModel");
const Transaction = require("../models/transactionModel");
const { calculateSalary } = require("../services/salaryCalculationService");

// Calculate and preview salary for a teacher for a specific month/year
exports.previewSalary = async (req, res) => {
  try {
    const { teacherId, month, year } = req.body;

    if (!teacherId || !month || !year) {
      return res.status(400).json({ success: false, message: "teacherId, month, and year are required" });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    // Fetch attendance for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const attendanceRecords = await Attendance.find({
      userId: teacher._id, // Teacher._id is the reference for attendance userId when userType is Teacher
      userType: "Teacher",
      date: { $gte: startDate, $lte: endDate }
    }).lean();

    try {
      const calculation = calculateSalary({
        monthlySalary: teacher.salary, // Teacher model uses 'salary' instead of 'monthlySalary'
        joiningDate: teacher.joiningDate,
        deactivationDate: teacher.deactivationDate,
        month,
        year,
        attendanceRecords
      });

      res.status(200).json({
        success: true,
        data: calculation
      });
    } catch (calcError) {
      if (calcError.message.includes("INCOMPLETE_ATTENDANCE")) {
        return res.status(400).json({ success: false, message: calcError.message, code: "INCOMPLETE_ATTENDANCE" });
      }
      throw calcError;
    }

  } catch (error) {
    console.error("Preview Teacher Salary Error:", error);
    res.status(500).json({ success: false, message: "Failed to preview salary", error: error.message });
  }
};

// Calculate and save Draft salary
exports.createDraftSalary = async (req, res) => {
  try {
    const { teacherId, month, year } = req.body;

    if (!teacherId || !month || !year) {
      return res.status(400).json({ success: false, message: "teacherId, month, and year are required" });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    // Check if salary already exists
    const existing = await TeacherSalary.findOne({ teacherId, month, year });
    if (existing) {
      return res.status(400).json({ success: false, message: "Salary record already exists for this month." });
    }

    // Fetch attendance for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const attendanceRecords = await Attendance.find({
      userId: teacher._id,
      userType: "Teacher",
      date: { $gte: startDate, $lte: endDate }
    }).lean();

    let calculation;
    try {
      calculation = calculateSalary({
        monthlySalary: teacher.salary,
        joiningDate: teacher.joiningDate,
        deactivationDate: teacher.deactivationDate,
        month,
        year,
        attendanceRecords
      });
    } catch (calcError) {
      return res.status(400).json({ success: false, message: calcError.message, code: "INCOMPLETE_ATTENDANCE" });
    }

    const salaryRecord = new TeacherSalary({
      teacherId: teacher._id,
      month,
      year,
      ...calculation,
      status: "Draft",
      processedBy: req.user._id
    });

    await salaryRecord.save();

    await ActivityLog.create({
      user: req.user._id,
      username: req.user.username || req.user.name || 'Admin',
      role: req.user.role || 'admin',
      action: "TEACHER_SALARY_CREATED",
      description: `Created draft salary for teacher ${teacher.name} for ${month}/${year}`,
      module: "Payroll"
    });

    res.status(201).json({
      success: true,
      message: "Draft salary generated successfully",
      data: salaryRecord
    });
  } catch (error) {
    console.error("Create Teacher Salary Error:", error);
    res.status(500).json({ success: false, message: "Failed to generate salary", error: error.message });
  }
};

// Get Teacher Salary History
exports.getSalaryHistory = async (req, res) => {
  try {
    const { teacherId } = req.params;
    let { page = 1, limit = 12, month, year } = req.query;

    if (!teacherId) {
      return res.status(400).json({ success: false, message: "teacherId is required" });
    }

    // RBAC and IDOR Protection
    if (req.user.role === "teacher") {
      const teacher = await Teacher.findOne({ userId: req.user._id }).lean();
      if (!teacher || teacher._id.toString() !== teacherId) {
        return res.status(403).json({ success: false, message: "Forbidden: You are not authorized to view this salary history" });
      }
    } else if (req.user.role !== "admin") {
      // Existing salary policy generally restricts to admin
      return res.status(403).json({ success: false, message: "Forbidden: Not authorized" });
    }

    // Pagination bounds
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (parsedPage - 1) * parsedLimit;

    // Build filter
    const filter = { teacherId };
    
    if (month) {
      const parsedMonth = parseInt(month, 10);
      if (parsedMonth >= 1 && parsedMonth <= 12) filter.month = parsedMonth;
    }
    if (year) {
      const parsedYear = parseInt(year, 10);
      if (parsedYear > 2000) filter.year = parsedYear;
    }

    const total = await TeacherSalary.countDocuments(filter);

    const salaries = await TeacherSalary.find(filter)
      .sort({ year: -1, month: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .populate("processedBy", "name username")
      .lean();

    res.status(200).json({
      success: true,
      data: salaries,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error("Get Teacher Salary History Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch salary history", error: error.message });
  }
};

// Pay Salary and create Finance Transaction
exports.paySalary = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { salaryId } = req.params;
    let { paymentMode, paymentDate, paymentReference, remarks } = req.body;

    if (!salaryId) {
      return res.status(400).json({ success: false, message: "salaryId is required" });
    }

    // Default payment options
    paymentMode = paymentMode || "Cash";
    const allowedModes = ["Cash", "Bank", "Online"];
    if (!allowedModes.includes(paymentMode)) {
      return res.status(400).json({ success: false, message: "Invalid paymentMode" });
    }

    paymentDate = paymentDate ? new Date(paymentDate) : new Date();
    if (isNaN(paymentDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid paymentDate" });
    }

    // Clean inputs
    paymentReference = paymentReference ? String(paymentReference).trim() : "";
    remarks = remarks ? String(remarks).trim() : "";

    let transactionId = null;
    let updatedSalary = null;
    let teacherDetails = null;

    await session.withTransaction(async () => {
      // 1. Fetch Salary
      const salary = await TeacherSalary.findById(salaryId).session(session);
      
      if (!salary) {
        throw new Error("Salary record not found");
      }

      if (salary.status === "Paid" || salary.financeTransactionId) {
        throw new Error("Salary is already paid or linked");
      }

      if (salary.payableSalary < 0) {
        throw new Error("Invalid payable amount");
      }

      // Fetch teacher for naming in description
      const teacher = await Teacher.findById(salary.teacherId).select("name").session(session);
      if (!teacher) {
        throw new Error("Teacher not found");
      }
      teacherDetails = teacher;

      // 2. Create Finance Transaction
      const description = `Teacher Salary - ${teacher.name} - ${salary.month}/${salary.year}`;
      
      const newTransaction = new Transaction({
        description,
        amount: salary.payableSalary,
        type: "expense",
        category: "Tankha",
        paymentMode,
        date: paymentDate,
        recordedBy: req.user._id,
        status: "Completed",
        remarks: paymentReference ? `Ref: ${paymentReference}${remarks ? " | " + remarks : ""}` : remarks
      });

      const savedTransaction = await newTransaction.save({ session });
      transactionId = savedTransaction._id;

      // 3. Atomically update Salary status & metadata
      const updateResult = await TeacherSalary.findOneAndUpdate(
        { _id: salaryId, status: "Draft", financeTransactionId: null },
        {
          $set: {
            status: "Paid",
            financeTransactionId: savedTransaction._id,
            paymentDate: savedTransaction.date,
            paymentMethod: savedTransaction.paymentMode,
            paymentReference: paymentReference || null,
            remarks: remarks || null,
            processedAt: new Date(),
            processedBy: req.user._id
          }
        },
        { session, new: true }
      );

      if (!updateResult) {
        throw new Error("Concurrency Conflict: Salary was already modified");
      }
      
      updatedSalary = updateResult;
    });

    session.endSession();

    // Out-of-transaction ActivityLog
    if (updatedSalary && teacherDetails) {
      await ActivityLog.create({
        user: req.user._id,
        username: req.user.username || req.user.name || 'Admin',
        role: req.user.role || 'admin',
        action: "TEACHER_SALARY_PAID",
        description: `Paid salary for teacher ${teacherDetails.name} for ${updatedSalary.month}/${updatedSalary.year}. Amount: ${updatedSalary.payableSalary} (${paymentMode})`,
        module: "Payroll"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Salary paid successfully",
      data: updatedSalary
    });

  } catch (error) {
    session.endSession();
    console.error("Pay Salary Error:", error);
    const msg = error.message;
    if (msg.includes("already paid") || msg.includes("Concurrency Conflict")) {
      return res.status(409).json({ success: false, message: msg });
    }
    if (msg.includes("not found")) {
      return res.status(404).json({ success: false, message: msg });
    }
    if (msg.includes("Invalid")) {
      return res.status(400).json({ success: false, message: msg });
    }
    return res.status(500).json({ success: false, message: "Failed to pay salary", error: msg });
  }
};
