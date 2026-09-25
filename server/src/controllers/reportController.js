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
  const { startDate, endDate, type, category, page, limit } = query;

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

  const isDonation = category === "Atiya" || category === "Kafalat" || category === "Zakat" || category === "Sadqa" || category === "Isale Sawab";

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = limit ? parseInt(limit, 10) : null;
  const skip = (parsedPage - 1) * (parsedLimit || 0);

  const facetPipeline = {
    totals: [
      {
        $group: {
          _id: null,
          totalIncome: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
          totalExpense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } }
        }
      }
    ],
    transactions: [
      { $sort: { date: -1 } }
    ]
  };

  if (parsedLimit) {
    facetPipeline.transactions.push({ $skip: skip });
    facetPipeline.transactions.push({ $limit: parsedLimit });
  }

  if (isDonation) {
    facetPipeline.donorSummary = [
      {
        $lookup: {
          from: "students",
          localField: "referenceId",
          foreignField: "_id",
          as: "studentRef"
        }
      },
      { $unwind: { path: "$studentRef", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ["$studentRef.name", "$description"] },
          totalDonated: { $sum: "$amount" }
        }
      },
      {
        $project: {
          _id: 0,
          donor: "$_id",
          totalDonated: 1
        }
      },
      { $sort: { totalDonated: -1 } }
    ];
  }

  const result = await Transaction.aggregate([
    { $match: matchStage },
    { $facet: facetPipeline }
  ]);

  const facetResult = result[0];
  const totals = facetResult.totals.length > 0 ? facetResult.totals[0] : { totalIncome: 0, totalExpense: 0 };
  const balance = totals.totalIncome - totals.totalExpense;

  // Populate references for the returned transactions
  const populatedTransactions = await Transaction.populate(facetResult.transactions, [
    { path: "recordedBy", select: "name" },
    { path: "referenceId", select: "name rollNumber studentClass className" }
  ]);

  return {
    transactions: populatedTransactions,
    totals: { totalIncome: totals.totalIncome, totalExpense: totals.totalExpense, balance },
    donorSummary: isDonation && facetResult.donorSummary.length > 0 ? facetResult.donorSummary : undefined
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
const fetchStudentListData = async (req) => {
  const { class: className, classId, status } = req.query;
  
  const matchStage = {};
  if (classId) {
    matchStage.classId = new (require("mongoose")).Types.ObjectId(classId);
  } else if (className && className !== "all") {
    matchStage.$or = [{ studentClass: className }, { className: className }];
  } else if (req.user && req.user.role === "teacher") {
    if (!req.teacherAssignedClassIds || req.teacherAssignedClassIds.length === 0) {
      return []; // Return empty result if teacher has no assigned classes
    }
    matchStage.classId = { $in: req.teacherAssignedClassIds };
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
    const data = await fetchStudentListData(req);
    return sendSuccess(res, 200, "Student list fetched", data);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch student list", error);
  }
};

const exportStudentListExcel = async (req, res) => {
  try {
    const students = await fetchStudentListData(req);

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



const { verifyTeacherClassAccess } = require("../middleware/authMiddleware");

// @desc    Get combined student result for both Madrasa and School tracks
// @route   GET /api/reports/student/:studentId/combined-result
// @access  Private (Admin, Teacher with class access)
const fetchCombinedStudentResult = async (studentId, query, user) => {
  try {
    let { academicYear, madrasaExamId, schoolExamId } = query;

    // 1. Fetch Student
    const student = await Student.findById(studentId).populate("classId schoolClassId").lean();
    if (!student) {
      throw new Error("Student not found");
    }

    if (!academicYear) {
      // Find the most recent exam for the student to determine the academic year
      const recentExamResult = await ExamResult.findOne({ studentId })
        .populate("examId")
        .sort({ createdAt: -1 })
        .lean();
      
      if (recentExamResult && recentExamResult.examId) {
        academicYear = recentExamResult.examId.academicYear;
      } else {
        // No results at all for this student
        return {
          student: {
            id: student._id,
            name: student.name || student.fullName,
            nameUrdu: student.nameUrdu,
            admissionNumber: student.admissionNumber,
            madrasaClass: student.classId ? (student.classId.fullName || student.classId.className || student.className) : null,
            schoolClass: student.schoolClassId ? (student.schoolClassId.fullName || student.schoolClassId.className) : null,
            schoolSection: student.schoolSection
          },
          madrasa: { resultsAvailable: false },
          school: { resultsAvailable: false },
          combined: null
        };
      }
    }

    // Normalize class IDs
    const normalizedMadrasaClassId =
      student.classId && typeof student.classId === "object" && student.classId._id
        ? student.classId._id
        : student.classId;

    const normalizedSchoolClassId =
      student.schoolClassId && typeof student.schoolClassId === "object" && student.schoolClassId._id
        ? student.schoolClassId._id
        : student.schoolClassId;

    // RBAC Check
    let hasAccess = false;
    if (user.role === "admin") {
      hasAccess = true;
    } else if (user.role === "teacher") {
      const hasMadrasaAccess = normalizedMadrasaClassId ? await verifyTeacherClassAccess(user, normalizedMadrasaClassId, student.className) : false;
      const hasSchoolAccess = normalizedSchoolClassId ? await verifyTeacherClassAccess(user, normalizedSchoolClassId) : false;
      hasAccess = hasMadrasaAccess || hasSchoolAccess;
    }

    if (!hasAccess) {
      throw new Error("You are not authorized to view this student's result");
    }

    // 2. Exam Resolution
    const madrasaClassId = normalizedMadrasaClassId;
    const schoolClassId = normalizedSchoolClassId;

    let selectedMadrasaExam = null;
    let selectedSchoolExam = null;

    const candidateMadrasaExams = madrasaClassId 
      ? await Exam.find({ classId: madrasaClassId, academicYear }).lean() 
      : [];
    
    const candidateSchoolExams = schoolClassId 
      ? await Exam.find({ classId: schoolClassId, academicYear }).lean() 
      : [];

    if (madrasaExamId) {
      selectedMadrasaExam = candidateMadrasaExams.find(e => String(e._id) === String(madrasaExamId));
      if (!selectedMadrasaExam) {
        throw new Error("Provided madrasaExamId does not belong to student's Madrasa class for the specified academic year.");
      }
    }

    if (schoolExamId && schoolClassId) {
      selectedSchoolExam = candidateSchoolExams.find(e => String(e._id) === String(schoolExamId));
      if (!selectedSchoolExam) {
        throw new Error("Provided schoolExamId does not belong to student's School class for the specified academic year.");
      }
    }

    // Auto-select if there's only one exam, otherwise require selection
    const needsMadrasaSelection = !selectedMadrasaExam && candidateMadrasaExams.length > 1;
    const needsSchoolSelection = schoolClassId && !selectedSchoolExam && candidateSchoolExams.length > 1;

    if (needsMadrasaSelection || needsSchoolSelection) {
      return {
        requiresExamSelection: true,
        message: "Multiple exams found for this academic year. Please select specific exams.",
        madrasaExams: candidateMadrasaExams.map(e => ({ id: e._id, name: e.name, examType: e.examType })),
        schoolExams: candidateSchoolExams.map(e => ({ id: e._id, name: e.name, examType: e.examType }))
      };
    }

    if (!selectedMadrasaExam && candidateMadrasaExams.length === 1) {
      selectedMadrasaExam = candidateMadrasaExams[0];
    }
    if (schoolClassId && !selectedSchoolExam && candidateSchoolExams.length === 1) {
      selectedSchoolExam = candidateSchoolExams[0];
    }

    // 3. Fetch Results
    let madrasaData = null;
    let schoolData = null;
    let combined = null;

    let mTotalMax = 0, mTotalObt = 0;
    let sTotalMax = 0, sTotalObt = 0;

    if (selectedMadrasaExam) {
      const results = await ExamResult.find({ studentId, examId: selectedMadrasaExam._id }).lean();
      madrasaData = {
        resultsAvailable: results.length > 0,
        class: {
          id: normalizedMadrasaClassId,
          name: student.classId && typeof student.classId === "object" ? (student.classId.fullName || student.classId.className || student.className) : student.className,
          department: student.classId && typeof student.classId === "object" ? student.classId.department : null
        },
        exam: {
          id: selectedMadrasaExam._id,
          name: selectedMadrasaExam.name,
          examType: selectedMadrasaExam.examType,
          academicYear: selectedMadrasaExam.academicYear
        },
        subjects: [],
        totals: {
          maxMarks: 0,
          obtainedMarks: 0,
          percentage: 0,
          grade: "" // Could compute using same logic as marksheet
        }
      };
      
      let failFlag = false;
      for (const res of results) {
        madrasaData.subjects.push({
          subject: res.subject,
          marks: res.marks,
          maxMarks: selectedMadrasaExam.maxMarks,
          passingMarks: selectedMadrasaExam.passingMarks
        });
        mTotalMax += selectedMadrasaExam.maxMarks || 100;
        if (res.marks === -1) {
          // Absent
          failFlag = true;
        } else {
          mTotalObt += res.marks;
          if (res.marks < selectedMadrasaExam.passingMarks) {
            failFlag = true;
          }
        }
      }
      if (results.length > 0) {
        madrasaData.totals.maxMarks = mTotalMax;
        madrasaData.totals.obtainedMarks = mTotalObt;
        madrasaData.totals.percentage = mTotalMax > 0 ? (mTotalObt / mTotalMax) * 100 : 0;
        madrasaData.totals.grade = failFlag ? "F" : getGradeFromPercentage(madrasaData.totals.percentage);
      }
    } else {
       madrasaData = { resultsAvailable: false, message: "No Madrasa exams found for this year." };
    }

    if (schoolClassId) {
      if (selectedSchoolExam) {
        const results = await ExamResult.find({ studentId, examId: selectedSchoolExam._id }).lean();
        schoolData = {
          resultsAvailable: results.length > 0,
          class: {
            id: normalizedSchoolClassId,
            name: student.schoolClassId && typeof student.schoolClassId === "object" ? (student.schoolClassId.fullName || student.schoolClassId.className) : null,
            section: student.schoolSection
          },
          exam: {
            id: selectedSchoolExam._id,
            name: selectedSchoolExam.name,
            examType: selectedSchoolExam.examType,
            academicYear: selectedSchoolExam.academicYear
          },
          subjects: [],
          totals: {
            maxMarks: 0,
            obtainedMarks: 0,
            percentage: 0,
            grade: ""
          }
        };

        let failFlag = false;
        for (const res of results) {
          schoolData.subjects.push({
            subject: res.subject,
            marks: res.marks,
            maxMarks: selectedSchoolExam.maxMarks,
            passingMarks: selectedSchoolExam.passingMarks
          });
          sTotalMax += selectedSchoolExam.maxMarks || 100;
          if (res.marks === -1) {
            failFlag = true;
          } else {
            sTotalObt += res.marks;
            if (res.marks < selectedSchoolExam.passingMarks) {
              failFlag = true;
            }
          }
        }
        if (results.length > 0) {
          schoolData.totals.maxMarks = sTotalMax;
          schoolData.totals.obtainedMarks = sTotalObt;
          schoolData.totals.percentage = sTotalMax > 0 ? (sTotalObt / sTotalMax) * 100 : 0;
          schoolData.totals.grade = failFlag ? "F" : getGradeFromPercentage(schoolData.totals.percentage);
        }
      } else {
        schoolData = { resultsAvailable: false, message: "No School exams found for this year." };
      }
    }

    // 4. Combined Totals
    if (madrasaData?.resultsAvailable && schoolData?.resultsAvailable) {
      const combinedMax = mTotalMax + sTotalMax;
      const combinedObt = mTotalObt + sTotalObt;
      const combinedPct = combinedMax > 0 ? (combinedObt / combinedMax) * 100 : 0;
      combined = {
        maxMarks: combinedMax,
        obtainedMarks: combinedObt,
        percentage: combinedPct,
        grade: madrasaData.totals.grade === "F" || schoolData.totals.grade === "F" ? "F" : getGradeFromPercentage(combinedPct)
      };
    }

    // Student Info
    const studentInfo = {
      id: student._id,
      name: student.name || student.fullName,
      nameUrdu: student.nameUrdu,
      admissionNumber: student.admissionNumber,
      madrasaClass: student.classId ? (student.classId.fullName || student.classId.className || student.className) : null,
      schoolClass: student.schoolClassId ? (student.schoolClassId.fullName || student.schoolClassId.className) : null,
      schoolSection: student.schoolSection
    };

    return {
      student: studentInfo,
      madrasa: madrasaData,
      school: schoolData,
      combined: combined
    };

  } catch (error) {
    throw error;
  }
};

const getCombinedStudentResult = async (req, res) => {
  try {
    const data = await fetchCombinedStudentResult(req.params.studentId, req.query, req.user);
    if (data.requiresExamSelection) {
      return res.status(200).json({ success: true, ...data });
    }
    return sendSuccess(res, 200, "Combined result fetched", data);
  } catch (err) {
    const statusCode = err.message === "You are not authorized to view this student's result" ? 403 : (err.message.includes("not found") ? 404 : 400);
    return sendError(res, statusCode, err.message);
  }
};

const getGradeFromPercentage = (percentage) => {
  if (percentage >= 80) return "A+";
  if (percentage >= 70) return "A";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  if (percentage >= 33) return "E";
  return "F";
};


module.exports = {
  fetchCombinedStudentResult,
  getSummary,
  getWeakStudentsReport,
  getDetailedFinanceReport,
  exportDetailedFinanceExcel,
  getStudentListReport,
  exportStudentListExcel,
  getExamAnalyticsReport,
  getCombinedStudentResult
};
