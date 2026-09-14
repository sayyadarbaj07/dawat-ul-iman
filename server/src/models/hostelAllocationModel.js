const mongoose = require("mongoose");

const hostelAllocationSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    hostelName: { type: String, required: true, trim: true },
    room: { type: String, required: true, trim: true },
    bed: { type: String, required: true, trim: true },
    warden: { type: String, trim: true, default: "" },
    joiningDate: { type: Date, required: true, default: Date.now },
    leavingDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["active", "transferred", "left"],
      default: "active",
    },
    inventory: [{ type: String }],
    remarks: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

// ONLY ONE active allocation per student allowed. Historical are preserved.
hostelAllocationSchema.index(
  { studentId: 1 },
  { unique: true, partialFilterExpression: { status: "active" } }
);

module.exports = mongoose.model("HostelAllocation", hostelAllocationSchema);
