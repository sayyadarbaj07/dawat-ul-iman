const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protect, authorize } = require("../middleware/authMiddleware");

// All user management routes require admin role
router.use(protect);
router.use(authorize("admin"));

router.route("/")
  .get(userController.getAllUsers)
  .post(userController.createUser);

router.route("/:id")
  .put(userController.updateUser)
  .delete(userController.deleteUser);

router.route("/:id/reset-password")
  .put(userController.resetPassword);

module.exports = router;
