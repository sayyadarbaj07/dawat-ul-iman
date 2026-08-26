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
}

module.exports = new StudentService();
