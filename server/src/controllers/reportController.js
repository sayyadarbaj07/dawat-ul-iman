const Student = require("../models/studentModel");
const Teacher = require("../models/teacherModel");
const Meeting = require("../models/meetingModel");
const Transaction = require("../models/transactionModel");
const Exam = require("../models/examModel");
const ExamResult = require("../models/examResultModel");
const excelService = require("../services/excelService");

const sendSuccess = (res, statusCode, message, data = null) => {
  const payload = { success: true, message };
  if (data) payload.data = data;
  return res.status(statusCode).json(payload);
};

const sendError = (res, statusCode, message, error = null) => {
  const payload = { success: false, message };
  if (error) {
    payload.error = error.message || error;
  }
  return res.status(statusCode).json(payload);
};

// @desc    Get summary statistics for reports
// @route   GET /api/reports/summary
// @access  Private
const getSummary = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalTeachers = await Teacher.countDocuments();
    const totalMeetings = await Meeting.countDocuments();
    
    // Quick Finance Stats via Aggregation
    const financeSummary = await Transaction.aggregate([
      { $match: { status: "Completed" } },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" }
        }
      }
    ]);

    let totalIncome = 0;
    let totalExpenses = 0;
    financeSummary.forEach(item => {
      if (item._id === "income") totalIncome = item.total;
      if (item._id === "expense") totalExpenses = item.total;
    });

    return sendSuccess(res, 200, "Summary fetched successfully", {
      totalStudents,
      totalTeachers,
      totalMeetings,
      finance: {
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses
      }
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch report summary", error);
  }
};

const getWeakStudentsReport = async (req, res) => {
  try {
    const { class: className, classId } = req.query;
    
    const initialMatch = { status: "active" };
    if (classId) {
      initialMatch.classId = new (require("mongoose")).Types.ObjectId(classId);
    } else if (className && className !== "all") {
      initialMatch.$or = [{ studentClass: className }, { className: className }];
    }

    const weakStudents = await Student.aggregate([
      {
        $match: initialMatch
      },
      {
        $lookup: {
          from: "examresults",
          localField: "_id",
          foreignField: "studentId",
          as: "examResults"
        }
      },
      {
        $addFields: {
          averageMarks: {
            $cond: {
              if: { $gt: [{ $size: "$examResults" }, 0] },
              then: { $avg: "$examResults.marks" },
              else: 0
            }
          },
          failedSubjectsCount: {
            $size: {
              $filter: {
                input: "$examResults",
                as: "result",
                cond: { $lt: ["$$result.marks", 33] }
              }
            }
          }
        }
      },
      {
        $match: {
          $or: [
            { attendancePercent: { $lt: 75 } },
            { averageMarks: { $lt: 40 } },
            { failedSubjectsCount: { $gt: 0 } }
          ]
        }
      },
      {
        $project: {
          studentId: 1,
          name: 1,
          fatherName: 1,
          className: 1,
          attendancePercent: 1,
          averageMarks: { $round: ["$averageMarks", 2] },
          failedSubjectsCount: 1,
          reasons: {
            $concatArrays: [
              { $cond: [{ $lt: ["$attendancePercent", 75] }, ["Low Attendance"], []] },
              { $cond: [{ $lt: ["$averageMarks", 40] }, ["Low Average Marks"], []] },
              { $cond: [{ $gt: ["$failedSubjectsCount", 0] }, ["Failed Subjects"], []] }
            ]
          }
        }
      },
      {
        $sort: { className: 1, name: 1 }
      }
    ]);

    return sendSuccess(res, 200, "Weak students report fetched successfully", weakStudents);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch weak students report", error);
  }
};

// Helper for Detailed Finance Report Data
const fetchDetailedFinanceData = async (query) => {
  const { startDate, endDate, type, category } = query;

  const matchStage = { status: "Completed" };
  if (startDate && endDate) {
    matchStage.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  } else if (startDate) {
    matchStage.date = { $gte: new Date(startDate) };
  } else if (endDate) {
    matchStage.date = { $lte: new Date(endDate) };
  }

  if (type && type !== "all") matchStage.type = type;
  if (category && category !== "all") matchStage.category = category;

  const transactions = await Transaction.find(matchStage)
    .populate("recordedBy", "name")
    .populate("referenceId", "name rollNumber studentClass className")
    .sort({ date: -1 })
    .lean();

  let totalIncome = 0;
  let totalExpense = 0;
  transactions.forEach(t => {
    if (t.type === "income") totalIncome += t.amount;
    if (t.type === "expense") totalExpense += t.amount;
  });

  let donorSummary = [];
  if (category === "Atiya" || category === "Kafalat" || category === "Zakat" || category === "Sadqa" || category === "Isale Sawab") {
      const donorGroups = {};
      transactions.forEach(t => {
           const donorName = t.referenceId ? (t.referenceId.name || t.referenceId.fullName) : t.description;
           if (!donorGroups[donorName]) donorGroups[donorName] = 0;
           donorGroups[donorName] += t.amount;
      });
      donorSummary = Object.keys(donorGroups).map(name => ({ donor: name, totalDonated: donorGroups[name] })).sort((a,b) => b.totalDonated - a.totalDonated);
  }

  return {
    transactions,
    totals: { totalIncome, totalExpense, balance: totalIncome - totalExpense },
    donorSummary: donorSummary.length > 0 ? donorSummary : undefined
  };
};

const getDetailedFinanceReport = async (req, res) => {
  try {
    const data = await fetchDetailedFinanceData(req.query);
    return sendSuccess(res, 200, "Finance report fetched", data);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch detailed finance report", error);
  }
};



