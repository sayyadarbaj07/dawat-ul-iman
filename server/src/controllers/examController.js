const Exam = require("../models/examModel");
const ExamResult = require("../models/examResultModel");

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

exports.getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find().sort({ date: 1 });
    return sendSuccess(res, 200, "Exams fetched successfully", exams);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch exams", error);
  }
};

exports.createExam = async (req, res) => {
  try {
    const exam = await Exam.create(req.body);
    return sendSuccess(res, 201, "Exam created successfully", exam);
  } catch (error) {
    return sendError(res, 500, "Failed to create exam", error);
  }
};

exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) return sendError(res, 404, "Exam not found");
    // Also delete associated results
    await ExamResult.deleteMany({ examId: req.params.id });
    return sendSuccess(res, 200, "Exam deleted successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to delete exam", error);
  }
};

exports.getAllExamResults = async (req, res) => {
  try {
    const results = await ExamResult.find()
      .populate("studentId", "name fullName className")
      .populate("examId", "name class")
      .sort({ marks: -1 });
    return sendSuccess(res, 200, "Exam results fetched successfully", results);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch exam results", error);
  }
};

exports.createExamResult = async (req, res) => {
  try {
    // Upsert logic based on examId and studentId
    const { examId, studentId, marks } = req.body;
    let result = await ExamResult.findOne({ examId, studentId });
    if (result) {
      result.marks = marks;
      await result.save();
    } else {
      result = await ExamResult.create({ examId, studentId, marks });
    }
    
    // Repopulate for frontend response
    result = await ExamResult.findById(result._id).populate("studentId", "name fullName className").populate("examId", "name class");

    return sendSuccess(res, 201, "Exam result saved successfully", result);
  } catch (error) {
    return sendError(res, 500, "Failed to save exam result", error);
  }
};

exports.deleteExamResult = async (req, res) => {
  try {
    const result = await ExamResult.findByIdAndDelete(req.params.id);
    if (!result) return sendError(res, 404, "Exam result not found");
    return sendSuccess(res, 200, "Exam result deleted successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to delete exam result", error);
  }
};
