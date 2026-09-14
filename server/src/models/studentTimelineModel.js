const mongoose = require("mongoose");

const studentTimelineSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    eventType: { type: String, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    descriptionKey: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

studentTimelineSchema.index({ studentId: 1, createdAt: -1 });

module.exports = mongoose.model("StudentTimeline", studentTimelineSchema);
