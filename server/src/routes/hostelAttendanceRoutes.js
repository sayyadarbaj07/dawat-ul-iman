const express = require("express");
const router = express.Router();
const hostelAttendanceController = require("../controllers/hostelAttendanceController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Require authentication for all routes
router.use(protect);

// Admin only routes
router.use(authorize("admin"));

router.get("/", hostelAttendanceController.getAttendanceByDateAndSession);
router.post("/", hostelAttendanceController.saveAttendance);
router.delete("/:id", hostelAttendanceController.deleteAttendance);

module.exports = router;
