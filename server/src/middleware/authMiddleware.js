const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Teacher = require("../models/teacherModel");
const Class = require("../models/classModel");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");
      
      if (!req.user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }

      if (!req.user.isActive) {
        return res.status(403).json({ message: "Your account has been deactivated. Please contact an admin." });
      }
      
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};

// Middleware for routes that receive `classId` in req.query, req.body, or req.params
const checkClassAccess = async (req, res, next) => {
  if (req.user.role === "admin" || req.user.role === "accountant") {
    return next();
  }

  if (req.user.role === "teacher") {
    try {
      const teacher = await Teacher.findOne({ userId: req.user._id }).lean();
      
      if (!teacher) {
        return res.status(403).json({ message: "Teacher profile not found" });
      }

      req.teacherAssignedClassIds = teacher.assignedClassIds || [];

      const requestedClassId = req.query.classId || req.body.classId || req.params.classId;

      if (requestedClassId) {
        if (!requestedClassId.toString().match(/^[0-9a-fA-F]{24}$/)) {
          return res.status(400).json({ message: "Invalid classId format" });
        }
        
        if (!req.teacherAssignedClassIds.some(id => id.toString() === requestedClassId.toString())) {
          return res.status(403).json({ message: "Forbidden: You are not authorized to access data for this class" });
        }
      }

      return next();
    } catch (error) {
      return res.status(500).json({ message: "Server error verifying class access" });
    }
  }
  
  return next();
};

// Helper function for controllers that load a student first
const verifyTeacherClassAccess = async (user, classId, legacyClassName = null) => {
  if (user.role === "admin" || user.role === "accountant") {
    return true;
  }
  if (user.role === "teacher") {
    const teacher = await Teacher.findOne({ userId: user._id }).lean();
    if (!teacher) return false;

    const hasClassIds = teacher.assignedClassIds && teacher.assignedClassIds.length > 0;
    const hasLegacyClasses = teacher.assignedClasses && teacher.assignedClasses.length > 0;
    
    if (!hasClassIds && !hasLegacyClasses) {
      return false;
    }

    // Normalize populated classId if necessary
    const studentClassId = classId && typeof classId === "object" && classId._id ? classId._id : classId;

    // Check canonical classId if present
    if (studentClassId && studentClassId.toString().match(/^[0-9a-fA-F]{24}$/)) {
      if (hasClassIds && teacher.assignedClassIds.some(id => String(id) === String(studentClassId))) {
        return true;
      }
      // CRITICAL: Do NOT fall back to legacyClassName if canonical classId failed.
      return false;
    }
    
    if (legacyClassName) {
      // Resolve legacy string against the Class collection ONLY if the mapping is exact and unique.
      const exactMatches = await Class.find({
        $or: [
          { fullName: legacyClassName },
          { name: legacyClassName },
          { department: legacyClassName }
        ]
      }).lean();

      let resolvedClassId = null;
      if (exactMatches.length === 1) {
        resolvedClassId = exactMatches[0]._id;
      }

      if (hasClassIds) {
        if (resolvedClassId && teacher.assignedClassIds.some(id => id.toString() === resolvedClassId.toString())) {
          return true;
        }
        return false;
      }

      // Legacy fallback ONLY if canonical classId is absent
      // AND the legacy value can be deterministically resolved (exactMatches.length === 1).
      if (exactMatches.length === 1 && hasLegacyClasses && teacher.assignedClasses.includes(legacyClassName)) {
        return true;
      }
    }
    
    return false;
  }
  return false;
};

module.exports = { protect, authorize, checkClassAccess, verifyTeacherClassAccess };
