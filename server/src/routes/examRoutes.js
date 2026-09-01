const express = require("express");
const router = express.Router();
const examController = require("../controllers/examController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);

router.route("/")
  .get(examController.getAllExams)
  .post(authorize("admin", "teacher"), examController.createExam);

router.route("/:id")
  .delete(authorize("admin", "teacher"), examController.deleteExam);

router.route("/results")
  .get(examController.getAllExamResults);

router.route("/results/bulk")
  .post(authorize("admin", "teacher"), examController.saveBulkMarks);

router.route("/:examId/calculated")
  .get(examController.getCalculatedResults);

router.route("/results/student/:studentId")
  .get(examController.getStudentHistoricalResults);

module.exports = router;