// Helper for Student List Report Data
const fetchStudentListData = async (query) => {
  const { class: className, classId, status } = query;
  
  const matchStage = {};
  if (classId) {
    matchStage.classId = new (require("mongoose")).Types.ObjectId(classId);
  } else if (className && className !== "all") {
    matchStage.$or = [{ studentClass: className }, { className: className }];
  }
  if (status && status !== "all") matchStage.status = status;
  else matchStage.status = "active"; // default to active

  const students = await Student.find(matchStage)
    .sort({ className: 1, rollNumber: 1, name: 1 })
    .lean();

  return students;
};

const getStudentListReport = async (req, res) => {
  try {
    const data = await fetchStudentListData(req.query);
    return sendSuccess(res, 200, "Student list fetched", data);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch student list", error);
  }
};

const exportStudentListExcel = async (req, res) => {
  try {
    const students = await fetchStudentListData(req.query);

    const columns = [
      { header: "Roll No", key: "rollNumber", width: 15 },
      { header: "Name", key: "name", width: 30 },
      { header: "Class", key: "className", width: 15 },
      { header: "Gender", key: "gender", width: 12 },
      { header: "DOB", key: "dob", width: 15 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Admission Date", key: "admissionDate", width: 15 }
    ];

    const data = students.map(s => ({
      rollNumber: s.rollNumber || "-",
      name: s.name || s.fullName,
      className: s.className || s.studentClass,
      gender: s.gender || "-",
      dob: s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString() : "-",
      phone: s.contactNumber || s.phone || "-",
      admissionDate: s.admissionDate ? new Date(s.admissionDate).toLocaleDateString() : "-"
    }));

    const title = "Student Directory Report";
    const subtitle = `Class: ${req.query.class || "All"} | Generated on ${new Date().toLocaleDateString()}`;

    const buffer = await excelService.generateReport({ title, subtitle, columns, data });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Student_List.xlsx"');
    return res.send(buffer);
  } catch (error) {
    return sendError(res, 500, "Failed to export Excel", error);
  }
};

// Helper for Exam Analytics Data
const fetchExamAnalyticsData = async (query) => {
  const { examType, class: className, classId } = query;
  
  const matchStage = {};
  if (examType && examType !== "all") matchStage.examType = examType;
  if (classId) {
    matchStage.classId = new (require("mongoose")).Types.ObjectId(classId);
  } else if (className && className !== "all") {
    matchStage.class = className;
  }

  const exams = await Exam.find(matchStage).lean();
  if (!exams.length) return [];

  const examIds = exams.map(e => e._id);
  const results = await ExamResult.find({ examId: { $in: examIds } }).lean();
  
  const analytics = [];

  for (const exam of exams) {
    const examResults = results.filter(r => String(r.examId) === String(exam._id));
    
    // Group by student to calculate pass/fail
    const studentMarks = {};
    examResults.forEach(r => {
      const sId = r.studentId.toString();
      if (!studentMarks[sId]) studentMarks[sId] = { total: 0, hasFailed: false };
      
      if (r.marks === -1 || r.marks < exam.passingMarks) {
        studentMarks[sId].hasFailed = true;
      } else {
        studentMarks[sId].total += r.marks;
      }
    });

    let passed = 0;
    let failed = 0;
    Object.values(studentMarks).forEach(s => {
      if (s.hasFailed) failed++;
      else passed++;
    });

    const totalStudents = passed + failed;
    const passPercentage = totalStudents > 0 ? ((passed / totalStudents) * 100).toFixed(2) : 0;

    analytics.push({
      examId: exam._id,
      examName: exam.name || exam.examName || "Unnamed",
      className: exam.class,
      examType: exam.examType,
      academicYear: exam.academicYear,
      totalStudents,
      passed,
      failed,
      passPercentage
    });
  }

  analytics.sort((a, b) => {
    if (a.academicYear === b.academicYear) return a.className.localeCompare(b.className);
    return (a.academicYear || "").localeCompare(b.academicYear || "");
  });

  return analytics;
};

const getExamAnalyticsReport = async (req, res) => {
  try {
    const data = await fetchExamAnalyticsData(req.query);
    return sendSuccess(res, 200, "Exam analytics fetched", data);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch exam analytics", error);
  }
};

const exportDetailedFinanceExcel = async (req, res) => {
  try {
    const reportData = await fetchDetailedFinanceData(req.query);
    const { transactions, donorSummary } = reportData;

    let columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Description", key: "description", width: 30 },
      { header: "Type", key: "type", width: 15 },
      { header: "Category", key: "category", width: 20 },
      { header: "Amount", key: "amount", width: 15 },
      { header: "Payment Mode", key: "paymentMode", width: 15 },
    ];

    let data = transactions.map(t => ({
      date: new Date(t.date).toLocaleDateString(),
      description: t.description,
      type: t.type === 'income' ? 'Income' : 'Expense',
      category: t.category,
      amount: t.amount,
      paymentMode: t.paymentMode
    }));

    // If Donor report, show donor summary instead or first
    if (donorSummary && donorSummary.length > 0) {
      columns = [
        { header: "Donor Name", key: "donor", width: 40 },
        { header: "Total Donated (Rs)", key: "totalDonated", width: 20 }
      ];
      data = donorSummary;
    }

    const title = donorSummary && donorSummary.length > 0 ? "Donor Report" : "Detailed Finance Report";
    const subtitle = `Generated on ${new Date().toLocaleDateString()}`;

    const buffer = await excelService.generateReport({ title, subtitle, columns, data });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}.xlsx"`);
    return res.send(buffer);

  } catch (error) {
    return sendError(res, 500, "Failed to export Excel", error);
  }
};



module.exports = {
  getSummary,
  getWeakStudentsReport,
  getDetailedFinanceReport,
  exportDetailedFinanceExcel,
  getStudentListReport,
  exportStudentListExcel,
  getExamAnalyticsReport
};
