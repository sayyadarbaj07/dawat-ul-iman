const express = require("express");
const router = express.Router();
const {
  getAchievements,
  createAchievement,
  updateAchievement,
  deleteAchievement
} = require("../controllers/achievementController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Both Admin and Teacher can read achievements (Teacher is restricted by assignedClassIds inside controller)
router.get("/", protect, authorize("admin", "teacher"), getAchievements);

// Only Admin can modify achievements
router.post("/", protect, authorize("admin"), createAchievement);
router.put("/:id", protect, authorize("admin"), updateAchievement);
router.delete("/:id", protect, authorize("admin"), deleteAchievement);

module.exports = router;
