const express = require("express");
const router = express.Router();
const { getLogs } = require("../controllers/activityLogController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Only Admins can view activity logs
router.use(protect);
router.use(authorize("admin"));

router.get("/", getLogs);

module.exports = router;
