const express = require("express");
const router = express.Router();
const reserveFundController = require("../controllers/reserveFundController");
const { protect, authorize } = require("../middleware/authMiddleware");

// All routes are protected
router.use(protect);

router.route("/")
  .get(authorize("admin", "accountant"), reserveFundController.getList)
  .post(authorize("admin", "accountant"), reserveFundController.createTransaction);

router.route("/summary")
  .get(authorize("admin", "accountant"), reserveFundController.getSummary);

router.route("/:id")
  .get(authorize("admin", "accountant"), reserveFundController.getSingle)
  .put(authorize("admin", "accountant"), reserveFundController.updateTransaction)
  .delete(authorize("admin"), reserveFundController.deleteTransaction);

module.exports = router;
