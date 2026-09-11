const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, required: true, default: "General" }, // Review, Academic, Admin
    date: { type: String, required: true }, // Store as YYYY-MM-DD or readable
    startTime: { type: String, required: true }, // e.g. "10:00 AM"
    endTime: { type: String }, // e.g. "11:00 AM"
    location: { type: String, required: true },
    attendees: { type: Number, default: 0 },
    status: { type: String, enum: ["Upcoming", "Completed", "Scheduled", "Cancelled"], default: "Scheduled" },
    notes: { type: String },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Meeting", meetingSchema);
