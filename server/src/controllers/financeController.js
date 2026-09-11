const Transaction = require("../models/transactionModel");
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

exports.getAllTransactions = async (req, res) => {
  try {
    const { startDate, endDate, type, category, academicYear, referenceId, status, paymentMode, page = 1, limit = 50 } = req.query;
    
    let filter = {};
    if (startDate && endDate) {
        filter.date = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    } else if (startDate) {
        filter.date = { $gte: new Date(startDate) };
    } else if (endDate) {
        filter.date = { $lte: new Date(endDate) };
    }
    
    if (type && type !== "all") filter.type = type;
    if (category) filter.category = category;
    if (academicYear) filter.academicYear = academicYear;
    if (referenceId) filter.referenceId = referenceId;
    if (status) filter.status = status;
    if (paymentMode) filter.paymentMode = paymentMode;

    const parsedPage = parseInt(page, 10);
    const parsedLimit = Math.min(parseInt(limit, 10), 500); // cap limit at 500
    const skip = (parsedPage - 1) * parsedLimit;

    const total = await Transaction.countDocuments(filter);
    
    const transactions = await Transaction.find(filter)
      .populate("recordedBy", "name initials username role")
      .populate("referenceId", "name rollNumber studentClass className")
      .sort({ date: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();
      
    return sendSuccess(res, 200, "Transactions fetched successfully", {
      data: transactions,
      meta: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch transactions", error);
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const payload = {
       ...req.body,
       recordedBy: req.user._id
    };

    if (req.file) {
      payload.receiptPhoto = `/uploads/receipts/${req.file.filename}`;
    }
    
    if (!payload.receiptId || payload.receiptId.trim() === "") {
      delete payload.receiptId;
    } else {
      payload.receiptId = payload.receiptId.trim();
    }

    if (payload.referenceId === "") {
        delete payload.referenceId;
    }

    
    // Dual-write class info if this is a student fee transaction
    if (payload.category === 'Fees' && payload.referenceId) {
      const student = await Student.findById(payload.referenceId).populate('classId');
      if (student) {
        if (student.classId) {
          payload.classId = student.classId._id;
          // Do not set payload.className here to avoid dual-write conflicts
        } else if (student.className || student.studentClass) {
          payload.className = student.className || student.studentClass;
        }
      }
    }

    const transaction = await Transaction.create(payload);

    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "TRANSACTION_CREATED",
      description: `Created ${payload.type} transaction: ${payload.amount} for ${payload.title || payload.category}`,
      moduleName: "Finance",
      notification: {
        title: "New Transaction Created",
        message: `A new ${payload.type} transaction of ${payload.amount} has been recorded.`,
        type: "success",
        link: `/finance`,
        relatedEntity: { entityId: transaction._id, entityModel: "Transaction" }
      },
      notifyAdmins: true
    });

    return sendSuccess(res, 201, "Transaction created successfully", transaction);
  } catch (error) {
    console.error("Transaction Error:", error);
    return sendError(res, 500, "Failed to create transaction", error);
  }
};

exports.voidTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return sendError(res, 404, "Transaction not found");
    }
    
    const newRemarks = (transaction.remarks ? transaction.remarks + " | " : "") + "Voided by " + (req.user?.name || "Admin") + " on " + new Date().toISOString().split("T")[0];
    
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "Cancelled", remarks: newRemarks } },
      { new: true }
    );

    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "TRANSACTION_VOIDED",
      description: `Voided transaction: ${transaction.title || transaction.category} (${transaction.amount})`,
      moduleName: "Finance",
      notification: {
        title: "Transaction Voided",
        message: `A transaction of ${transaction.amount} has been voided.`,
        type: "warning",
        link: `/finance`,
        relatedEntity: { entityId: transaction._id, entityModel: "Transaction" }
      },
      notifyAdmins: true
    });

    return sendSuccess(res, 200, "Transaction voided successfully", updatedTransaction);
  } catch (error) {
    console.error("Void Error:", error);
    return sendError(res, 500, "Failed to void transaction", error);
  }
};

exports.getFinanceSummary = async (req, res) => {
  try {
    const { startDate, endDate, academicYear } = req.query;
    
    let matchStage = { status: "Completed" };
    if (startDate && endDate) {
        matchStage.date = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }
    if (academicYear) matchStage.academicYear = academicYear;

    const summaryData = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$category",
          totalAmount: { $sum: "$amount" },
          type: { $first: "$type" }
        }
      }
    ]);

    let totalIncome = 0;
    let totalExpense = 0;
    let categorySummary = {};

    summaryData.forEach(item => {
      const cat = item._id;
      const amt = item.totalAmount;
      const type = item.type;

      if (type === "income") totalIncome += amt;
      if (type === "expense") totalExpense += amt;
      
      categorySummary[cat] = { amount: amt, type };
    });

    const currentBalance = totalIncome - totalExpense;

    return sendSuccess(res, 200, "Finance summary fetched successfully", {
      totalIncome,
      totalExpense,
      currentBalance,
      categorySummary
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch finance summary", error);
  }
};
