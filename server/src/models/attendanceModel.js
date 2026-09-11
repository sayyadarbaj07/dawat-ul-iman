const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    userType: {
      type: String,
      enum: ["Student", "Teacher"],
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'userType'
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    },
    className: {
      type: String,
    },
    status: {
      type: String,
      enum: ["Present", "Absent", "Late", "Leave"],
      required: true,
    },
    remarks: {
      type: String,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

// Existing unique constraint
attendanceSchema.index({ date: 1, userId: 1 }, { unique: true });

// Existing index for daily class-wide attendance queries
attendanceSchema.index({ className: 1, date: 1 });

// NEW: Optimized index for class-wide queries using classId
attendanceSchema.index({ classId: 1, date: -1 });

// NEW: Optimized index for querying a specific student/teacher's historical attendance
attendanceSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
