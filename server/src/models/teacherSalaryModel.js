const mongoose = require("mongoose");

const teacherSalarySchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    monthlySalarySnapshot: {
      type: Number,
      required: true,
      min: 0,
    },
    dailySalary: {
      type: Number,
      required: true,
      min: 0,
    },
    allowedLeave: {
      type: Number,
      default: 1,
    },
    leaveTaken: {
      type: Number,
      default: 0,
    },
    extraLeave: {
      type: Number,
      default: 0,
    },
    absentDays: {
      type: Number,
      default: 0,
    },
    sundays: {
      type: Number,
      default: 0,
    },
    lateDays: {
      type: Number,
      default: 0,
    },
    notMarkedDays: {
      type: Number,
      default: 0,
    },
    leaveDeduction: {
      type: Number,
      default: 0,
    },
    absentDeduction: {
      type: Number,
      default: 0,
    },
    totalDeduction: {
      type: Number,
      default: 0,
    },
    payableSalary: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Draft", "Paid"],
      default: "Draft",
      index: true,
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    financeTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    paymentMethod: {
      type: String,
      default: null,
    },
    paymentReference: {
      type: String,
      default: null,
    },
    remarks: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index to ensure one salary record per teacher per month/year
teacherSalarySchema.index({ teacherId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("TeacherSalary", teacherSalarySchema);
