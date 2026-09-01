const express = require("express");
const router = express.Router();
const teacherController = require("../controllers/teacherController");
const { protect, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// All routes are protected
router.use(protect);

router.route("/")
  .get(teacherController.getAllTeachers)
  .post(authorize("admin"), upload.single("photo"), teacherController.createTeacher);

router.route("/:id")
  .get(teacherController.getTeacherById)
  .put(authorize("admin"), upload.single("photo"), teacherController.updateTeacher)
  .delete(authorize("admin"), teacherController.deleteTeacher);

module.exports = router;
