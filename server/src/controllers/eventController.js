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
    const events = await Event.find().sort({ date: 1 });
    return sendSuccess(res, 200, "Events fetched successfully", events);
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
