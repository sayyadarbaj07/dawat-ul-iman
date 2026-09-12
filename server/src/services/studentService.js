const Student = require("../models/studentModel");

const Class = require("../models/classModel");
const ClassRollCounter = require("../models/classRollCounterModel");

class StudentService {
  async createStudent(payload) {
    if (payload.classId) {
      const cls = await Class.findById(payload.classId);
      if (!cls || cls.status !== "active") {
        const error = new Error("Invalid or inactive class assigned.");
        error.name = "ValidationError";
        throw error;
      }
      // Do not dual-write className/studentClass when canonical classId is provided
      payload.className = undefined;
      payload.studentClass = undefined;
      
      try {
        const nextRoll = await this._getNextRollNumber(payload.classId);
        payload.rollNumber = nextRoll.toString();
      } catch (err) {
        throw new Error("Failed to assign roll number: " + err.message);
      }
    }
    const student = await Student.create(payload);
    return student;
  }

  async _getNextRollNumber(classId) {
    // 1. Try normal atomic increment first
    let counter = await ClassRollCounter.findOneAndUpdate(
      { classId },
      { $inc: { lastRollNumber: 1 } },
      { new: true }
    );

    if (counter) {
      return counter.lastRollNumber;
    }

    // 2. Counter doesn't exist. Find max roll from existing students safely
    const students = await Student.find({ classId }).select("rollNumber").lean();
    let maxRoll = 0;
    for (const student of students) {
      if (student.rollNumber) {
        const str = student.rollNumber.trim();
        if (/^\d+$/.test(str)) { // strictly digits
          const parsed = parseInt(str, 10);
          if (parsed > maxRoll) {
            maxRoll = parsed;
          }
        }
      }
    }

    const nextRoll = maxRoll + 1;

    // 3. Try to create the counter atomically
    try {
      counter = await ClassRollCounter.create({
        classId,
        lastRollNumber: nextRoll
      });
      return counter.lastRollNumber;
    } catch (error) {
      // If E11000 duplicate key error, another request initialized it a millisecond ago!
      if (error.code === 11000) {
        // Just retry the atomic increment
        counter = await ClassRollCounter.findOneAndUpdate(
          { classId },
          { $inc: { lastRollNumber: 1 } },
          { new: true }
        );
        if (counter) return counter.lastRollNumber;
      }
      throw error;
    }
  }

  async getAllStudents(query = {}) {
    const { search, status, className, classId, residential, page = 1, limit = 50 } = query;

    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { fatherName: { $regex: search, $options: "i" } },
        { admissionNumber: { $regex: search, $options: "i" } },
        { rollNumber: { $regex: search, $options: "i" } },
      ];
    }

    if (status) filter.status = status;
    if (className) filter.className = className;
    if (classId) filter.classId = classId;
    if (residential !== undefined)
      filter.residential = residential === "true" || residential === true;

    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.min(parseInt(limit, 10), 500);
    const skip = (parsedPage - 1) * parsedLimit;

    const total = await Student.countDocuments(filter);
    const students = await Student.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    return {
      data: students,
      meta: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit)
      }
    };
  }

  async getStudentById(id) {
    return Student.findById(id);
  }

  async updateStudent(id, payload) {
    if (payload.classId) {
      const cls = await Class.findById(payload.classId);
      if (!cls || cls.status !== "active") {
        const error = new Error("Invalid or inactive class assigned.");
        error.name = "ValidationError";
        throw error;
      }
      // Do not dual-write legacy strings when canonical classId is provided
      payload.className = undefined;
      payload.studentClass = undefined;
    }
    return Student.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
  }

  async deleteStudent(id) {
    return Student.findByIdAndDelete(id);
  }
  async promoteStudent(id, promotionData, user) {
    const student = await Student.findById(id);
    if (!student) throw new Error("Student not found");

    if (
      promotionData.fromAcademicYear === promotionData.toAcademicYear &&
      (student.studentClass || student.className) === (promotionData.studentClass || promotionData.className)
    ) {
      throw new Error("Cannot promote to the exact same class and academic year");
    }

    let toClass = "Unknown";
    let cls = null;
    if (promotionData.classId) {
      cls = await Class.findById(promotionData.classId);
      if (cls && cls.status === "active") {
        toClass = cls.fullName;
      }
    } else {
      toClass = promotionData.toClass || promotionData.studentClass || promotionData.className;
    }

    const historyEntry = {
      fromAcademicYear: promotionData.fromAcademicYear,
      toAcademicYear: promotionData.toAcademicYear,
      fromClass: student.studentClass || student.className || "Unknown",
      toClass,
      status: promotionData.status || "Promoted",
      date: new Date(),
      updatedBy: user ? user._id : null,
      notes: promotionData.notes || ""
    };

    student.promotionHistory.push(historyEntry);
    
    if (cls) {
      student.classId = cls._id;
      // We deliberately DO NOT dual-write className/studentClass
      // to avoid conflicting string formats vs ObjectIds.
    } else {
      if (promotionData.className) student.className = promotionData.className;
      if (promotionData.studentClass) student.studentClass = promotionData.studentClass;
    }
    if (promotionData.schoolClass) student.schoolClass = promotionData.schoolClass;

    return student.save();
  }

  async bulkPromoteStudents(studentIds, promotionData, user) {
    const mongoose = require("mongoose");
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new Error("No students provided for promotion");
      }
      if (!promotionData.toAcademicYear || !promotionData.studentClass) {
        throw new Error("Target academic year and class are required");
      }

      const students = await Student.find({ _id: { $in: studentIds } }).session(session);
      if (students.length !== studentIds.length) {
        throw new Error("One or more students not found");
      }

      for (const student of students) {
        if (
          promotionData.fromAcademicYear === promotionData.toAcademicYear &&
          (student.studentClass || student.className) === (promotionData.studentClass || promotionData.className)
        ) {
          throw new Error(`Student ${student.name} cannot be promoted to the same class and year`);
        }

        let toClass = "Unknown";
        let cls = null;
        if (promotionData.classId) {
          cls = await Class.findById(promotionData.classId).session(session);
          if (cls && cls.status === "active") {
            toClass = cls.fullName;
          }
        } else {
          toClass = promotionData.toClass || promotionData.studentClass || promotionData.className;
        }

        const historyEntry = {
          fromAcademicYear: promotionData.fromAcademicYear,
          toAcademicYear: promotionData.toAcademicYear,
          fromClass: student.studentClass || student.className || "Unknown",
          toClass,
          status: promotionData.status || "Promoted",
          date: new Date(),
          updatedBy: user ? user._id : null,
          notes: promotionData.notes || ""
        };

        student.promotionHistory.push(historyEntry);
        
        if (cls) {
          student.classId = cls._id;
          // Do not dual-write legacy strings
        } else {
          if (promotionData.className) student.className = promotionData.className;
          if (promotionData.studentClass) student.studentClass = promotionData.studentClass;
        }
        
        if (promotionData.schoolClass) student.schoolClass = promotionData.schoolClass;

        await student.save({ session });
      }

      await session.commitTransaction();
      session.endSession();
      return true;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
}

module.exports = new StudentService();
