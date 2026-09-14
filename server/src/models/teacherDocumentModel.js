const mongoose = require("mongoose");

const teacherDocumentSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true
    },
    documentType: {
      type: String,
      enum: [
        "aadhaar",
        "qualification_certificate",
        "experience_certificate",
        "previous_institution_certificate",
        "joining_letter",
        "address_proof",
        "other"
      ],
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    originalName: {
      type: String,
      required: true
    },
    storedName: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected", "deleted"],
      default: "pending"
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: ""
    },
    replacedDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeacherDocument",
      default: null
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

teacherDocumentSchema.index({ teacherId: 1, isActive: 1, createdAt: -1 });

module.exports = mongoose.model("TeacherDocument", teacherDocumentSchema);
