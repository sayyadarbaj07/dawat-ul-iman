const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      unique: true,
      trim: true,
      default: function () {
        return `STU-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      },
    },
    name: { type: String, required: true, trim: true },
    nameUrdu: { type: String, trim: true, default: "" },
    fatherName: { type: String, required: true, trim: true },
    motherName: { type: String, trim: true, default: "" },
    className: {
      type: String,
      required: true,
      enum: ["diniyat", "hifz", "alimiyat", "qirat", "contemporary", "arabic"],
      default: "diniyat",
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null
    },
    schoolClass: { type: String, trim: true, default: "" },
    studentClass: { type: String, trim: true, default: "" },
    section: { type: String, trim: true, default: "" },
    rollNumber: { type: String, trim: true, default: "" },
    admissionNumber: { type: String, trim: true, default: "" },
    dateOfBirth: { type: Date, default: null },
    gender: {
      type: String,
      enum: ["male", "female", "other", ""],
      default: "",
    },
    address: { type: String, trim: true, default: "" },
    contactNumber: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    guardianName: { type: String, trim: true, default: "" },
    guardianContact: { type: String, trim: true, default: "" },
    guardianRelation: { type: String, trim: true, default: "" },
    photo: { type: String, default: "" },
    residential: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    admissionDate: { type: Date, default: Date.now },
    attendancePercent: { type: Number, default: 0, min: 0, max: 100 },
    notes: { type: String, trim: true, default: "" },
    promotionHistory: [
      {
        fromAcademicYear: { type: String },
        toAcademicYear: { type: String },
        fromClass: { type: String },
        toClass: { type: String },
        status: { type: String, enum: ["Promoted", "Failed", "Detained", "Not Promoted", ""] },
        date: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        notes: { type: String, trim: true, default: "" }
      }
    ],
    feeHistory: [
      {
        academicYear: { type: String, required: true },
        classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: false },
        className: { type: String, required: true },
        totalFee: { type: Number, required: true, default: 0 },
        date: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      }
    ]
  },
  {
    timestamps: true,
  },
);

studentSchema.index({
  name: "text",
  nameUrdu: "text",
  fatherName: "text",
  admissionNumber: "text",
  rollNumber: "text",
});

// NEW: Optimized index for heavy class-wise lookups (Exam generation, Directory, PDF reports)
studentSchema.index({ className: 1, status: 1 });

// NEW: Optimized index for classId lookup (Attendance page)
studentSchema.index({ classId: 1, status: 1 });

module.exports = mongoose.model("Student", studentSchema);
