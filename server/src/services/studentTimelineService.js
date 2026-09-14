const StudentTimeline = require("../models/studentTimelineModel");

/**
 * Safely creates a timeline event. This will not throw errors to prevent
 * breaking primary business operations.
 */
const createStudentTimelineEvent = async ({
  studentId,
  eventType,
  performedBy,
  descriptionKey,
  metadata = {}
}) => {
  try {
    if (!studentId || !eventType || !performedBy || !descriptionKey) {
      console.warn("Skipping timeline creation due to missing required fields.");
      return null;
    }

    const event = await StudentTimeline.create({
      studentId,
      eventType,
      performedBy,
      descriptionKey,
      metadata
    });
    
    return event;
  } catch (error) {
    console.error("StudentTimeline Error: Failed to create timeline event", error);
    // Do not throw the error, timeline should not break the business flow
    return null;
  }
};

module.exports = {
  createStudentTimelineEvent
};
