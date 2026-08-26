const Transaction = require("../models/transactionModel");
const Category = require("../models/categoryModel");

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
    const transactions = await Transaction.find()
      .populate("recordedBy", "name initials username role")
      .populate("category", "name")
      .sort({ date: -1 });
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

    if (req.body.category && typeof req.body.category === 'string') {
      let cat = await Category.findOne({ name: req.body.category, type: req.body.type });
      if (!cat) {
        cat = await Category.create({ name: req.body.category, type: req.body.type });
      }
      payload.category = cat._id;
    }

    const transaction = await Transaction.create(payload);
    return sendSuccess(res, 201, "Transaction created successfully", transaction);
  } catch (error) {
    console.error("Transaction Error:", error);
    return sendError(res, 500, "Failed to create transaction", error);
  }
};

exports.getFinanceSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let filter = {};
    if (startDate && endDate) {
        filter.date = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    const transactions = await Transaction.find(filter);
    
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(tx => {
      if (tx.type === "income") totalIncome += tx.amount;
      if (tx.type === "expense") totalExpense += tx.amount;
    });

    const currentBalance = totalIncome - totalExpense;

    return sendSuccess(res, 200, "Finance summary fetched successfully", {
      totalIncome,
      totalExpense,
      currentBalance
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch finance summary", error);
  }
};

// --- Category Management ---

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    return sendSuccess(res, 200, "Categories fetched successfully", categories);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch categories", error);
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, type } = req.body;
    const categoryExists = await Category.findOne({ name, type });
    if (categoryExists) {
        return sendError(res, 400, "Category already exists");
    }
    const category = await Category.create({ name, type });
    return sendSuccess(res, 201, "Category created successfully", category);
  } catch (error) {
    return sendError(res, 500, "Failed to create category", error);
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    return sendSuccess(res, 200, "Category deleted successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to delete category", error);
  }
};
