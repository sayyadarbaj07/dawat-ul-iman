const mongoose = require("mongoose");

const achievementSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    activityTitle: { type: String, required: true, trim: true },
    position: { type: String, required: true },
    date: { type: Date, required: true },
    remarks: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

achievementSchema.index({ classId: 1, date: -1 });
achievementSchema.index({ studentId: 1, date: -1 });
achievementSchema.index({ date: -1 });

module.exports = mongoose.model("Achievement", achievementSchema);
