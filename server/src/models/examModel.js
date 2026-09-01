const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    examType: {
      type: String,
      required: true,
      default: "Monthly"
    },
    examName: {
      type: String,
      trim: true,
      default: ""
    },
    class: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
      trim: true,
    },
    subjects: {
      type: [String],
      default: [],
    },
    maxMarks: {
      type: Number,
      required: true,
      default: 100,
    },
    passingMarks: {
      type: Number,
      required: true,
      default: 33,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Exam", examSchema);
