const express = require("express");
const router = express.Router();
const reserveFundController = require("../controllers/reserveFundController");
const { protect, authorize } = require("../middleware/authMiddleware");

// All routes are protected and strictly admin-only
router.use(protect);
router.use(authorize("admin"));

router.route("/")
  .get(reserveFundController.getList)
  .post(reserveFundController.createTransaction);

router.route("/summary")
  .get(reserveFundController.getSummary);

router.route("/:id")
  .get(reserveFundController.getSingle)
  .put(reserveFundController.updateTransaction)
  .delete(reserveFundController.deleteTransaction);

module.exports = router;
