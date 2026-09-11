const Notification = require("../models/notificationModel");
const User = require("../models/userModel");

class NotificationService {
  /**
   * Send a notification to a specific user
   * @param {Object} data
   * @param {ObjectId|String} data.recipient - User ID of the recipient
   * @param {String} data.title - Notification title
   * @param {String} data.message - Notification message
   * @param {String} data.type - 'info', 'success', 'warning', 'error', 'alert'
   * @param {String} data.link - Optional UI route link
   * @param {Object} data.relatedEntity - Optional { entityId, entityModel }
   * @returns {Promise<Object>} Created notification
   */
  static async notifyUser({ recipient, title, message, type = "info", link = "", relatedEntity = null }) {
    try {
      const notification = await Notification.create({
        recipient,
        title,
        message,
        type,
        link,
        relatedEntity,
      });
      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  /**
   * Send a notification to multiple users based on role
   * @param {String|Array} roles - Role or array of roles (e.g., 'admin', ['admin', 'accountant'])
   * @param {Object} notificationData - { title, message, type, link, relatedEntity }
   */
  static async notifyByRole(roles, notificationData) {
    try {
      const roleArray = Array.isArray(roles) ? roles : [roles];
      const users = await User.find({ role: { $in: roleArray }, isActive: true }).select("_id");
      
      const notifications = users.map(user => ({
        recipient: user._id,
        ...notificationData
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    } catch (error) {
      console.error("Error creating role-based notifications:", error);
      throw error;
    }
  }

  /**
   * Send a notification to multiple users based on role, avoiding duplicates
   * @param {String|Array} roles 
   * @param {Object} query - Query to check if notification already exists
   * @param {Object} notificationData 
   */
  static async notifyUniqueByRole(roles, query, notificationData) {
    try {
      const exists = await Notification.findOne(query);
      if (!exists) {
        await this.notifyByRole(roles, notificationData);
      }
    } catch (error) {
      console.error("Error creating unique role-based notifications:", error);
    }
  }
}

module.exports = NotificationService;


