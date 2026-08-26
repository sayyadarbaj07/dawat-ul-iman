const express = require("express");
const router = express.Router();
const { getSummary, getWeakStudentsReport } = require("../controllers/reportController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/summary", authorize("admin", "teacher", "accountant"), getSummary);
router.get("/weak-students", authorize("admin", "teacher", "accountant"), getWeakStudentsReport);

module.exports = router;
