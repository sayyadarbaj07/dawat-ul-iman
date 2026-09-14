const express = require("express");
const router = express.Router();
const employeeSalaryController = require("../controllers/employeeSalaryController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Both routes are strictly admin only
router.use(protect);
router.use(authorize("admin"));

// Preview salary calculation without saving
router.post("/calculate", employeeSalaryController.previewSalary);

// Calculate and save draft salary
router.post("/", employeeSalaryController.createDraftSalary);

module.exports = router;
