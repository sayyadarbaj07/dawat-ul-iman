const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    classesAssigned: {
      type: Number,
      required: true,
      default: 0,
    },
    assignedClasses: [{
      type: String,
    }],
    assignedClassIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    }],
    teachingAssignments: [{
      classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
      subjectId: { type: String, required: true, trim: true }
    }],
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    salary: {
      type: Number,
      required: true,
      default: 0,
    },
    attendancePercent: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    designation: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "on_leave", "resigned", "inactive"],
      default: "active",
    },
    fatherName: { type: String, trim: true },
    dateOfBirth: { type: Date },
    whatsapp: { type: String, trim: true },
    address: { type: String, trim: true },
    email: { type: String, trim: true },
    city: { type: String, trim: true },
    district: { type: String, trim: true },
    state: { type: String, trim: true },
    pinCode: { type: String, trim: true },
    emergencyContact: { type: String, trim: true },
    qualifications: [
      {
        qualification: { type: String, trim: true },
        degreeOrCertificate: { type: String, trim: true },
        institution: { type: String, trim: true },
        passingYear: { type: Number },
        specialization: { type: String, trim: true },
        experience: { type: Number, min: 0 },
        previousInstitution: { type: String, trim: true },
      }
    ],
    isClassTeacher: {
      type: Boolean,
      default: false,
    },
    classTeacherOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
    },
    experience: {
      type: Number,
      min: 0,
    },
    weeklyPeriods: {
      type: Number,
      min: 0,
    },
    remarks: {
      type: String,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    photo: {
      type: String,
      default: "",
    },
    joiningDate: {
      type: Date,
      // Not strictly required in mongoose to prevent breaking legacy records on update,
      // but enforced in the controller for new teachers.
    },
    deactivationDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Teacher", teacherSchema);
