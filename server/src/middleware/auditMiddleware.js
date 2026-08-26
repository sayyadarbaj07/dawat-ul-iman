const ActivityLog = require("../models/activityLogModel");

const logActivity = async (user, action, description, module) => {
  try {
    if (!user) return;
    await ActivityLog.create({
      user: user._id || user.id,
      username: user.username,
      role: user.role,
      action,
      description,
      module
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};

module.exports = { logActivity };
