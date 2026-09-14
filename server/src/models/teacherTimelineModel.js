const mongoose = require("mongoose");

const teacherTimelineSchema = new mongoose.Schema(
  {
    teacherId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Teacher", 
      required: true,
      index: true
    },
    eventType: { 
      type: String, 
      required: true 
    },
    performedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    descriptionKey: { 
      type: String, 
      required: true 
    },
    metadata: { 
      type: mongoose.Schema.Types.Mixed, 
      default: {} 
    }
  },
  { timestamps: true }
);

teacherTimelineSchema.index({ teacherId: 1, createdAt: -1 });

module.exports = mongoose.model("TeacherTimeline", teacherTimelineSchema);
