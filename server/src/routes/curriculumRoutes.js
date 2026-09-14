const express = require("express");
const router = express.Router();
const curriculumController = require("../controllers/curriculumController");
const teachingProgressController = require("../controllers/teachingProgressController");
const studentProgressController = require("../controllers/studentProgressController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);

router.route("/")
  .get(curriculumController.getAllCurriculums)
  .post(authorize("admin"), curriculumController.createCurriculum);

router.route("/teacher/:teacherId")
  .get(curriculumController.getCurriculumsByTeacher);

router.route("/student/:studentId")
  .get(curriculumController.getCurriculumsByStudent);

// Teaching Progress
router.route("/:curriculumId/teaching-progress")
  .post(teachingProgressController.addTeachingProgress)
  .get(teachingProgressController.getTeachingProgressHistory);

// Student Learning Progress
router.route("/:curriculumId/student/:studentId/learning-progress")
  .post(studentProgressController.addLearningProgress)
  .get(studentProgressController.getLearningProgressHistory);

router.route("/:id")
  .put(authorize("admin"), curriculumController.updateCurriculum)
  .delete(authorize("admin"), curriculumController.deleteCurriculum);

module.exports = router;
