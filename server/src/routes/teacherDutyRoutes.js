const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getDuties,
  createDuty,
  updateDuty,
  updateStatus,
  deleteDuty
} = require("../controllers/teacherDutyController");

const router = express.Router();

router.get("/teachers/:teacherId/duties", protect, authorize("admin", "teacher"), getDuties);
router.post("/teachers/:teacherId/duties", protect, authorize("admin"), createDuty);

router.put("/teacher-duties/:id", protect, authorize("admin"), updateDuty);
router.patch("/teacher-duties/:id/status", protect, authorize("admin"), updateStatus);
router.delete("/teacher-duties/:id", protect, authorize("admin"), deleteDuty);

module.exports = router;
