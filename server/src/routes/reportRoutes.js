const express = require("express");
const router = express.Router();
const { 
  getSummary, 
  getWeakStudentsReport, 
  getDetailedFinanceReport, 
  exportDetailedFinanceExcel, 
  getStudentListReport,
  exportStudentListExcel,
  getExamAnalyticsReport
} = require("../controllers/reportController");
const { protect, authorize, checkClassAccess } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/summary", authorize("admin", "teacher", "accountant"), getSummary);
router.get("/weak-students", authorize("admin", "teacher", "accountant"), checkClassAccess, getWeakStudentsReport);
router.get("/finance/detailed", authorize("admin", "accountant"), getDetailedFinanceReport);
router.get("/finance/detailed/excel", authorize("admin", "accountant"), exportDetailedFinanceExcel);

router.get("/students/list", authorize("admin", "teacher", "accountant"), checkClassAccess, getStudentListReport);
router.get("/students/list/excel", authorize("admin", "teacher", "accountant"), checkClassAccess, exportStudentListExcel);
router.get("/exams/analytics", authorize("admin", "teacher"), checkClassAccess, getExamAnalyticsReport);

module.exports = router;
