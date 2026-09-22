const mongoose = require("mongoose");

const curriculumSchema = new mongoose.Schema(
  {
    academicYear: {
      type: String, // e.g. "2026-27". Not required to support legacy records.
      trim: true,
    },
    department: {
      type: String,
      required: true,
      enum: ["diniyat", "hifz", "alimiyat", "qirat", "contemporary", "arabic", "school"],
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    book: {
      type: String,
      required: true,
      trim: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      default: null,
    },
    totalLessons: { type: Number, default: 0 },
    annualTarget: { type: Number, default: 0 },
    firstHalfTarget: { type: Number, default: 0 },
    secondHalfTarget: { type: Number, default: 0 },
    monthlyTargets: [{
      month: String,
      target: Number
    }],
    startDate: Date,
    expectedCompletionDate: Date,
    remarks: String,
    isActive: { type: Boolean, default: true },
    
    // Central array to track unique completed lesson indices
    completedLessonsList: {
      type: [Number],
      default: [],
    },

    // Legacy fields preserved for backward compatibility
    progress: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      required: true,
      // Extended enum to support both legacy and new calculated statuses
      enum: ["On Track", "Delayed", "Almost Complete", "Ahead", "Behind", "Completed"],
      default: "On Track",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Curriculum", curriculumSchema);
