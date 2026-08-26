const Meeting = require("../models/meetingModel");
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

// @desc    Get all meetings
// @route   GET /api/meetings
// @access  Private
const getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find().sort({ createdAt: -1 }).populate("createdBy", "name username");
    return sendSuccess(res, 200, "Meetings fetched successfully", meetings);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch meetings", error);
  }
};

// @desc    Create a meeting
// @route   POST /api/meetings
// @access  Private (Admin/Teacher)
const createMeeting = async (req, res) => {
  try {
    const { title, type, date, time, location, attendees, status, notes } = req.body;

    const meeting = await Meeting.create({
      title,
      type,
      date,
      time,
      location,
      attendees,
      status,
      notes,
      createdBy: req.user._id,
    });

    await logActivity(req.user, "CREATE_MEETING", `Created meeting: ${title}`, "Meetings");

    return sendSuccess(res, 201, "Meeting created successfully", meeting);
  } catch (error) {
    return sendError(res, 500, "Failed to create meeting", error);
  }
};

// @desc    Update a meeting
// @route   PUT /api/meetings/:id
// @access  Private (Admin/Teacher)
const updateMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return sendError(res, 404, "Meeting not found");
    }

    const updatedMeeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    await logActivity(req.user, "UPDATE_MEETING", `Updated meeting: ${updatedMeeting.title}`, "Meetings");

    return sendSuccess(res, 200, "Meeting updated successfully", updatedMeeting);
  } catch (error) {
    return sendError(res, 500, "Failed to update meeting", error);
  }
};

// @desc    Delete a meeting
// @route   DELETE /api/meetings/:id
// @access  Private (Admin)
const deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return sendError(res, 404, "Meeting not found");
    }

    await Meeting.findByIdAndDelete(req.params.id);
    await logActivity(req.user, "DELETE_MEETING", `Deleted meeting: ${meeting.title}`, "Meetings");

    return sendSuccess(res, 200, "Meeting deleted successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to delete meeting", error);
  }
};

module.exports = {
  getMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
};
