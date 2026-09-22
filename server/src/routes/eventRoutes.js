const express = require("express");
const router = express.Router();
const {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} = require("../controllers/eventController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);

router.route("/")
  .get(getEvents)
  .post(authorize("admin", "teacher"), createEvent);

router.route("/:id")
  .put(authorize("admin", "teacher"), updateEvent)
  .delete(authorize("admin", "teacher"), deleteEvent);

module.exports = router;
