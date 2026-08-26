const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    classesAssigned: {
      type: Number,
      required: true,
      default: 0,
    },
    assignedClasses: [{
      type: String,
      enum: ["diniyat", "arabic", "contemporary"],
    }],
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    salary: {
      type: Number,
      required: true,
      default: 0,
    },
    attendancePercent: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Teacher", teacherSchema);
