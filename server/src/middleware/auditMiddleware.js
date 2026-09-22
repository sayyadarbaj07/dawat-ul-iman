const ActivityLog = require("../models/activityLogModel");

const logActivity = async (user, action, description, module, session = null) => {
  try {
    if (!user) return;
    const doc = [{
      user: user._id || user.id,
      username: user.username,
      role: user.role,
      action,
      description,
      module
    }];
    if (session) {
      await ActivityLog.create(doc, { session });
    } else {
      await ActivityLog.create(doc);
    }
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};

module.exports = { logActivity };
