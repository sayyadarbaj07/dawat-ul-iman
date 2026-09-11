const express = require("express");
const router = express.Router();
const classController = require("../controllers/classController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Admin & Teacher can read classes
// (Controller handles filtering logic for teachers)
router.get("/", protect, authorize("admin", "teacher"), classController.getClasses);
router.get("/:id", protect, authorize("admin", "teacher"), classController.getClassById);

// Only Admin can create, update, or deactivate classes
router.post("/", protect, authorize("admin"), classController.createClass);
router.put("/:id", protect, authorize("admin"), classController.updateClass);
router.patch("/:id/status", protect, authorize("admin"), classController.updateClassStatus);

module.exports = router;
