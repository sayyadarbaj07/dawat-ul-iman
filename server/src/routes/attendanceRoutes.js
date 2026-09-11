const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Protected routes
router.use(protect);

router.get("/", authorize("admin", "teacher"), attendanceController.getAttendanceByDate);
router.post("/batch", authorize("admin", "teacher"), attendanceController.saveBatchAttendance);
router.get("/class", authorize("admin", "teacher"), attendanceController.getClassAttendance);
router.get("/student/:studentId", authorize("admin", "teacher", "student", "parent"), attendanceController.getStudentAttendanceSummary);
router.get("/teacher/:teacherId", authorize("admin", "teacher"), attendanceController.getTeacherAttendanceSummary);

module.exports = router;
