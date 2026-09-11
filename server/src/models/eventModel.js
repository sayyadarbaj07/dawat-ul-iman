const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    date: { type: Date, required: true },
    type: { type: String, enum: ["exam", "holiday", "bazm", "meeting", "other"], required: true },
    description: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

// NEW: Index to optimize the common `.sort({ date: 1 })` query
eventSchema.index({ date: 1 });

module.exports = mongoose.model("Event", eventSchema);
