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
    fatherName: { type: String, required: true, trim: true },
    motherName: { type: String, trim: true, default: "" },
    className: {
      type: String,
      required: true,
      enum: ["diniyat", "arabic", "contemporary"],
      default: "diniyat",
    },
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
  },
  {
    timestamps: true,
  },
);

studentSchema.index({
  name: "text",
  fatherName: "text",
  admissionNumber: "text",
  rollNumber: "text",
});

module.exports = mongoose.model("Student", studentSchema);
