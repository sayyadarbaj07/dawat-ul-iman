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
    status: {
      type: String,
      enum: ["Present", "Absent", "Late"],
      required: true,
    },
    className: {
      type: String,
    },
    remarks: {
      type: String,
    }
  },
  { timestamps: true }
);

attendanceSchema.index({ date: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
