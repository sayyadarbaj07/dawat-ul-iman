const ActivityLog = require("../models/activityLogModel");

const sendSuccess = (res, statusCode, message, data = null) => {
  const payload = { success: true, message };
  if (data) payload.data = data;
  return res.status(statusCode).json(payload);
};

const sendError = (res, statusCode, message, error = null) => {
  const payload = { success: false, message };
  if (error) {
    payload.error = error.message || error;
  }
  return res.status(statusCode).json(payload);
};

// @desc    Get all activity logs
// @route   GET /api/activities
// @access  Private (Admin)
const getLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(100);
    return sendSuccess(res, 200, "Activity logs fetched successfully", logs);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch activity logs", error);
  }
};

module.exports = {
  getLogs,
};
