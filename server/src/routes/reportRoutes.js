const express = require("express");
const router = express.Router();
const { 
  getSummary, 
  getWeakStudentsReport, 
  getDetailedFinanceReport, 
  exportDetailedFinanceExcel, 
  getStudentListReport,
  exportStudentListExcel,
  getExamAnalyticsReport,
  getCombinedStudentResult
} = require("../controllers/reportController");
const { protect, authorize, checkClassAccess } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/summary", authorize("admin", "teacher", "accountant"), getSummary);
router.get("/weak-students", authorize("admin", "teacher"), checkClassAccess, getWeakStudentsReport);
router.get("/finance/detailed", authorize("admin", "accountant"), getDetailedFinanceReport);
router.get("/finance/detailed/excel", authorize("admin", "accountant"), exportDetailedFinanceExcel);

router.get("/students/list", authorize("admin", "teacher"), checkClassAccess, getStudentListReport);
router.get("/students/list/excel", authorize("admin", "teacher"), checkClassAccess, exportStudentListExcel);
router.get("/exams/analytics", authorize("admin", "teacher"), checkClassAccess, getExamAnalyticsReport);
router.get("/student/:studentId/combined-result", authorize("admin", "teacher"), getCombinedStudentResult);

router.get("/diagnostic", async (req, res) => {
  const Transaction = require("../models/transactionModel");
  function hasArabic(str) { return /[\u0600-\u06FF]/.test(str); }
  function getCodePoints(str) { return Array.from(str).map(c => c.codePointAt(0).toString(16).padStart(4, '0')).join(' '); }
  const allTransactions = await Transaction.find().lean();
  const transactions = allTransactions.filter(tx => hasArabic(tx.description || "")).slice(0, 3);
  const report = [];
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const originalValue = tx.description;
    const controllerString = originalValue;
    const isArabic = hasArabic(controllerString);
    report.push({
      id: tx._id,
      originalValue,
      controllerString,
      isArabic,
      arabicReshaperApplied: false,
      bidiJsApplied: false,
      finalString: controllerString,
      codePointsBefore: getCodePoints(originalValue),
      codePointsAfter: getCodePoints(controllerString)
    });
  }
  res.json(report);
});

module.exports = router;
