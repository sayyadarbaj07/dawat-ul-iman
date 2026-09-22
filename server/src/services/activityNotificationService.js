const { logActivity } = require("../middleware/auditMiddleware");
const NotificationService = require("./notificationService");
const Teacher = require("../models/teacherModel");

class ActivityNotificationService {
  /**
   * Dispatch an activity log and create notifications.
   * @param {Object} options 
   * @param {Object} options.user - The actor performing the action (req.user)
   * @param {String} options.action - Action string for ActivityLog (e.g., 'STUDENT_CREATED')
   * @param {String} options.description - Description for ActivityLog
   * @param {String} options.moduleName - Module name for ActivityLog (e.g., 'Students', 'Attendance')
   * @param {Object} [options.notification] - Notification payload
   * @param {String} options.notification.title
   * @param {String} options.notification.message
   * @param {String} options.notification.type - 'info', 'success', 'warning', 'error', 'alert'
   * @param {String} options.notification.link - URL path for frontend navigation
   * @param {Object} options.notification.relatedEntity - { entityId, entityModel }
   * @param {Boolean} [options.notifyAdmins=true] - Whether to notify all admins
   * @param {String} [options.classId=null] - If provided, notify teachers assigned to this classId
   * @param {Object} [options.session=null] - Mongoose session for atomic transactions
   */
  static async dispatchActivityEvent({
    user,
    action,
    description,
    moduleName,
    notification,
    notifyAdmins = true,
    classId = null,
    session = null
  }) {
    try {
      // 1. Log the Activity securely
      await logActivity(user, action, description, moduleName, session);

      if (!notification) return; // No notification required

      const { title, message, type = "info", link, relatedEntity } = notification;

      // 2. Resolve Notification Recipients
      const recipientIds = new Set();

      // Notify Admins
      if (notifyAdmins) {
        const User = require("../models/userModel");
        const admins = await User.find({ role: "admin", isActive: true }).select("_id");
        admins.forEach(admin => recipientIds.add(admin._id.toString()));
      }

      // Notify Class Teachers (strictly by canonical classId)
      if (classId) {
        const classTeachers = await Teacher.find({
          assignedClassIds: classId
        }).populate("userId", "_id");

        classTeachers.forEach(t => {
          if (t.userId && t.userId._id) {
            recipientIds.add(t.userId._id.toString());
          }
        });
      }

      // Avoid notifying the actor themselves
      if (user && (user._id || user.id)) {
         const actorId = (user._id || user.id).toString();
         recipientIds.delete(actorId);
      }
      
      console.log(`[DEBUG] Recipient IDs for ${action}:`, Array.from(recipientIds));

      // 3. Prevent duplicate notifications using a short time window query
      // (Idempotency check: same title, entity, and recipient in the last 1 minute)
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      
      const promises = Array.from(recipientIds).map(async (recipientId) => {
        // Idempotency check
        const query = {
          recipient: recipientId,
          title: title,
          createdAt: { $gte: oneMinuteAgo }
        };
        if (relatedEntity) {
          query["relatedEntity.entityId"] = relatedEntity.entityId;
          query["relatedEntity.entityModel"] = relatedEntity.entityModel;
        }

        const NotificationModel = require("../models/notificationModel");
        const exists = await NotificationModel.findOne(query);

        if (!exists) {
          return NotificationService.notifyUser({
            recipient: recipientId,
            title,
            message,
            type,
            link,
            relatedEntity
          });
        }
      });

      await Promise.all(promises);

    } catch (error) {
      // Notification failures MUST NOT break primary operations.
      console.error(`[ActivityNotificationService] Failed to dispatch event for action ${action}:`, error);
    }
  }
}

module.exports = ActivityNotificationService;
