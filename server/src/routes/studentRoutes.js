const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const {
  studentValidationRules,
  handleValidationErrors,
} = require("../validators/studentValidator");
const upload = require("../middleware/uploadMiddleware");

router.post(
  "/",
  upload.single("photo"),
  studentValidationRules,
  handleValidationErrors,
  studentController.createStudent,
);
router.get("/", studentController.getAllStudents);
router.get("/:id", studentController.getStudentById);
router.put(
  "/:id",
  upload.single("photo"),
  studentValidationRules,
  handleValidationErrors,
  studentController.updateStudent,
);
const { protect, authorize } = require("../middleware/authMiddleware");

router.post(
  "/:id/promote",
  protect,
  authorize("admin"),
  studentController.promoteStudent
);
router.post(
  "/bulk-promote",
  protect,
  authorize("admin"),
  studentController.bulkPromoteStudents
);
router.delete("/:id", studentController.deleteStudent);

module.exports = router;
