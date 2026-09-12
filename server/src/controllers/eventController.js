const Event = require("../models/eventModel");
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
    
    const filter = {};
    if (type) {
      filter.type = type;
    }
    if (upcoming === "true") {
      filter.date = { $gte: new Date(new Date().setHours(0,0,0,0)) };
    }

    const total = await Event.countDocuments(filter);
    const events = await Event.find(filter)
      .sort({ date: 1 })
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
    const { title, date, type, description } = req.body;

    const event = await Event.create({
      title,
      date,
      type,
      description,
      createdBy: req.user._id,
    });

    await logActivity(req.user, "CREATE_EVENT", `Created calendar event: ${title}`, "Calendar");

    try {
      const NotificationService = require("../services/notificationService");
      await NotificationService.notifyUniqueByRole(
        ["admin", "teacher", "accountant"],
        { 
          "relatedEntity.entityId": event._id 
        },
        {
          title: `New Event: ${title}`,
          message: description || `A new event has been scheduled for ${new Date(date).toLocaleDateString()}.`,
          type: type === "holiday" ? "success" : (type === "exam" ? "warning" : "info"),
          link: "/calendar",
          relatedEntity: {
            entityId: event._id,
            entityModel: "Event"
          }
        }
      );
    } catch (notifErr) {
      console.error("Failed to send event notifications:", notifErr);
    }

    return sendSuccess(res, 201, "Event created successfully", event);
  } catch (error) {
    return sendError(res, 500, "Failed to create event", error);
  }
};

// @desc    Delete an event
// @route   DELETE /api/calendar/:id
// @access  Private (Admin/Teacher)
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return sendError(res, 404, "Event not found");
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
  deleteEvent,
};
