const mongoose = require("mongoose");

const teacherDutySchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true
    },
    dutyType: {
      type: String,
      required: true,
      enum: [
        "class_teacher",
        "exam",
        "discipline",
        "hostel",
        "library",
        "academic_management",
        "attendance",
        "events",
        "other"
      ]
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      index: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active"
    },
    remarks: {
      type: String,
      trim: true
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

teacherDutySchema.index({ teacherId: 1, isActive: 1, startDate: -1 });
teacherDutySchema.index({ classId: 1, status: 1 });

module.exports = mongoose.model("TeacherDuty", teacherDutySchema);
