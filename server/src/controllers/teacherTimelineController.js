const TeacherTimeline = require("../models/teacherTimelineModel");
const Teacher = require("../models/teacherModel");

exports.getTeacherTimeline = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    // RBAC: Admin can view any. Teacher can view own.
    if (req.user.role === "teacher") {
      const teacher = await Teacher.findOne({ userId: req.user._id });
      if (!teacher || teacher._id.toString() !== teacherId) {
        return res.status(403).json({ message: "Forbidden: Cannot view another teacher's timeline" });
      }
    } else if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Not authorized" });
    }

    const skip = (page - 1) * limit;

    const timeline = await TeacherTimeline.find({ teacherId })
      .populate("performedBy", "name role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit + 1);

    const hasNextPage = timeline.length > limit;
    if (hasNextPage) {
      timeline.pop();
    }

    res.status(200).json({
      data: timeline,
      hasNextPage
    });
  } catch (error) {
    console.error("Error fetching teacher timeline:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
