const TeacherTimetable = require("../models/teacherTimetableModel");
const Teacher = require("../models/teacherModel");
const Class = require("../models/classModel");
const TeacherTimeline = require("../models/teacherTimelineModel");
const ActivityLog = require("../models/activityLogModel");

// Helper for time overlap
const isOverlapping = (start1, end1, start2, end2) => {
  return start1 < end2 && start2 < end1;
};

// Log timeline event
const logTeacherTimeline = async (teacherId, eventType, performedBy, descriptionKey, metadata = {}) => {
  try {
    await TeacherTimeline.create({ teacherId, eventType, performedBy, descriptionKey, metadata });
  } catch (error) {
    console.error("Error logging teacher timeline:", error);
  }
};

const logActivity = async (action, performedBy, entityType, entityId, details) => {
  try {
    await ActivityLog.create({ action, performedBy, entityType, entityId, details });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};

exports.getTeacherTimetable = async (req, res) => {
  try {
    const { teacherId } = req.params;

    // RBAC: Admin can view any. Teacher can view own.
    if (req.user.role === "teacher") {
      const teacher = await Teacher.findOne({ userId: req.user._id });
      if (!teacher || teacher._id.toString() !== teacherId) {
        return res.status(403).json({ message: "Forbidden: Cannot view another teacher's timetable" });
      }
    } else if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Not authorized" });
    }

    const timetable = await TeacherTimetable.find({ teacherId, isActive: true })
      .populate("classId", "name section department fullName")
      .sort({ dayOfWeek: 1, startTime: 1 });

    res.status(200).json(timetable);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.createTimetableEntry = async (req, res) => {
  try {
    // RBAC: Only Admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { teacherId, classId, dayOfWeek, startTime, endTime, subject, room, period, remarks } = req.body;

    if (!teacherId || !classId || !dayOfWeek || !startTime || !endTime || !subject) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (startTime >= endTime) {
      return res.status(400).json({ message: "endTime must be greater than startTime" });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });
    if (teacher.status !== 'active') return res.status(400).json({ message: "Cannot assign timetable to inactive teacher" });

    const classObj = await Class.findById(classId);
    if (!classObj) return res.status(404).json({ message: "Class not found" });

    let checkDays = [dayOfWeek];
    if (dayOfWeek === 'Daily') {
      checkDays = ["Daily", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    } else {
      checkDays = [dayOfWeek, "Daily"];
    }
    const existingEntries = await TeacherTimetable.find({ teacherId, dayOfWeek: { $in: checkDays }, isActive: true });
    
    for (const entry of existingEntries) {
      if (isOverlapping(entry.startTime, entry.endTime, startTime, endTime)) {
        return res.status(409).json({ message: "Timetable conflict: Overlapping time for this teacher on the same day" });
      }
    }

    const newEntry = await TeacherTimetable.create({
      teacherId,
      classId,
      dayOfWeek,
      startTime,
      endTime,
      subject,
      room,
      period,
      remarks,
      isActive: true
    });

    await logTeacherTimeline(teacherId, "TIMETABLE_CREATED", req.user._id, "timetableAdded", {
      subject, dayOfWeek, startTime, endTime, className: classObj.fullName || classObj.name
    });
    
    await logActivity("TEACHER_TIMETABLE_CREATED", req.user._id, "TeacherTimetable", newEntry._id, { teacherId, classId, subject });

    const populatedEntry = await TeacherTimetable.findById(newEntry._id).populate("classId", "name section department fullName");
    res.status(201).json(populatedEntry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateTimetableEntry = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { id } = req.params;
    const { classId, dayOfWeek, startTime, endTime, subject, room, period, remarks, isActive } = req.body;

    const entryToUpdate = await TeacherTimetable.findById(id);
    if (!entryToUpdate) return res.status(404).json({ message: "Timetable entry not found" });

    if (startTime && endTime && startTime >= endTime) {
      return res.status(400).json({ message: "endTime must be greater than startTime" });
    }

    const checkStartTime = startTime || entryToUpdate.startTime;
    const checkEndTime = endTime || entryToUpdate.endTime;
    const checkDay = dayOfWeek || entryToUpdate.dayOfWeek;
    const checkIsActive = isActive !== undefined ? isActive : entryToUpdate.isActive;

    if (checkIsActive) {
      // Conflict checking (excluding self)
      let checkDays = [checkDay];
      if (checkDay === 'Daily') {
        checkDays = ["Daily", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      } else {
        checkDays = [checkDay, "Daily"];
      }
      const existingEntries = await TeacherTimetable.find({ 
        teacherId: entryToUpdate.teacherId, 
        dayOfWeek: { $in: checkDays }, 
        isActive: true,
        _id: { $ne: id }
      });
      
      for (const entry of existingEntries) {
        if (isOverlapping(entry.startTime, entry.endTime, checkStartTime, checkEndTime)) {
          return res.status(409).json({ message: "Timetable conflict: Overlapping time for this teacher on the same day" });
        }
      }
    }

    const updatedEntry = await TeacherTimetable.findByIdAndUpdate(
      id,
      { classId, dayOfWeek, startTime, endTime, subject, room, period, remarks, isActive },
      { new: true, runValidators: true }
    ).populate("classId", "name section department fullName");

    await logTeacherTimeline(updatedEntry.teacherId, "TIMETABLE_UPDATED", req.user._id, "timetableUpdated", {
      subject: updatedEntry.subject, dayOfWeek: updatedEntry.dayOfWeek, isActive: updatedEntry.isActive
    });
    
    await logActivity("TEACHER_TIMETABLE_UPDATED", req.user._id, "TeacherTimetable", updatedEntry._id, { updates: req.body });

    res.status(200).json(updatedEntry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteTimetableEntry = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { id } = req.params;
    const entry = await TeacherTimetable.findById(id);
    if (!entry) return res.status(404).json({ message: "Timetable entry not found" });

    // Soft delete
    entry.isActive = false;
    await entry.save();

    await logTeacherTimeline(entry.teacherId, "TIMETABLE_DELETED", req.user._id, "timetableDeleted", {
      subject: entry.subject, dayOfWeek: entry.dayOfWeek
    });
    
    await logActivity("TEACHER_TIMETABLE_DELETED", req.user._id, "TeacherTimetable", entry._id, { teacherId: entry.teacherId });

    res.status(200).json({ message: "Timetable entry deactivated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
