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
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: false,
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

// Canonical Exam Unique Index
examSchema.index(
  { classId: 1, name: 1, academicYear: 1 },
  { unique: true, partialFilterExpression: { classId: { $exists: true } } }
);

// Legacy Exam Unique Index
examSchema.index(
  { class: 1, name: 1, academicYear: 1 },
  { unique: true, partialFilterExpression: { classId: { $exists: false } } }
);

module.exports = mongoose.model("Exam", examSchema);
