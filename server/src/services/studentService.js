const Student = require("../models/studentModel");

class StudentService {
  async createStudent(payload) {
    const student = await Student.create(payload);
    return student;
  }

  async getAllStudents(query = {}) {
    const { search, status, className, residential } = query;

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
    if (residential !== undefined)
      filter.residential = residential === "true" || residential === true;

    return Student.find(filter).sort({ createdAt: -1 });
  }

  async getStudentById(id) {
    return Student.findById(id);
  }

  async updateStudent(id, payload) {
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

    const historyEntry = {
      fromAcademicYear: promotionData.fromAcademicYear,
      toAcademicYear: promotionData.toAcademicYear,
      fromClass: student.studentClass || student.className || "Unknown",
      toClass: promotionData.studentClass || promotionData.className,
      status: promotionData.status || "Promoted",
      date: new Date(),
      updatedBy: user ? user._id : null,
      notes: promotionData.notes || ""
    };

    student.promotionHistory.push(historyEntry);
    
    if (promotionData.className) student.className = promotionData.className;
    if (promotionData.studentClass) student.studentClass = promotionData.studentClass;
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

        const historyEntry = {
          fromAcademicYear: promotionData.fromAcademicYear,
          toAcademicYear: promotionData.toAcademicYear,
          fromClass: student.studentClass || student.className || "Unknown",
          toClass: promotionData.studentClass || promotionData.className,
          status: promotionData.status || "Promoted",
          date: new Date(),
          updatedBy: user ? user._id : null,
          notes: promotionData.notes || ""
        };

        student.promotionHistory.push(historyEntry);
        
        if (promotionData.className) student.className = promotionData.className;
        if (promotionData.studentClass) student.studentClass = promotionData.studentClass;
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
