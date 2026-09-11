const mongoose = require("mongoose");
const Meeting = require("../models/meetingModel");
const Class = require("../models/classModel");
const Teacher = require("../models/teacherModel");
const ActivityNotificationService = require("../services/activityNotificationService");

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
    const { page = 1, limit = 50 } = req.query;
    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.min(parseInt(limit, 10), 500);
    const skip = (parsedPage - 1) * parsedLimit;

    let query = {};

    // RBAC: If teacher, they only see General meetings or meetings for their assigned classes
    if (req.user.role === "teacher") {
      const teacher = await Teacher.findOne({ userId: req.user.id });
      if (!teacher) {
        return sendError(res, 403, "Teacher profile not found");
      }
      query = {
        $or: [
          { classId: { $exists: false } },
          { classId: null },
          { classId: { $in: teacher.assignedClassIds } }
        ]
      };
    }

    const total = await Meeting.countDocuments(query);
    const meetings = await Meeting.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name username")
      .populate("classId", "fullName name section")
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    return sendSuccess(res, 200, "Meetings fetched successfully", {
      data: meetings,
      meta: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch meetings", error);
  }
};

// @desc    Create a meeting
// @route   POST /api/meetings
// @access  Private (Admin/Teacher)
const createMeeting = async (req, res) => {
  try {
    const { title, type, date, startTime, endTime, location, attendees, status, notes, classId } = req.body;

    if (!title || !date || !startTime) {
       return sendError(res, 400, "Title, date and startTime are required");
    }

    if (classId) {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return sendError(res, 400, "Invalid classId format");
      }
      const existingClass = await Class.findById(classId);
      if (!existingClass) {
        return sendError(res, 404, "Referenced Class not found");
      }

      // Teacher RBAC check
      if (req.user.role === "teacher") {
        const teacher = await Teacher.findOne({ userId: req.user.id });
        if (!teacher || !teacher.assignedClassIds.includes(classId)) {
          return sendError(res, 403, "Not authorized to create a meeting for this class");
        }
      }
    } else if (req.user.role === "teacher") {
        // Teachers cannot create general institutional meetings
        return sendError(res, 403, "Teachers can only create class-specific meetings");
    }

    const meeting = await Meeting.create({
      title,
      type,
      date,
      startTime,
      endTime,
      location,
      attendees,
      status,
      notes,
      classId,
      createdBy: req.user._id,
    });

    // Fire Activity + Notification (Don't await to prevent rollback on failure, but await in try/catch to log errors)
    try {
        await ActivityNotificationService.dispatchActivityEvent({
            user: req.user,
            action: "CREATE_MEETING",
            description: `Created meeting: ${title}`,
            moduleName: "Meetings",
            notification: {
                title: "New Meeting Scheduled",
                message: `${title} on ${date} at ${startTime}`,
                type: "info",
                link: "/meetings",
                relatedEntity: { entityId: meeting._id, entityModel: "Meeting" }
            },
            notifyAdmins: true,
            classId: classId
        });
    } catch (notifErr) {
        console.error("Failed to dispatch meeting notification:", notifErr);
    }

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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return sendError(res, 400, "Invalid meeting ID format");
    }

    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return sendError(res, 404, "Meeting not found");
    }

    // RBAC check
    if (req.user.role === "teacher") {
       if (!meeting.classId) {
          return sendError(res, 403, "Teachers cannot edit general meetings");
       }
       const teacher = await Teacher.findOne({ userId: req.user.id });
       if (!teacher || !teacher.assignedClassIds.includes(meeting.classId)) {
          return sendError(res, 403, "Not authorized to edit a meeting for this class");
       }
    }

    const { classId } = req.body;
    if (classId && classId !== meeting.classId?.toString()) {
       if (!mongoose.Types.ObjectId.isValid(classId)) {
           return sendError(res, 400, "Invalid new classId format");
       }
       const newClass = await Class.findById(classId);
       if (!newClass) return sendError(res, 404, "New referenced Class not found");
       
       if (req.user.role === "teacher") {
           const teacher = await Teacher.findOne({ userId: req.user.id });
           if (!teacher.assignedClassIds.includes(classId)) {
               return sendError(res, 403, "Cannot change meeting to a class you do not teach");
           }
       }
    }

    const updatedMeeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    try {
        await ActivityNotificationService.dispatchActivityEvent({
            user: req.user,
            action: "UPDATE_MEETING",
            description: `Updated meeting: ${updatedMeeting.title}`,
            moduleName: "Meetings",
            notification: {
                title: "Meeting Updated",
                message: `${updatedMeeting.title} has been updated`,
                type: "info",
                link: "/meetings",
                relatedEntity: { entityId: updatedMeeting._id, entityModel: "Meeting" }
            },
            notifyAdmins: true,
            classId: updatedMeeting.classId
        });
    } catch (notifErr) {
        console.error("Failed to dispatch meeting notification:", notifErr);
    }

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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return sendError(res, 400, "Invalid meeting ID format");
    }

    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return sendError(res, 404, "Meeting not found");
    }

    await Meeting.findByIdAndDelete(req.params.id);
    
    try {
        await ActivityNotificationService.dispatchActivityEvent({
            user: req.user,
            action: "DELETE_MEETING",
            description: `Deleted meeting: ${meeting.title}`,
            moduleName: "Meetings",
            notification: {
                title: "Meeting Cancelled",
                message: `${meeting.title} has been cancelled/deleted`,
                type: "warning",
                link: "/meetings",
                relatedEntity: { entityId: meeting._id, entityModel: "Meeting" }
            },
            notifyAdmins: true,
            classId: meeting.classId
        });
    } catch (notifErr) {
        console.error("Failed to dispatch meeting notification:", notifErr);
    }

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
