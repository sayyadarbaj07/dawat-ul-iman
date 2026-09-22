const mongoose = require("mongoose");
const Event = require("../models/eventModel");
const Class = require("../models/classModel");
const Teacher = require("../models/teacherModel");
const { logActivity } = require("../middleware/auditMiddleware");

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

// @desc    Get all events
// @route   GET /api/calendar
// @access  Private
const getEvents = async (req, res) => {
  try {
    const { page = 1, limit = 50, type, upcoming } = req.query;
    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.min(parseInt(limit, 10), 500);
    const skip = (parsedPage - 1) * parsedLimit;
    
    let filter = {};
    if (type) {
      filter.type = type;
    }
    if (upcoming === "true") {
      filter.date = { $gte: new Date(new Date().setHours(0,0,0,0)) };
    }

    if (req.user.role === "teacher") {
      const teacher = await Teacher.findOne({ userId: req.user.id });
      if (!teacher) return sendError(res, 403, "Teacher profile not found");
      filter.$or = [
        { classId: { $exists: false } },
        { classId: null },
        { classId: { $in: teacher.assignedClassIds } }
      ];
    }

    const total = await Event.countDocuments(filter);
    const events = await Event.find(filter)
      .sort({ date: 1 })
      .populate("classId", "fullName name section")
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    return sendSuccess(res, 200, "Events fetched successfully", {
      data: events,
      meta: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch events", error);
  }
};

// @desc    Create an event
// @route   POST /api/calendar
// @access  Private (Admin/Teacher)
const createEvent = async (req, res) => {
  try {
    const { title, date, type, description, classId, startTime, endTime, startDate, endDate } = req.body;

    if (type === "holiday") {
      if (!startDate || !endDate) {
        return sendError(res, 400, "startDate and endDate are required for holidays");
      }
      if (new Date(startDate) > new Date(endDate)) {
        return sendError(res, 400, "endDate cannot be before startDate");
      }
      if (classId) {
        return sendError(res, 400, "Holidays must be global institutional events (no classId)");
      }
    }

    if (startTime && endTime) {
      if (startTime > endTime) {
        return sendError(res, 400, "endTime cannot be earlier than startTime");
      }
    }

    if (classId) {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return sendError(res, 400, "Invalid classId format");
      }
      const existingClass = await Class.findById(classId);
      if (!existingClass) {
        return sendError(res, 404, "Referenced Class not found");
      }

      if (req.user.role === "teacher") {
        const teacher = await Teacher.findOne({ userId: req.user.id });
        if (!teacher || !teacher.assignedClassIds.includes(classId)) {
          return sendError(res, 403, "Not authorized to create an event for this class");
        }
      }
    } else if (req.user.role === "teacher") {
      return sendError(res, 403, "Teachers can only create class-specific events");
    }

    const event = await Event.create({
      title,
      date: date || startDate, // fallback for model requirement
      type,
      description,
      classId,
      startTime,
      endTime,
      startDate,
      endDate,
      createdBy: req.user._id,
    });

    await logActivity(req.user, "CREATE_EVENT", `Created calendar event: ${title}`, "Calendar");

    try {
      if (classId) {
        const ActivityNotificationService = require("../services/activityNotificationService");
        await ActivityNotificationService.dispatchActivityEvent({
          user: req.user,
          action: "CREATE_EVENT",
          description: `Created calendar event: ${title}`,
          moduleName: "Calendar",
          notification: {
            title: `New Event: ${title}`,
            message: description || `A new event has been scheduled for ${new Date(date || startDate).toLocaleDateString()}.`,
            type: type === "exam" ? "warning" : "info",
            link: "/calendar",
            relatedEntity: {
              entityId: event._id,
              entityModel: "Event"
            }
          },
          notifyAdmins: true,
          classId: classId
        });
      } else {
        const NotificationService = require("../services/notificationService");
        await NotificationService.notifyUniqueByRole(
          ["admin", "teacher", "accountant"],
          { 
            "relatedEntity.entityId": event._id 
          },
          {
            title: `New Event: ${title}`,
            message: description || `A new event has been scheduled for ${new Date(date || startDate).toLocaleDateString()}.`,
            type: type === "holiday" ? "success" : "info",
            link: "/calendar",
            relatedEntity: {
              entityId: event._id,
              entityModel: "Event"
            }
          }
        );
      }
    } catch (notifErr) {
      console.error("Failed to send event notifications:", notifErr);
    }

    return sendSuccess(res, 201, "Event created successfully", event);
  } catch (error) {
    return sendError(res, 500, "Failed to create event", error);
  }
};

// @desc    Update an event
// @route   PUT /api/calendar/:id
// @access  Private (Admin/Teacher)
const updateEvent = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 400, "Invalid event ID format");
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return sendError(res, 404, "Event not found");
    }

    if (req.user.role === "teacher") {
      if (!event.classId) {
        return sendError(res, 403, "Teachers cannot edit global events");
      }
      const teacher = await Teacher.findOne({ userId: req.user.id });
      if (!teacher || !teacher.assignedClassIds.includes(event.classId)) {
        return sendError(res, 403, "Not authorized to edit an event for this class");
      }
    }

    const { title, date, type, description, classId, startTime, endTime, startDate, endDate } = req.body;

    if (type === "holiday") {
      if (!startDate || !endDate) {
        return sendError(res, 400, "startDate and endDate are required for holidays");
      }
      if (new Date(startDate) > new Date(endDate)) {
        return sendError(res, 400, "endDate cannot be before startDate");
      }
      if (classId) {
        return sendError(res, 400, "Holidays must be global institutional events (no classId)");
      }
    }

    if (startTime && endTime) {
      if (startTime > endTime) {
        return sendError(res, 400, "endTime cannot be earlier than startTime");
      }
    }

    if (classId && classId !== event.classId?.toString()) {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return sendError(res, 400, "Invalid new classId format");
      }
      const newClass = await Class.findById(classId);
      if (!newClass) return sendError(res, 404, "New referenced Class not found");
      
      if (req.user.role === "teacher") {
        const teacher = await Teacher.findOne({ userId: req.user.id });
        if (!teacher.assignedClassIds.includes(classId)) {
          return sendError(res, 403, "Cannot change event to a class you do not teach");
        }
      }
    } else if (req.body.hasOwnProperty('classId') && !classId && req.user.role === "teacher") {
      return sendError(res, 403, "Teachers cannot convert a class-specific event into a global event");
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { title, date: date || startDate, type, description, classId, startTime, endTime, startDate, endDate },
      { new: true, runValidators: true }
    );

    await logActivity(req.user, "UPDATE_EVENT", `Updated calendar event: ${updatedEvent.title}`, "Calendar");

    try {
      if (classId) {
        const ActivityNotificationService = require("../services/activityNotificationService");
        await ActivityNotificationService.dispatchActivityEvent({
          user: req.user,
          action: "UPDATE_EVENT",
          description: `Updated calendar event: ${updatedEvent.title}`,
          moduleName: "Calendar",
          notification: {
            title: `Updated Event: ${title || updatedEvent.title}`,
            message: description || `An event has been updated for ${new Date(date || updatedEvent.date || updatedEvent.startDate).toLocaleDateString()}.`,
            type: "info",
            link: "/calendar",
            relatedEntity: {
              entityId: updatedEvent._id,
              entityModel: "Event"
            }
          },
          notifyAdmins: true,
          classId: classId
        });
      } else {
        const NotificationService = require("../services/notificationService");
        await NotificationService.notifyUniqueByRole(
          ["admin", "teacher", "accountant"],
          { 
            "relatedEntity.entityId": updatedEvent._id 
          },
          {
            title: `Updated Event: ${title || updatedEvent.title}`,
            message: description || `An event has been updated for ${new Date(date || updatedEvent.date || updatedEvent.startDate).toLocaleDateString()}.`,
            type: "info",
            link: "/calendar",
            relatedEntity: {
              entityId: updatedEvent._id,
              entityModel: "Event"
            }
          }
        );
      }
    } catch (notifErr) {
      console.error("Failed to send event notifications:", notifErr);
    }

    return sendSuccess(res, 200, "Event updated successfully", updatedEvent);
  } catch (error) {
    return sendError(res, 500, "Failed to update event", error);
  }
};

// @desc    Delete an event
// @route   DELETE /api/calendar/:id
// @access  Private (Admin/Teacher)
const deleteEvent = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 400, "Invalid event ID format");
    }
    
    const event = await Event.findById(req.params.id);
    if (!event) {
      return sendError(res, 404, "Event not found");
    }

    if (req.user.role === "teacher") {
      if (!event.classId) {
        return sendError(res, 403, "Teachers cannot delete global events");
      }
      const teacher = await Teacher.findOne({ userId: req.user.id });
      if (!teacher || !teacher.assignedClassIds.includes(event.classId)) {
        return sendError(res, 403, "Not authorized to delete an event for this class");
      }
    }

    await Event.findByIdAndDelete(req.params.id);
    await logActivity(req.user, "DELETE_EVENT", `Deleted calendar event: ${event.title}`, "Calendar");

    return sendSuccess(res, 200, "Event deleted successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to delete event", error);
  }
};

module.exports = {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
};
