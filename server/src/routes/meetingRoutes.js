const express = require("express");
const router = express.Router();
const {
  getMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
} = require("../controllers/meetingController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);

router.route("/")
  .get(getMeetings)
  .post(authorize("admin", "teacher"), createMeeting);

router.route("/:id")
  .put(authorize("admin", "teacher"), updateMeeting)
  .delete(authorize("admin"), deleteMeeting);

module.exports = router;
