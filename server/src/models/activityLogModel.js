const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true },
    role: { type: String, required: true },
    action: { type: String, required: true }, // e.g., 'LOGIN', 'CREATE_USER', 'UPDATE_MEETING'
    description: { type: String, required: true }, // e.g., 'Admin created a new teacher user'
    module: { type: String }, // e.g., 'Auth', 'Users', 'Meetings'
  },
  { timestamps: true } // Creates createdAt for the date/time of activity
);

module.exports = mongoose.model("ActivityLog", activityLogSchema);
