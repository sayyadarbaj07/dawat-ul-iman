const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["info", "success", "warning", "error", "alert"],
      default: "info",
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    relatedEntity: {
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
      },
      entityModel: {
        type: String,
        enum: ["Student", "Transaction", "Exam", "Event", "Meeting", "User", "Teacher", "Class", "Curriculum", "Attendance"],
      },
    },
    link: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user's unread notifications quickly
notificationSchema.index({ recipient: 1, isRead: 1 });
// Index for sorting user's notifications by date
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
