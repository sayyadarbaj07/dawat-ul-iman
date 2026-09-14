const mongoose = require("mongoose");

const teacherTeachingProgressSchema = new mongoose.Schema(
  {
    curriculumId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Curriculum',
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lessonFrom: {
      type: Number,
      required: true,
      min: 1,
    },
    lessonTo: {
      type: Number,
      required: true,
      min: 1,
    },
    topic: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TeacherTeachingProgress", teacherTeachingProgressSchema);
