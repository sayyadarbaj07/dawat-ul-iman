const mongoose = require("mongoose");

const hostelAttendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    session: {
      type: String,
      enum: ["morning", "evening"],
      required: true,
    },
    status: {
      type: String,
      enum: ["present", "absent"],
      required: true,
    },
    remarks: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { timestamps: true }
);

// Ensure a student has only one attendance record per date and session
hostelAttendanceSchema.index({ studentId: 1, date: 1, session: 1 }, { unique: true });

module.exports = mongoose.model("HostelAttendance", hostelAttendanceSchema);
