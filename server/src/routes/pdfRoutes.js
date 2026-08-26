const express = require("express");
const router = express.Router();
const pdfController = require("../controllers/pdfController");
const { protect, authorize } = require("../middleware/authMiddleware");

// All routes are protected
router.use(protect);

router.route("/student/:id/report-card")
  .get(authorize("admin", "teacher"), pdfController.generateStudentReportCard);

router.route("/finance/summary")
  .get(authorize("admin", "accountant"), pdfController.generateFinanceSummary);
router.route("/weak-students")
  .get(authorize("admin", "teacher", "accountant"), pdfController.generateWeakStudentsReport);

router.route("/attendance/class")
  .get(authorize("admin", "teacher"), pdfController.generateClassAttendancePDF);
router.route("/attendance/student/:id")
  .get(authorize("admin", "teacher"), pdfController.generateStudentAttendancePDF);

module.exports = router;
