const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employeeController");
const { protect, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// All routes require authentication and admin role
router.use(protect);
router.use(authorize("admin"));

router.route("/")
  .get(employeeController.getEmployees)
  .post(upload.single("photo"), employeeController.createEmployee);

router.route("/:id")
  .get(employeeController.getEmployeeById)
  .put(upload.single("photo"), employeeController.updateEmployee)
  .delete(employeeController.deleteEmployee);

module.exports = router;
