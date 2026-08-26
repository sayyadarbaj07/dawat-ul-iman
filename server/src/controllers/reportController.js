const Student = require("../models/studentModel");
const Teacher = require("../models/teacherModel");
const Meeting = require("../models/meetingModel");
const Transaction = require("../models/transactionModel");

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
    
    // Quick Finance Stats
    const transactions = await Transaction.find();
    let totalIncome = 0;
    let totalExpenses = 0;
    transactions.forEach(t => {
      if (t.type === "Income") totalIncome += t.amount;
      if (t.type === "Expense") totalExpenses += t.amount;
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
    const { class: className } = req.query;
    
    const initialMatch = { status: "active" };
    if (className && className !== "all") {
      initialMatch.className = className;
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

module.exports = {
  getSummary,
  getWeakStudentsReport,
};
