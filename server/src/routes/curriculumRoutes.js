const express = require("express");
const router = express.Router();
const curriculumController = require("../controllers/curriculumController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);

router.route("/")
  .get(curriculumController.getAllCurriculums)
  .post(authorize("admin"), curriculumController.createCurriculum);

router.route("/:id")
  .put(authorize("admin"), curriculumController.updateCurriculum)
  .delete(authorize("admin"), curriculumController.deleteCurriculum);

module.exports = router;
