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
  .get(examController.getAllExamResults)
  .post(authorize("admin", "teacher"), examController.createExamResult);

router.route("/results/:id")
  .delete(authorize("admin", "teacher"), examController.deleteExamResult);

module.exports = router;
