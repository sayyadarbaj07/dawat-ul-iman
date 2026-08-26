const express = require("express");
const router = express.Router();
const teacherController = require("../controllers/teacherController");
const { protect, authorize } = require("../middleware/authMiddleware");

// All routes are protected
router.use(protect);

router.route("/")
  .get(teacherController.getAllTeachers)
  .post(authorize("admin"), teacherController.createTeacher);

router.route("/:id")
  .get(teacherController.getTeacherById)
  .put(authorize("admin"), teacherController.updateTeacher)
  .delete(authorize("admin"), teacherController.deleteTeacher);

module.exports = router;
