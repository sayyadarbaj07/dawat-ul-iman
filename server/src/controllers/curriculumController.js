const Curriculum = require("../models/curriculumModel");

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

exports.getAllCurriculums = async (req, res) => {
  try {
    const curriculums = await Curriculum.find().sort({ createdAt: -1 });
    return sendSuccess(res, 200, "Curriculums fetched successfully", curriculums);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch curriculums", error);
  }
};

exports.createCurriculum = async (req, res) => {
  try {
    const curriculum = await Curriculum.create(req.body);
    return sendSuccess(res, 201, "Curriculum created successfully", curriculum);
  } catch (error) {
    return sendError(res, 500, "Failed to create curriculum", error);
  }
};

exports.updateCurriculum = async (req, res) => {
  try {
    const curriculum = await Curriculum.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!curriculum) return sendError(res, 404, "Curriculum not found");
    return sendSuccess(res, 200, "Curriculum updated successfully", curriculum);
  } catch (error) {
    return sendError(res, 500, "Failed to update curriculum", error);
  }
};

exports.deleteCurriculum = async (req, res) => {
  try {
    const curriculum = await Curriculum.findByIdAndDelete(req.params.id);
    if (!curriculum) return sendError(res, 404, "Curriculum not found");
    return sendSuccess(res, 200, "Curriculum deleted successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to delete curriculum", error);
  }
};
