const mongoose = require("mongoose");
const ReserveFundTransaction = require("../models/reserveFundModel");
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

// Calculates current balance in a session (or without)
const calculateBalance = async (session = null) => {
  const summary = await ReserveFundTransaction.aggregate([
    { $match: { status: "Completed" } },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" }
      }
    }
  ], { session });

  let totalAdded = 0;
  let totalSpent = 0;

  summary.forEach(item => {
    if (item._id === "credit") totalAdded = item.total;
    if (item._id === "debit") totalSpent = item.total;
  });

  return { totalAdded, totalSpent, currentBalance: totalAdded - totalSpent };
};

exports.getSummary = async (req, res) => {
  try {
    const summary = await calculateBalance();
    return sendSuccess(res, 200, "Reserve Fund summary fetched", summary);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch reserve fund summary", error);
  }
};

exports.getList = async (req, res) => {
  try {
    const { startDate, endDate, type, status, search, page = 1, limit = 50 } = req.query;
    
    let filter = {};
    if (startDate && endDate) {
        filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (startDate) {
        filter.date = { $gte: new Date(startDate) };
    } else if (endDate) {
        filter.date = { $lte: new Date(endDate) };
    }
    
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (search) {
      filter.description = { $regex: search, $options: "i" };
    }

    const parsedPage = parseInt(page, 10);
    const parsedLimit = Math.min(parseInt(limit, 10), 500);
    const skip = (parsedPage - 1) * parsedLimit;

    const total = await ReserveFundTransaction.countDocuments(filter);
    
    const transactions = await ReserveFundTransaction.find(filter)
      .populate("createdBy", "name username role email")
      .populate("updatedBy", "name username role email")
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();
      
    return sendSuccess(res, 200, "Reserve fund list fetched", {
      data: transactions,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch reserve fund list", error);
  }
};

exports.getSingle = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 400, "Invalid ObjectId format");
    }
    const transaction = await ReserveFundTransaction.findById(req.params.id)
      .populate("createdBy", "name username role email")
      .populate("updatedBy", "name username role email")
      .lean();
    if (!transaction) return sendError(res, 404, "Transaction not found");
    return sendSuccess(res, 200, "Transaction fetched", transaction);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch transaction", error);
  }
};

exports.createTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { type, amount, date, description, category, paymentMode, reference, remarks } = req.body;

    if (!type || !["credit", "debit"].includes(type)) throw new Error("Invalid type");
    if (amount === undefined || amount <= 0 || !Number.isFinite(amount)) throw new Error("Amount must be greater than 0");
    if (!description || !description.trim()) throw new Error("Description is required");
    if (!paymentMode || !["Cash", "Bank", "Online"].includes(paymentMode)) throw new Error("Invalid payment mode");

    let finalDate = Date.now();
    if (date) {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) throw new Error("Invalid date");
        finalDate = parsedDate;
    }

    if (type === "debit") {
      const balance = await calculateBalance(session);
      if (amount > balance.currentBalance) {
        await session.abortTransaction();
        session.endSession();
        return sendError(res, 400, "Insufficient Reserve Funds.");
      }
    }

    const transaction = new ReserveFundTransaction({
      type,
      amount,
      date: finalDate,
      description: description.trim(),
      category: category ? category.trim() : undefined,
      paymentMode,
      reference: reference ? reference.trim() : undefined,
      remarks: remarks ? remarks.trim() : undefined,
      createdBy: req.user._id,
      status: "Completed"
    });

    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    try {
      ActivityNotificationService.dispatchActivityEvent({
        user: req.user,
        action: "RESERVE_FUND_CREATED",
        description: `Created Reserve Fund ${type} of ${amount} for ${description}`,
        moduleName: "Finance",
      });
    } catch (e) {
      console.error("Activity log failed", e);
    }

    return sendSuccess(res, 201, "Transaction created", transaction);
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    return sendError(res, error.message === "Insufficient Reserve Funds." ? 400 : 500, error.message || "Failed to create transaction");
  }
};

