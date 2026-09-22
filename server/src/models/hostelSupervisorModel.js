const mongoose = require("mongoose");

const hostelSupervisorSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true
    },
    frequency: {
      type: String,
      enum: ["daily"],
      default: "daily"
    },
    startTime: {
      type: String, // HH:mm format
      required: true
    },
    endTime: {
      type: String, // HH:mm format
      required: true
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true
    },
    remarks: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("HostelSupervisor", hostelSupervisorSchema);
