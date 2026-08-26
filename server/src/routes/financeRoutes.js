const express = require("express");
const router = express.Router();
const financeController = require("../controllers/financeController");
const { protect, authorize } = require("../middleware/authMiddleware");

// All routes are protected
router.use(protect);

router.route("/")
  .get(authorize("admin", "accountant"), financeController.getAllTransactions)
  .post(authorize("admin", "accountant"), financeController.createTransaction);

router.route("/summary")
  .get(authorize("admin", "accountant", "viewer"), financeController.getFinanceSummary);

router.route("/categories")
  .get(authorize("admin", "accountant"), financeController.getCategories)
  .post(authorize("admin", "accountant"), financeController.createCategory);

router.route("/categories/:id")
  .delete(authorize("admin", "accountant"), financeController.deleteCategory);

module.exports = router;
