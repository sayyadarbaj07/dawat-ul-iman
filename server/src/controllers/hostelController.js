const mongoose = require("mongoose");
const HostelAllocation = require("../models/hostelAllocationModel");
const Student = require("../models/studentModel");
const ActivityNotificationService = require("../services/activityNotificationService");
const { createStudentTimelineEvent } = require("../services/studentTimelineService");
const { verifyTeacherClassAccess } = require("../middleware/authMiddleware");

const sendSuccess = (res, statusCode, message, data = null) => {
  const payload = { success: true, message };
  if (data !== null) payload.data = data;
  return res.status(statusCode).json(payload);
};

const sendError = (res, statusCode, message, error = null) => {
  const payload = { success: false, message };
  if (error) payload.error = error.message || error;
  return res.status(statusCode).json(payload);
};

// 1. GET Allocations (Admin & Authorized Teacher)
exports.getAllocations = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);
    
    if (!student) {
      return sendError(res, 404, "Student not found");
    }

    if (req.user && req.user.role === "teacher") {
      const hasAccess = await verifyTeacherClassAccess(req.user, student.classId, student.className || student.studentClass);
      if (!hasAccess) {
        return sendError(res, 403, "Forbidden: You are not authorized to view this student's hostel information.");
      }
    }

    const allocations = await HostelAllocation.find({ studentId }).sort({ joiningDate: -1 });
    return sendSuccess(res, 200, "Allocations retrieved successfully", allocations);
  } catch (error) {
    return sendError(res, 500, "Failed to retrieve allocations", error);
  }
};

// 2. ASSIGN Hostel (Admin only)
exports.assignHostel = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { hostelName, room, bed, warden, joiningDate, inventory, remarks } = req.body;

    const student = await Student.findById(studentId);
    if (!student) return sendError(res, 404, "Student not found");
    if (!student.residential) {
      return sendError(res, 400, "Only residential students can receive a hostel allocation.");
    }

    const activeExists = await HostelAllocation.findOne({ studentId, status: "active" });
    if (activeExists) {
      return sendError(res, 400, "Student already has an active hostel allocation.");
    }

    const allocation = await HostelAllocation.create({
      studentId,
      hostelName,
      room,
      bed,
      warden,
      joiningDate: joiningDate || Date.now(),
      inventory: inventory || [],
      remarks
    });

    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "STUDENT_HOSTEL_ASSIGNED",
      description: `Assigned hostel ${hostelName} (Room ${room}, Bed ${bed}) to student: ${student.name}`,
      moduleName: "Students",
      notifyAdmins: false
    });

    createStudentTimelineEvent({
      studentId: student._id,
      eventType: "STUDENT_HOSTEL_ASSIGNED",
      performedBy: req.user._id,
      descriptionKey: "hostel_assigned",
      metadata: {
        allocationId: allocation._id,
        hostelName,
        room,
        bed
      }
    });

    return sendSuccess(res, 201, "Hostel assigned successfully", allocation);
  } catch (error) {
    if (error.code === 11000) {
       return sendError(res, 400, "Student already has an active hostel allocation (Unique constraint).", error);
    }
    return sendError(res, 500, "Failed to assign hostel", error);
  }
};

// 3. UPDATE Allocation (Admin only)
exports.updateAllocation = async (req, res) => {
  try {
    const { allocationId } = req.params;
    const { inventory, remarks } = req.body;

    const allocation = await HostelAllocation.findById(allocationId);
    if (!allocation) return sendError(res, 404, "Allocation not found");

    if (inventory !== undefined) allocation.inventory = inventory;
    if (remarks !== undefined) allocation.remarks = remarks;

    await allocation.save();

    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "STUDENT_HOSTEL_UPDATED",
      description: `Updated hostel allocation remarks/inventory for allocation: ${allocationId}`,
      moduleName: "Students",
      notifyAdmins: false
    });

    createStudentTimelineEvent({
      studentId: allocation.studentId,
      eventType: "STUDENT_HOSTEL_UPDATED",
      performedBy: req.user._id,
      descriptionKey: "hostel_updated",
      metadata: {
        allocationId: allocation._id
      }
    });

    return sendSuccess(res, 200, "Hostel allocation updated successfully", allocation);
  } catch (error) {
    return sendError(res, 500, "Failed to update hostel allocation", error);
  }
};

