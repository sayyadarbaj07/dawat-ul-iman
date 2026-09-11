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

// Middleware for routes that receive `class` or `className` in req.query or req.body
const checkClassAccess = async (req, res, next) => {
  if (req.user.role === "admin" || req.user.role === "accountant") {
    return next();
  }

  if (req.user.role === "teacher") {
    try {
      const requestedClassId = req.query.classId || req.body.classId;
      const requestedClass = req.query.class || req.query.className || req.body.class || req.body.className;

      if (!requestedClassId && (!requestedClass || requestedClass === "all")) {
          // If a teacher requests all classes or misses the parameter but the endpoint allows it, we should ideally restrict them to only their classes.
          // But since the query requires a specific class, we'll let it pass or block based on the specific logic below.
          return next();
      }

      const teacher = await Teacher.findOne({ userId: req.user._id }).lean();
      
      // Check canonical classId if it's an ObjectId or convertible
      if (requestedClassId && requestedClassId.toString().match(/^[0-9a-fA-F]{24}$/)) {
        if (!teacher || !teacher.assignedClassIds || !teacher.assignedClassIds.some(id => id.toString() === requestedClassId.toString())) {
          return res.status(403).json({ message: "Forbidden: You are not authorized to access data for this class" });
        }
        return next();
      }

      if (requestedClass) {
        // Resolve legacy string against the Class collection ONLY if the mapping is exact and unique.
        const exactMatches = await Class.find({
          $or: [
            { fullName: requestedClass },
            { name: requestedClass },
            { department: requestedClass }
          ]
        }).lean();

        let resolvedClassId = null;
        if (exactMatches.length === 1) {
          resolvedClassId = exactMatches[0]._id;
        }

        const hasClassIds = teacher.assignedClassIds && teacher.assignedClassIds.length > 0;

        if (hasClassIds) {
          if (resolvedClassId && teacher.assignedClassIds.some(id => id.toString() === resolvedClassId.toString())) {
            return next();
          }
          return res.status(403).json({ message: "Forbidden: You are not authorized to access data for this class" });
        }

        // Legacy fallback: Only use teacher.assignedClasses as a temporary fallback when canonical assignedClassIds are unavailable
        // AND the legacy value can be deterministically resolved (exactMatches.length === 1).
        if (exactMatches.length === 1 && teacher.assignedClasses && teacher.assignedClasses.includes(requestedClass)) {
          return next();
        }
      }

      return res.status(403).json({ message: "Forbidden: You are not authorized to access data for this class" });
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

    // Check canonical classId if present
    if (classId && classId.toString().match(/^[0-9a-fA-F]{24}$/)) {
      if (hasClassIds && teacher.assignedClassIds.some(id => id.toString() === classId.toString())) {
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
