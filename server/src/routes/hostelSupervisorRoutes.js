const express = require("express");
const router = express.Router();
const hostelSupervisorController = require("../controllers/hostelSupervisorController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Require authentication for all routes
router.use(protect);

// Admin only routes
router.use(authorize("admin"));

router.get("/", hostelSupervisorController.getSupervisors);
router.post("/", hostelSupervisorController.createSupervisor);
router.put("/:id", hostelSupervisorController.updateSupervisor);
router.delete("/:id", hostelSupervisorController.deleteSupervisor);

module.exports = router;
