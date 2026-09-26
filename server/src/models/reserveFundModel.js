const mongoose = require("mongoose");

const reserveFundTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, "Amount must be strictly > 0"],
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    paymentMode: {
      type: String,
      enum: ["Cash", "Bank", "Online"],
      required: true,
    },
    reference: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Completed", "Cancelled"],
      default: "Completed",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

reserveFundTransactionSchema.index({ status: 1, type: 1 });
reserveFundTransactionSchema.index({ date: -1 });
reserveFundTransactionSchema.index({ status: 1, date: -1 });

module.exports = mongoose.model("ReserveFundTransaction", reserveFundTransactionSchema);
