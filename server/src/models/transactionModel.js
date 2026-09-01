const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Fees", "Kafalat", "Atiya", "Zakat", "Sadqa", "Isale Sawab", "Other", // Income
        "Tankha", "Food", "Medical", "Wazifa" // + Other (Expense)
      ]
    },
    paymentMode: {
      type: String,
      enum: ["Cash", "Bank", "Online"],
      default: "Cash"
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student", // Optional link to student if Fees
      required: false
    },
    academicYear: {
      type: String, // e.g. "2025-26"
      required: false,
    },
    className: {
      type: String,
      required: false,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["Completed", "Cancelled"],
      default: "Completed"
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    receiptId: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },
    receiptPhoto: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
