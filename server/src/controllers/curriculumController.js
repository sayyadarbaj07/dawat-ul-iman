const Curriculum = require("../models/curriculumModel");
const Class = require("../models/classModel");
const ActivityNotificationService = require("../services/activityNotificationService");

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

exports.getAllCurriculums = async (req, res) => {
  try {
    const filter = {};
    if (req.query.classId) {
      filter.classId = req.query.classId;
    }
    const curriculums = await Curriculum.find(filter)
      .populate('classId', 'fullName department name section')
      .sort({ createdAt: -1 });
    return sendSuccess(res, 200, "Curriculums fetched successfully", curriculums);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch curriculums", error);
  }
};

exports.createCurriculum = async (req, res) => {
  try {
    const payload = { ...req.body };
    
    if (payload.classId) {
      const canonicalClass = await Class.findById(payload.classId);
      if (!canonicalClass) {
        return sendError(res, 400, "Invalid classId: Class does not exist");
      }
      payload.department = canonicalClass.department;
    } else if (payload.classId === "") {
      payload.classId = null;
    }

    const curriculum = await Curriculum.create(payload);
    if (curriculum.classId) {
       await curriculum.populate('classId', 'fullName department name section');
    }

    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "CURRICULUM_CREATED",
      description: `Created curriculum: ${curriculum.subject}`,
      moduleName: "Curriculum",
      notification: {
        title: "New Curriculum Uploaded",
        message: `A new curriculum for ${curriculum.subject} is available.`,
        type: "success",
        link: `/curriculum`,
        relatedEntity: { entityId: curriculum._id, entityModel: "Student" } // General linkage
      },
      notifyAdmins: true
    });

    return sendSuccess(res, 201, "Curriculum created successfully", curriculum);
  } catch (error) {
    return sendError(res, 500, "Failed to create curriculum", error);
  }
};

exports.updateCurriculum = async (req, res) => {
  try {
    const payload = { ...req.body };
    
    if (payload.classId) {
      const canonicalClass = await Class.findById(payload.classId);
      if (!canonicalClass) {
        return sendError(res, 400, "Invalid classId: Class does not exist");
      }
      payload.department = canonicalClass.department;
    } else if (payload.classId === "") {
      payload.classId = null; // Fix Mongoose CastError on empty string
    }

    const curriculum = await Curriculum.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    }).populate('classId', 'fullName department name section');
    
    if (!curriculum) return sendError(res, 404, "Curriculum not found");

    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "CURRICULUM_UPDATED",
      description: `Updated curriculum: ${curriculum.subject}`,
      moduleName: "Curriculum",
      notification: {
        title: "Curriculum Updated",
        message: `The curriculum for ${curriculum.subject} has been updated.`,
        type: "info",
        link: `/curriculum`
      },
      notifyAdmins: true
    });

    return sendSuccess(res, 200, "Curriculum updated successfully", curriculum);
  } catch (error) {
    return sendError(res, 500, "Failed to update curriculum", error);
  }
};

exports.deleteCurriculum = async (req, res) => {
  try {
    const curriculum = await Curriculum.findByIdAndDelete(req.params.id);
    if (!curriculum) return sendError(res, 404, "Curriculum not found");

    ActivityNotificationService.dispatchActivityEvent({
      user: req.user,
      action: "CURRICULUM_DELETED",
      description: `Deleted curriculum: ${curriculum.subject}`,
      moduleName: "Curriculum",
      notifyAdmins: true
    });

    return sendSuccess(res, 200, "Curriculum deleted successfully");
  } catch (error) {
    return sendError(res, 500, "Failed to delete curriculum", error);
  }
};
