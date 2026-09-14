const express = require("express");
const router = express.Router();
const hostelController = require("../controllers/hostelController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Require authentication for all routes
router.use(protect);

// GET allocations for a student (Admin and authorized Teachers)
router.get("/students/:studentId/hostel", authorize("admin", "teacher"), hostelController.getAllocations);

// Assign hostel (Admin only)
router.post("/students/:studentId/hostel", authorize("admin"), hostelController.assignHostel);

// Update specific allocation inventory/remarks (Admin only)
router.put("/student-hostel/:allocationId", authorize("admin"), hostelController.updateAllocation);

// Transfer to new room (Admin only)
router.patch("/student-hostel/:allocationId/transfer", authorize("admin"), hostelController.transferHostel);

// Vacate room (Admin only)
router.patch("/student-hostel/:allocationId/vacate", authorize("admin"), hostelController.vacateHostel);

module.exports = router;