// 4. TRANSFER Hostel (Admin only)
exports.transferHostel = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { allocationId } = req.params;
    const { hostelName, room, bed, warden, joiningDate, inventory, remarks } = req.body;

    const oldAllocation = await HostelAllocation.findById(allocationId).session(session);
    if (!oldAllocation) {
      throw new Error("Allocation not found");
    }
    if (oldAllocation.status !== "active") {
      throw new Error("Only active allocations can be transferred");
    }

    const student = await Student.findById(oldAllocation.studentId).session(session);
    if (!student || !student.residential) {
      throw new Error("Student not found or not residential");
    }

    // Mark old as transferred
    oldAllocation.status = "transferred";
    oldAllocation.leavingDate = joiningDate || Date.now();
    await oldAllocation.save({ session });

    // Create new active allocation
    const newAllocation = new HostelAllocation({
      studentId: oldAllocation.studentId,
      hostelName,
      room,
      bed,
      warden: warden !== undefined ? warden : oldAllocation.warden,
      joiningDate: joiningDate || Date.now(),
      inventory: inventory || [],
      remarks: remarks || ""
    });

    await newAllocation.save({ session });

    await session.commitTransaction();
    session.endSession();

    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "STUDENT_HOSTEL_TRANSFERRED",
      description: `Transferred student ${student.name} from ${oldAllocation.hostelName} (Room ${oldAllocation.room}) to ${newAllocation.hostelName} (Room ${newAllocation.room})`,
      moduleName: "Students",
      notifyAdmins: false
    });

    createStudentTimelineEvent({
      studentId: student._id,
      eventType: "STUDENT_HOSTEL_TRANSFERRED",
      performedBy: req.user._id,
      descriptionKey: "hostel_transferred",
      metadata: {
        allocationId: newAllocation._id,
        previousValue: {
          hostelName: oldAllocation.hostelName,
          room: oldAllocation.room,
          bed: oldAllocation.bed
        },
        newValue: {
          hostelName: newAllocation.hostelName,
          room: newAllocation.room,
          bed: newAllocation.bed
        }
      }
    });

    return sendSuccess(res, 200, "Student transferred successfully", newAllocation);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return sendError(res, 400, "Failed to transfer student", error);
  }
};

// 5. VACATE Hostel (Admin only)
exports.vacateHostel = async (req, res) => {
  try {
    const { allocationId } = req.params;
    const { leavingDate, remarks } = req.body;

    const allocation = await HostelAllocation.findById(allocationId);
    if (!allocation) return sendError(res, 404, "Allocation not found");
    if (allocation.status !== "active") {
      return sendError(res, 400, "Only active allocations can be vacated");
    }

    allocation.status = "left";
    allocation.leavingDate = leavingDate || Date.now();
    if (remarks !== undefined) {
      allocation.remarks = remarks;
    }

    await allocation.save();

    const student = await Student.findById(allocation.studentId);
    
    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "STUDENT_HOSTEL_VACATED",
      description: `Student ${student ? student.name : 'Unknown'} vacated ${allocation.hostelName} (Room ${allocation.room})`,
      moduleName: "Students",
      notifyAdmins: false
    });

    createStudentTimelineEvent({
      studentId: allocation.studentId,
      eventType: "STUDENT_HOSTEL_VACATED",
      performedBy: req.user._id,
      descriptionKey: "hostel_vacated",
      metadata: {
        allocationId: allocation._id
      }
    });

    return sendSuccess(res, 200, "Hostel vacated successfully", allocation);
  } catch (error) {
    return sendError(res, 500, "Failed to vacate hostel", error);
  }
};
