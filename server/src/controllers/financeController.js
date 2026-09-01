const Transaction = require("../models/transactionModel");
const Student = require("../models/studentModel");

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
    const { startDate, endDate, type, category, academicYear, referenceId, status, paymentMode } = req.query;
    
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
    
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (academicYear) filter.academicYear = academicYear;
    if (referenceId) filter.referenceId = referenceId;
    if (status) filter.status = status;
    if (paymentMode) filter.paymentMode = paymentMode;

    const transactions = await Transaction.find(filter)
      .populate("recordedBy", "name initials username role")
      .populate("referenceId", "name rollNumber studentClass className")
      .sort({ date: -1 })
      .lean();
      
    return sendSuccess(res, 200, "Transactions fetched successfully", transactions);
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

    const transaction = await Transaction.create(payload);
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

    return sendSuccess(res, 200, "Transaction voided successfully", updatedTransaction);
  } catch (error) {
    console.error("Void Error:", error);
    return sendError(res, 500, "Failed to void transaction", error);
  }
};

exports.getFinanceSummary = async (req, res) => {
  try {
    const { startDate, endDate, academicYear } = req.query;
    
    let filter = { status: "Completed" }; // only active txns
    if (startDate && endDate) {
        filter.date = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }
    if (academicYear) filter.academicYear = academicYear;

    const transactions = await Transaction.find(filter).lean();
    
    let totalIncome = 0;
    let totalExpense = 0;
    let categorySummary = {};

    transactions.forEach(tx => {
      if (tx.type === "income") totalIncome += tx.amount;
      if (tx.type === "expense") totalExpense += tx.amount;
      
      if (!categorySummary[tx.category]) {
          categorySummary[tx.category] = { amount: 0, type: tx.type };
      }
      categorySummary[tx.category].amount += tx.amount;
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

exports.getStudentFeeRecords = async (req, res) => {
    try {
        const studentId = req.params.id;
        const student = await Student.findById(studentId).lean();
        
        if (!student) {
            return sendError(res, 404, "Student not found");
        }

        const feeHistory = student.feeHistory || [];
        const feeTransactions = await Transaction.find({ 
            referenceId: studentId, 
            type: "income", 
            category: "Fees",
            status: "Completed"
        }).lean();

        // Calculate paid and pending per academic year
        const result = feeHistory.map(record => {
            const payments = feeTransactions.filter(tx => tx.academicYear === record.academicYear);
            const paid = payments.reduce((acc, tx) => acc + tx.amount, 0);
            return {
                ...record,
                paid,
                pending: record.totalFee - paid,
                payments
            };
        });

        // Also find any orphan payments that don't have a feeHistory record yet
        const yearsWithHistory = new Set(feeHistory.map(r => r.academicYear));
        const orphanPayments = feeTransactions.filter(tx => !yearsWithHistory.has(tx.academicYear));
        if (orphanPayments.length > 0) {
            const orphanByYear = {};
            orphanPayments.forEach(tx => {
                if (!orphanByYear[tx.academicYear]) orphanByYear[tx.academicYear] = [];
                orphanByYear[tx.academicYear].push(tx);
            });
            Object.keys(orphanByYear).forEach(year => {
                const payments = orphanByYear[year];
                const paid = payments.reduce((acc, tx) => acc + tx.amount, 0);
                result.push({
                    academicYear: year,
                    className: payments[0].className || "Unknown",
                    totalFee: 0,
                    paid,
                    pending: 0 - paid,
                    payments
                });
            });
        }

        return sendSuccess(res, 200, "Student fee records fetched", result);
    } catch (error) {
        return sendError(res, 500, "Failed to fetch student fee records", error);
    }
};

exports.setStudentFee = async (req, res) => {
    try {
        const { academicYear, className, totalFee } = req.body;
        const studentId = req.params.id;

        const student = await Student.findById(studentId);
        if (!student) return sendError(res, 404, "Student not found");

        if (!student.feeHistory) student.feeHistory = [];
        
        const existingRecordIndex = student.feeHistory.findIndex(f => f.academicYear === academicYear);
        if (existingRecordIndex >= 0) {
            student.feeHistory[existingRecordIndex].totalFee = totalFee;
            student.feeHistory[existingRecordIndex].className = className;
            student.feeHistory[existingRecordIndex].updatedBy = req.user._id;
            student.feeHistory[existingRecordIndex].date = new Date();
        } else {
            student.feeHistory.push({
                academicYear,
                className,
                totalFee,
                updatedBy: req.user._id,
                date: new Date()
            });
        }

        await student.save();
        return sendSuccess(res, 200, "Student fee set successfully", student.feeHistory);
    } catch (error) {
        return sendError(res, 500, "Failed to set student fee", error);
    }
};
