const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/login", authController.loginUser);

router.get("/profile", protect, authController.getUserProfile);
router.put("/change-password", protect, authController.changePassword);

module.exports = router;
