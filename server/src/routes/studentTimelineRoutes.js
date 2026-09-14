const express = require("express");
const router = express.Router();
const studentTimelineController = require("../controllers/studentTimelineController");
const { protect, authorize, verifyTeacherClassAccess } = require("../middleware/authMiddleware");
const Student = require("../models/studentModel");

// Route requires auth
router.use(protect);

// Re-use existing class access middleware
const checkTimelineAccess = async (req, res, next) => {
  if (req.user.role === "admin") return next();
  if (req.user.role === "accountant") {
    return res.status(403).json({ success: false, message: "Forbidden: Accountants cannot access timeline" });
  }

  // Teacher case
  try {
    const student = await Student.findById(req.params.studentId).lean();
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const hasAccess = await verifyTeacherClassAccess(req.user, student.classId, null);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: "Forbidden: You do not have access to this student's timeline." });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error verifying access", error: error.message });
  }
};

router.get("/students/:studentId/timeline", authorize("admin", "teacher"), checkTimelineAccess, studentTimelineController.getTimeline);

module.exports = router;
