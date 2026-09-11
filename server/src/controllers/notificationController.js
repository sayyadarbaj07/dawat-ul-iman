const Notification = require("../models/notificationModel");

const sendSuccess = (res, statusCode, message, data = null) => {
  const payload = { success: true, message };
  if (data) payload.data = data;
  return res.status(statusCode).json(payload);
};

const sendError = (res, statusCode, message, error = null) => {
  const payload = { success: false, message };
  if (error) payload.error = error.message || error;
  return res.status(statusCode).json(payload);
};

// @desc    Get user's notifications (paginated)
// @route   GET /api/notifications
// @access  Private (Any authenticated user)
const getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    const query = { recipient: req.user.id };
    
    if (req.query.isRead !== undefined) {
       query.isRead = req.query.isRead === "true";
    }

    const total = await Notification.countDocuments(query);
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .lean();

    return sendSuccess(res, 200, "Notifications fetched successfully", {
      notifications,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch notifications", error);
  }
};

// @desc    Get user's unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private (Any authenticated user)
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ 
      recipient: req.user.id, 
      isRead: false 
    });
    return sendSuccess(res, 200, "Unread count fetched", { count });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch unread count", error);
  }
};

// @desc    Mark a specific notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private (Any authenticated user)
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return sendError(res, 404, "Notification not found or unauthorized");
    }

    return sendSuccess(res, 200, "Notification marked as read", notification);
  } catch (error) {
    return sendError(res, 500, "Failed to mark notification as read", error);
  }
};

// @desc    Mark all unread notifications as read for current user
// @route   PUT /api/notifications/read-all
// @access  Private (Any authenticated user)
const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true }
    );

    return sendSuccess(res, 200, "All notifications marked as read", { modifiedCount: result.modifiedCount });
  } catch (error) {
    return sendError(res, 500, "Failed to mark all notifications as read", error);
  }
};

// @desc    Delete a specific notification
// @route   DELETE /api/notifications/:id
// @access  Private (Any authenticated user)
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id
    });

    if (!notification) {
      return sendError(res, 404, "Notification not found or unauthorized");
    }

    return sendSuccess(res, 200, "Notification deleted successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to delete notification", error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
