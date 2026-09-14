const express = require("express");
const router = express.Router();
const { getTeacherTimeline } = require("../controllers/teacherTimelineController");
const { protect } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(protect);

// GET timeline for a specific teacher
// Controller handles the RBAC (admin views any, teacher views own)
router.get("/:teacherId", getTeacherTimeline);

module.exports = router;
