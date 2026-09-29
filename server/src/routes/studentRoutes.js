const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const {
  studentValidationRules,
  handleValidationErrors,
} = require("../validators/studentValidator");
const upload = require("../middleware/uploadMiddleware");

const { protect, authorize } = require("../middleware/authMiddleware");

// All student endpoints require authentication
router.use(protect);

router.post(
  "/",
  authorize("admin", "teacher"),
  upload.single("photo"),
  studentValidationRules,
  handleValidationErrors,
  studentController.createStudent,
);
router.get("/", authorize("admin", "teacher"), studentController.getAllStudents);
router.get("/:id", authorize("admin", "teacher"), studentController.getStudentById);
router.put(
  "/:id",
  authorize("admin", "teacher"),
  upload.single("photo"),
  studentValidationRules,
  handleValidationErrors,
  studentController.updateStudent,
);


router.post(
  "/:id/promote",
  authorize("admin"),
  studentController.promoteStudent
);
router.post(
  "/bulk-promote",
  authorize("admin"),
  studentController.bulkPromoteStudents
);
router.delete("/:id", studentController.deleteStudent);

module.exports = router;
