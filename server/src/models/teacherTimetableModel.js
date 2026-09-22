const mongoose = require("mongoose");

const teacherTimetableSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true
    },
    dayOfWeek: {
      type: String,
      enum: ["Daily", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      required: true
    },
    startTime: {
      type: String, // HH:mm format
      required: true
    },
    endTime: {
      type: String, // HH:mm format
      required: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    room: {
      type: String,
      trim: true,
      default: ""
    },
    period: {
      type: String,
      trim: true,
      default: ""
    },
    remarks: {
      type: String,
      trim: true,
      default: ""
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

teacherTimetableSchema.index({ teacherId: 1, dayOfWeek: 1, isActive: 1 });

module.exports = mongoose.model("TeacherTimetable", teacherTimetableSchema);
