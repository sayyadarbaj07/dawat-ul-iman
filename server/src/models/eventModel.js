const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    date: { type: Date, required: true },
    startDate: { type: Date }, // NEW for Holiday/Multi-day
    endDate: { type: Date }, // NEW for Holiday/Multi-day
    startTime: { type: String }, // Optional e.g. "09:00"
    endTime: { type: String }, // Optional e.g. "10:00"
    type: { type: String, enum: ["exam", "holiday", "bazm", "meeting", "other"], required: true },
    description: { type: String },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class" }, // Optional for global events
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

// NEW: Index to optimize the common `.sort({ date: 1 })` query
eventSchema.index({ date: 1 });

module.exports = mongoose.model("Event", eventSchema);
