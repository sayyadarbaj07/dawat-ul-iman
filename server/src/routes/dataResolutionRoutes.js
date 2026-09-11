const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getSummary,
  getStudents,
  getAttendance,
  getExams,
  getCurriculum,
  getTeachers,
  resolveStudent,
  resolveAttendance,
  resolveExam,
  resolveCurriculum,
  resolveTeacher
} = require("../controllers/dataResolutionController");

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

router.get("/summary", getSummary);
router.get("/students", getStudents);
router.get("/attendance", getAttendance);
router.get("/exams", getExams);
router.get("/curriculum", getCurriculum);
router.get("/teachers", getTeachers);

router.post("/students/:id/resolve", resolveStudent);
router.post("/attendance/:id/resolve", resolveAttendance);
router.post("/exams/:id/resolve", resolveExam);
router.post("/curriculum/:id/resolve", resolveCurriculum);
router.post("/teachers/:id/resolve", resolveTeacher);

module.exports = router;
