const express = require("express");
const router = express.Router();
const financeController = require("../controllers/financeController");
const { protect, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// All routes are protected
router.use(protect);

router.route("/")
  .get(authorize("admin", "accountant"), financeController.getAllTransactions)
  .post(authorize("admin", "accountant"), upload.single("receiptPhoto"), financeController.createTransaction);

router.route("/:id/void")
  .put(authorize("admin"), financeController.voidTransaction);

router.route("/summary")
  .get(authorize("admin", "accountant", "viewer"), financeController.getFinanceSummary);

router.route("/student/:id/fees")
  .get(authorize("admin", "accountant", "teacher"), financeController.getStudentFeeRecords)
  .post(authorize("admin", "accountant"), financeController.setStudentFee);

module.exports = router;
