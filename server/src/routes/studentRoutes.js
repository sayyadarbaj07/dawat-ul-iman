const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const {
  studentValidationRules,
  handleValidationErrors,
} = require("../validators/studentValidator");

router.post(
  "/",
  studentValidationRules,
  handleValidationErrors,
  studentController.createStudent,
);
router.get("/", studentController.getAllStudents);
router.get("/:id", studentController.getStudentById);
router.put(
  "/:id",
  studentValidationRules,
  handleValidationErrors,
  studentController.updateStudent,
);
router.delete("/:id", studentController.deleteStudent);

module.exports = router;