exports.updateTransaction = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 400, "Invalid ObjectId format");
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const txId = req.params.id;
    const { type, amount, date, description, category, paymentMode, reference, remarks } = req.body;

    const existingTx = await ReserveFundTransaction.findById(txId).session(session);
    if (!existingTx) {
        await session.abortTransaction();
        session.endSession();
        return sendError(res, 404, "Transaction not found");
    }
    if (existingTx.status === "Cancelled") {
        await session.abortTransaction();
        session.endSession();
        return sendError(res, 400, "Cannot edit a cancelled transaction");
    }

    if (type && !["credit", "debit"].includes(type)) throw new Error("Invalid type");
    if (amount !== undefined && (amount <= 0 || !Number.isFinite(amount))) throw new Error("Amount must be greater than 0");
    if (paymentMode && !["Cash", "Bank", "Online"].includes(paymentMode)) throw new Error("Invalid payment mode");
    if (description !== undefined && !description.trim()) throw new Error("Description is required");
    
    let finalDate = existingTx.date;
    if (date) {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) throw new Error("Invalid date");
        finalDate = parsedDate;
    }

    // Compute net balance delta if type or amount changes
    if ((type && type !== existingTx.type) || (amount !== undefined && amount !== existingTx.amount)) {
      const balance = await calculateBalance(session);
      
      // Calculate what the balance would be if we removed the existing transaction
      let tempBalance = balance.currentBalance;
      if (existingTx.type === "credit") tempBalance -= existingTx.amount;
      if (existingTx.type === "debit") tempBalance += existingTx.amount;

      // Add the new transaction amount
      const newType = type || existingTx.type;
      const newAmount = amount !== undefined ? amount : existingTx.amount;
      
      if (newType === "credit") tempBalance += newAmount;
      if (newType === "debit") tempBalance -= newAmount;

      if (tempBalance < 0) {
        await session.abortTransaction();
        session.endSession();
        return sendError(res, 400, "Insufficient Reserve Funds.");
      }
    }

    existingTx.type = type || existingTx.type;
    if (amount !== undefined) existingTx.amount = amount;
    existingTx.date = finalDate;
    if (description !== undefined) existingTx.description = description.trim();
    if (category !== undefined) existingTx.category = category.trim();
    if (paymentMode) existingTx.paymentMode = paymentMode;
    if (reference !== undefined) existingTx.reference = reference.trim();
    if (remarks !== undefined) existingTx.remarks = remarks.trim();
    existingTx.updatedBy = req.user._id;

    await existingTx.save({ session });

    await session.commitTransaction();
    session.endSession();

    try {
      ActivityNotificationService.dispatchActivityEvent({
        user: req.user,
        action: "RESERVE_FUND_UPDATED",
        description: `Edited Reserve Fund transaction ${existingTx._id}. Amount: ${existingTx.amount}`,
        moduleName: "Finance",
      });
    } catch (e) {
      console.error("Activity log failed", e);
    }

    return sendSuccess(res, 200, "Transaction updated", existingTx);
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    return sendError(res, error.message === "Insufficient Reserve Funds." ? 400 : 500, error.message || "Failed to update transaction");
  }
};

exports.deleteTransaction = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 400, "Invalid ObjectId format");
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const txId = req.params.id;
    const existingTx = await ReserveFundTransaction.findById(txId).session(session);
    
    if (!existingTx) {
        await session.abortTransaction();
        session.endSession();
        return sendError(res, 404, "Transaction not found");
    }
    
    if (existingTx.status === "Cancelled") {
        await session.abortTransaction();
        session.endSession();
        return sendError(res, 400, "Transaction is already cancelled");
    }

    // If deleting a credit, make sure it doesn't drop balance below zero
    if (existingTx.type === "credit") {
        const balance = await calculateBalance(session);
        if (balance.currentBalance - existingTx.amount < 0) {
            await session.abortTransaction();
            session.endSession();
            return sendError(res, 400, "Cannot cancel this credit: Insufficient Reserve Funds to cover existing debits.");
        }
    }

    existingTx.status = "Cancelled";
    existingTx.updatedBy = req.user._id;
    existingTx.remarks = (existingTx.remarks ? existingTx.remarks + " | " : "") + `Voided by ${req.user.username || req.user.email || 'admin'} on ${new Date().toISOString().split('T')[0]}`;
    
    await existingTx.save({ session });
    
    await session.commitTransaction();
    session.endSession();

    try {
      ActivityNotificationService.dispatchActivityEvent({
        user: req.user,
        action: "RESERVE_FUND_DELETED",
        description: `Voided Reserve Fund transaction ${existingTx._id}.`,
        moduleName: "Finance",
      });
    } catch (e) {
      console.error("Activity log failed", e);
    }

    return sendSuccess(res, 200, "Transaction cancelled", existingTx);
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    return sendError(res, 500, error.message || "Failed to delete transaction");
  }
};
