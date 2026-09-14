const express = require("express");
const router = express.Router();
const { getTeacherTimetable, createTimetableEntry, updateTimetableEntry, deleteTimetableEntry } = require("../controllers/teacherTimetableController");
const { protect, authorize } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(protect);

// GET timetable for a specific teacher
// Controller handles the logic to ensure a teacher can only view their own
router.get("/:teacherId", getTeacherTimetable);

// Admin only routes for managing timetable entries
router.post("/", authorize("admin"), createTimetableEntry);
router.put("/:id", authorize("admin"), updateTimetableEntry);
router.delete("/:id", authorize("admin"), deleteTimetableEntry);

module.exports = router;
