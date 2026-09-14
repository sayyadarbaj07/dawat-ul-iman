const mongoose = require("mongoose");

const studentDocumentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true
    },
    documentType: {
      type: String,
      enum: [
        "aadhaar",
        "birth_certificate",
        "previous_institution_certificate",
        "guardian_id",
        "student_photo",
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
      ref: "StudentDocument",
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

studentDocumentSchema.index({ studentId: 1, isActive: 1, createdAt: -1 });

module.exports = mongoose.model("StudentDocument", studentDocumentSchema);
