const mongoose = require("mongoose");
const StudentTimeline = require("../models/studentTimelineModel");

const sendSuccess = (res, statusCode, message, data = null) => {
  const payload = { success: true, message };
  if (data !== null) payload.data = data;
  return res.status(statusCode).json(payload);
};

const sendError = (res, statusCode, message, error = null) => {
  const payload = { success: false, message };
  if (error) payload.error = error.message || error;
  return res.status(statusCode).json(payload);
};

exports.getTimeline = async (req, res) => {
  try {
    const { studentId } = req.params;
    let { page = 1, limit = 20 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return sendError(res, 400, "Invalid student ID");
    }

    page = parseInt(page);
    limit = parseInt(limit);
    
    if (page < 1) page = 1;
    if (limit < 1) limit = 20;
    if (limit > 100) limit = 100;

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      StudentTimeline.find({ studentId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("performedBy", "name username")
        .lean(),
      StudentTimeline.countDocuments({ studentId })
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: events,
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    });

  } catch (error) {
    return sendError(res, 500, "Failed to retrieve student timeline", error);
  }
};
