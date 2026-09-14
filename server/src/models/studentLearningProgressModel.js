const mongoose = require("mongoose");

const studentLearningProgressSchema = new mongoose.Schema(
  {
    curriculumId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Curriculum',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
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
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudentLearningProgress", studentLearningProgressSchema);
