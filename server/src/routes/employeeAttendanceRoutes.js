const express = require("express");
const router = express.Router();
const employeeAttendanceController = require("../controllers/employeeAttendanceController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware.protect);
// Strictly Admin only. Do NOT grant Accountant access.
router.use(authMiddleware.authorize("admin"));

// Bulk action must come before /:id to avoid treating "bulk" as an ObjectId
router.post("/bulk", employeeAttendanceController.bulkCreateEmployeeAttendance);

router.get("/", employeeAttendanceController.getEmployeeAttendance);
router.post("/", employeeAttendanceController.createEmployeeAttendance);

router.get("/:id", employeeAttendanceController.getEmployeeAttendanceById);
router.put("/:id", employeeAttendanceController.updateEmployeeAttendance);
router.delete("/:id", employeeAttendanceController.deleteEmployeeAttendance);

module.exports = router;
