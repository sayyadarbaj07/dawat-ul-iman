const express = require("express");
const router = express.Router();
const teacherSalaryController = require("../controllers/teacherSalaryController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Get salary history (accessible by admin and the teacher themselves)
router.get("/history/:teacherId", protect, teacherSalaryController.getSalaryHistory);

// Both POST routes below are strictly admin only
router.post("/calculate", protect, authorize("admin"), teacherSalaryController.previewSalary);

// Calculate and save draft salary
router.post("/", protect, authorize("admin"), teacherSalaryController.createDraftSalary);

// Pay salary (create Finance transaction and update status)
router.post("/pay/:salaryId", protect, authorize("admin"), teacherSalaryController.paySalary);

module.exports = router;
