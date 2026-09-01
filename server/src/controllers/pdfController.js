const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const Student = require("../models/studentModel");
const Teacher = require("../models/teacherModel");
const Transaction = require("../models/transactionModel");
const Attendance = require("../models/attendanceModel");
const Exam = require("../models/examModel");
const ExamResult = require("../models/examResultModel");
const { getTotalWorkingDays, getStudentAttendanceForPDF } = require("../services/attendanceService");

// PDF generation utility
const generatePDF = (res, title, generateContent, filters = null) => {
  const doc = new PDFDocument({ margin: 50 });
  
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${title.replace(/\s+/g, "_")}.pdf"`);
  
  doc.pipe(res);
  
  // Header
  doc.fontSize(24).font("Helvetica-Bold").text("Dawat-ul-Iman Madrasa", { align: "center" });
  doc.fontSize(10).font("Helvetica").text("123 Islamic Center Road, Cityville, State 12345", { align: "center" });
  doc.text("Phone: +1 234 567 8900 | Email: contact@dawatuliman.edu", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(16).font("Helvetica-Bold").text(title, { align: "center" });
  
  doc.fontSize(9).font("Helvetica").text(`Academic Year: ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, 50, doc.y, { align: "left" });
  doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 50, doc.y, { align: "right" });
  
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.5);


  if (filters) {
    doc.fontSize(10).font("Helvetica-Bold").text("Filters Applied:", 50);
    doc.font("Helvetica").fontSize(9);
    let filterText = [];

    // If the caller passed a clean, human-readable filter object, render it generically.
    // Otherwise fall back to the original req.query-style handling.
    const isClean = Object.keys(filters).some(k =>
      ["Student", "Class", "Period", "Teacher"].includes(k)
    );

    if (isClean) {
      filterText = Object.entries(filters).map(([k, v]) => `${k}: ${v}`);
    } else {
      if (filters.class && filters.class !== "all") filterText.push(`Class: ${filters.class}`);
      else filterText.push(`Class: All`);
      if (filters.examType) filterText.push(`Exam Type: ${filters.examType}`);
      if (filters.startDate) filterText.push(`Start Date: ${filters.startDate}`);
      if (filters.endDate) filterText.push(`End Date: ${filters.endDate}`);
    }

    doc.text(filterText.join("  |  "), 50, doc.y);
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
  }

  
  generateContent(doc);
  
  doc.end();
};

exports.generateStudentReportCard = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const examId = req.query.examId;
    if (!examId) return res.status(400).json({ message: "examId query parameter is required" });

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const examResults = await ExamResult.find({ examId, studentId: student._id });

    // Calculate marks
    let obtainedMarks = 0;
    let hasFailed = false;
    let subjectMarks = {};
    exam.subjects.forEach(sub => { subjectMarks[sub] = null; });

    examResults.forEach(r => {
      if (exam.subjects.includes(r.subject)) {
        if (r.marks === -1) {
          subjectMarks[r.subject] = "Absent";
          hasFailed = true;
        } else {
          subjectMarks[r.subject] = r.marks;
          obtainedMarks += r.marks;
          if (r.marks < exam.passingMarks) hasFailed = true;
        }
      }
    });

    const totalMarks = exam.subjects.length * exam.maxMarks;
    const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
    
    let grade = "F";
    if (!hasFailed) {
      if (percentage >= 90) grade = "A+";
      else if (percentage >= 80) grade = "A";
      else if (percentage >= 70) grade = "B";
      else if (percentage >= 60) grade = "C";
      else if (percentage >= 50) grade = "D";
      else { grade = "F"; hasFailed = true; }
    }
    
    exam.subjects.forEach(sub => {
      if (subjectMarks[sub] === null) {
        hasFailed = true;
        grade = "F";
      }
    });

    generatePDF(res, `Student Marksheet`, (doc) => {
      doc.fontSize(14).font("Helvetica-Bold").text("STUDENT PROFILE", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica");
      doc.text(`Name: ${student.fullName || student.name}`);
      doc.text(`Roll Number: ${student.rollNumber || "—"}`);
      doc.text(`Class: ${student.studentClass || student.className}`);
      doc.text(`Academic Year: ${exam.academicYear}`);
      doc.moveDown();

      doc.fontSize(14).font("Helvetica-Bold").text("EXAM DETAILS", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica");
      doc.text(`Exam Name: ${exam.name || exam.examName || "Unnamed Exam"}`);
      doc.text(`Exam Type: ${exam.examType}`);
      doc.moveDown();

      // Subjects Table Header
      const tableTop = doc.y;
      doc.font("Helvetica-Bold");
      doc.text("Subject", 50, tableTop);
      doc.text("Max Marks", 250, tableTop);
      doc.text("Obtained Marks", 400, tableTop);
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
      
      let y = tableTop + 20;
      doc.font("Helvetica");

      exam.subjects.forEach(sub => {
        doc.text(sub, 50, y);
        doc.text(exam.maxMarks.toString(), 250, y);
        const m = subjectMarks[sub];
        doc.text(m === null || m === "Absent" ? "Absent" : m.toString(), 400, y);
        y += 20;
      });

      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 10;

      // Summary
      doc.font("Helvetica-Bold");
      doc.text(`Total Marks: ${totalMarks}`, 50, y);
      doc.text(`Obtained Marks: ${obtainedMarks}`, 250, y);
      y += 20;
      doc.text(`Percentage: ${percentage.toFixed(2)}%`, 50, y);
      doc.text(`Grade: ${grade}`, 250, y);
      y += 20;
      doc.text(`Result: ${hasFailed ? 'FAIL' : 'PASS'}`, 50, y);
    });
  } catch (error) {
    res.status(500).json({ message: "Error generating PDF", error: error.message });
  }
};

exports.generateClassResultPDF = async (req, res) => {
  try {
    const { examId } = req.query;
    if (!examId) return res.status(400).json({ message: "examId is required" });

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    if (req.user && req.user.role === "teacher") {
      const teacher = await Teacher.findOne({ userId: req.user._id });
      if (!teacher || !teacher.assignedClasses.includes(exam.class)) {
        return res.status(403).json({ message: "You are not authorized to export results for this class" });
      }
    }

    const students = await Student.find({
      $or: [{ studentClass: exam.class }, { className: exam.class }]
    }).lean();

    const results = await ExamResult.find({ examId }).lean();

    const calculated = students.map(student => {
      const studentResults = results.filter(r => String(r.studentId) === String(student._id));
      let obtainedMarks = 0;
      let hasFailed = false;
      let subjectMarks = {};

      exam.subjects.forEach(sub => { subjectMarks[sub] = null; });
      studentResults.forEach(r => {
        if (exam.subjects.includes(r.subject)) {
          if (r.marks === -1) {
            subjectMarks[r.subject] = "Absent";
            hasFailed = true;
          } else {
            subjectMarks[r.subject] = r.marks;
            obtainedMarks += r.marks;
            if (r.marks < exam.passingMarks) hasFailed = true;
          }
        }
      });

      const totalMarks = exam.subjects.length * exam.maxMarks;
      const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
      
      let grade = "F";
      if (!hasFailed) {
        if (percentage >= 90) grade = "A+";
        else if (percentage >= 80) grade = "A";
        else if (percentage >= 70) grade = "B";
        else if (percentage >= 60) grade = "C";
        else if (percentage >= 50) grade = "D";
        else { grade = "F"; hasFailed = true; }
      }
      
      exam.subjects.forEach(sub => {
        if (subjectMarks[sub] === null) {
          hasFailed = true;
          grade = "F";
        }
      });

      return {
        rollNumber: student.rollNumber,
        name: student.fullName || student.name,
        obtainedMarks,
        totalMarks,
        percentage: percentage.toFixed(2),
        grade,
        status: hasFailed ? "Fail" : "Pass"
      };
    });

    // Sort by roll number or name
    calculated.sort((a, b) => {
      if (a.rollNumber && b.rollNumber) return String(a.rollNumber).localeCompare(String(b.rollNumber));
      return a.name.localeCompare(b.name);
    });

    generatePDF(res, `Class Result - ${exam.class}`, (doc) => {
      doc.fontSize(12).font("Helvetica");
      doc.text(`Exam: ${exam.name || exam.examName || "Unnamed"} (${exam.examType})`);
      doc.text(`Academic Year: ${exam.academicYear}`);
      doc.moveDown();

      const tableTop = doc.y;
      doc.font("Helvetica-Bold").fontSize(9);
      doc.text("Roll No", 50, tableTop);
      doc.text("Name", 120, tableTop);
      doc.text("Obtained/Total", 300, tableTop);
      doc.text("%", 400, tableTop);
      doc.text("Grade", 450, tableTop);
      doc.text("Status", 500, tableTop);
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      let y = tableTop + 20;
      doc.font("Helvetica");

      calculated.forEach(c => {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
        doc.text(c.rollNumber || "-", 50, y);
        doc.text(c.name, 120, y);
        doc.text(`${c.obtainedMarks}/${c.totalMarks}`, 300, y);
        doc.text(c.percentage, 400, y);
        doc.text(c.grade, 450, y);
        doc.text(c.status, 500, y);
        y += 20;
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Error generating class result PDF", error: error.message });
  }
};

exports.generateFinanceSummary = async (req, res) => {
  try {
    const { startDate, endDate, academicYear, status, type } = req.query;

    let filter = { status: "Completed" };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (academicYear) filter.academicYear = academicYear;
    
    let dateStr = "All Time";
    if (startDate && endDate) {
        filter.date = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
        dateStr = `${startDate} to ${endDate}`;
    }

    const transactions = await Transaction.find(filter)
      .populate("recordedBy", "name")
      .sort({ date: -1 })
      .lean();
    
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(tx => {
      if (tx.type === "income") totalIncome += tx.amount;
      if (tx.type === "expense") totalExpense += tx.amount;
    });

    const currentBalance = totalIncome - totalExpense;

    generatePDF(res, "Finance Report", (doc) => {
      doc.fontSize(10).font("Helvetica");
      doc.text(`Date Range: ${dateStr}`);
      if (academicYear) doc.text(`Academic Year: ${academicYear}`);
      doc.moveDown();

      // Summary Header
      doc.fontSize(12).font("Helvetica-Bold");
      doc.text(`Total Income: Rs ${totalIncome}`, { continued: true }).text(` | Total Expense: Rs ${totalExpense}`, { align: "right" });
      doc.moveDown();
      doc.fontSize(14).text(`Current Balance: Rs ${currentBalance}`, { underline: true });
      doc.moveDown(2);
      
      // Transactions Table
      const tableTop = doc.y;
      doc.fontSize(9).font("Helvetica-Bold");
      doc.text("Date", 50, tableTop);
      doc.text("Description", 120, tableTop);
      doc.text("Category", 300, tableTop);
      doc.text("Mode", 380, tableTop);
      doc.text("Amount", 450, tableTop, { align: "right" });
      doc.moveTo(50, tableTop + 12).lineTo(550, tableTop + 12).stroke();
      
      let y = tableTop + 20;
      doc.font("Helvetica");

      transactions.forEach(tx => {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
        
        const txDate = new Date(tx.date).toLocaleDateString();
        doc.fillColor(tx.type === "income" ? "green" : "red");
        
        doc.text(txDate, 50, y);
        doc.text(tx.description, 120, y, { width: 170 });
        doc.text(tx.category || "-", 300, y);
        doc.text(tx.paymentMode || "Cash", 380, y);
        
        const sign = tx.type === "income" ? "+" : "-";
        doc.text(`${sign} Rs ${tx.amount}`, 450, y, { align: "right" });
        
        y += 15;
      });

      doc.fillColor("black");
    });
  } catch (error) {
    res.status(500).json({ message: "Error generating PDF", error: error.message });
  }
};

exports.generateFeeReceiptPDF = async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id)
      .populate("recordedBy", "name")
      .populate("referenceId") // Student
      .lean();

    if (!tx) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    generatePDF(res, "Fee Receipt", (doc) => {
      doc.fontSize(12).font("Helvetica-Bold").text(`Receipt No: ${tx._id}`, { align: "right" });
      doc.fontSize(10).font("Helvetica").text(`Date: ${new Date(tx.date).toLocaleDateString()}`, { align: "right" });
      doc.moveDown(2);

      doc.fontSize(14).font("Helvetica-Bold").text("PAYMENT DETAILS", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).font("Helvetica");

      if (tx.referenceId) {
        doc.text(`Student Name: ${tx.referenceId.name || tx.referenceId.fullName}`);
        doc.text(`Roll Number: ${tx.referenceId.rollNumber || "N/A"}`);
        doc.text(`Class: ${tx.className || tx.referenceId.studentClass || "N/A"}`);
      }

      doc.text(`Academic Year: ${tx.academicYear || "N/A"}`);
      doc.moveDown();
      
      doc.font("Helvetica-Bold");
      doc.text(`Amount Paid: Rs ${tx.amount}`);
      doc.font("Helvetica");
      doc.text(`Category: ${tx.category}`);
      doc.text(`Payment Mode: ${tx.paymentMode}`);
      doc.text(`Description: ${tx.description}`);
      if (tx.remarks) doc.text(`Remarks: ${tx.remarks}`);
      if (tx.status === "Cancelled") {
        doc.moveDown();
        doc.fillColor("red").text(`STATUS: CANCELLED`, { underline: true }).fillColor("black");
      }

      doc.moveDown(4);
      doc.text("_________________________", { align: "right" });
      doc.text("Authorized Signature", { align: "right" });
    });

  } catch (error) {
    res.status(500).json({ message: "Error generating PDF", error: error.message });
  }
};

exports.generateWeakStudentsReport = async (req, res) => {
  try {
    const { class: className } = req.query;
    
    const initialMatch = { status: "active" };
    if (className && className !== "all") {
      initialMatch.className = className;
    }

    const weakStudents = await Student.aggregate([
      { $match: initialMatch },
      { $lookup: { from: "examresults", localField: "_id", foreignField: "studentId", as: "examResults" } },
      {
        $addFields: {
          averageMarks: {
            $cond: {
              if: { $gt: [{ $size: "$examResults" }, 0] },
              then: { $avg: "$examResults.marks" },
              else: 0
            }
          },
          failedSubjectsCount: {
            $size: {
              $filter: {
                input: "$examResults",
                as: "result",
                cond: { $lt: ["$$result.marks", 33] }
              }
            }
          }
        }
      },
      {
        $match: {
          $or: [
            { attendancePercent: { $lt: 75 } },
            { averageMarks: { $lt: 40 } },
            { failedSubjectsCount: { $gt: 0 } }
          ]
        }
      },
      {
        $project: {
          name: 1,
          className: 1,
          attendancePercent: 1,
          averageMarks: { $round: ["$averageMarks", 2] },
          failedSubjectsCount: 1,
          reasons: {
            $concatArrays: [
              { $cond: [{ $lt: ["$attendancePercent", 75] }, ["Low Attendance"], []] },
              { $cond: [{ $lt: ["$averageMarks", 40] }, ["Low Avg"], []] },
              { $cond: [{ $gt: ["$failedSubjectsCount", 0] }, ["Failed Subj"], []] }
            ]
          }
        }
      },
      { $sort: { className: 1, name: 1 } }
    ]);

    generatePDF(res, "Weak Students Report", (doc) => {
      let y = doc.y;
      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("Sr", 50, y, { width: 25 });
      doc.text("ID", 75, y, { width: 50 });
      doc.text("Name", 125, y, { width: 100 });
      doc.text("Class", 225, y, { width: 60 });
      doc.text("Avg %", 285, y, { width: 45 });
      doc.text("Attend", 330, y, { width: 45 });
      doc.text("Fail", 375, y, { width: 30 });
      doc.text("Reason", 405, y, { width: 145 });
      
      doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
      
      y += 20;
      doc.font("Helvetica");
      
      if (weakStudents.length === 0) {
        doc.text("No weak students found for the selected criteria.", 50, y, { align: "center" });
        return;
      }

      weakStudents.forEach((student, index) => {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
        
        doc.text((index + 1).toString(), 50, y, { width: 25 });
        doc.text((student.studentId || "N/A"), 75, y, { width: 50 });
        doc.text((student.name || "").substring(0, 20), 125, y, { width: 100 });
        doc.text((student.className || "").substring(0, 15), 225, y, { width: 60 });
        doc.text((student.averageMarks || 0).toString() + "%", 285, y, { width: 45 });
        doc.text((student.attendancePercent || 0).toString() + "%", 330, y, { width: 45 });
        doc.text((student.failedSubjectsCount || 0).toString(), 375, y, { width: 30 });
        doc.text((student.reasons || []).join(", "), 405, y, { width: 145 });
        
        y += 15;
      });
    }, req.query);
  } catch (error) {
    res.status(500).json({ message: "Error generating PDF", error: error.message });
  }
};

exports.generateClassAttendancePDF = async (req, res) => {
  try {
    const { className, month, year, startDate, endDate } = req.query;
    
    // RBAC Check for teachers
    if (req.user.role === "teacher") {
      const teacher = await Teacher.findOne({ userId: req.user._id });
      if (!teacher || !teacher.assignedClasses.includes(className)) {
        return res.status(403).json({ message: "Forbidden: Not assigned to this class" });
      }
    }

    let matchQuery = { userType: "Student", className };
    
    if (startDate && endDate) {
      matchQuery.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (month && year) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);
      matchQuery.date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    // Get total working days for this class dynamically based on the filter
    const uniqueDates = await Attendance.distinct("date", matchQuery);
    const totalWorkingDays = uniqueDates.length;

    // Fetch all students in the class
    const students = await Student.find({ className, status: "active" }).sort({ rollNumber: 1, name: 1 });
    
    // Fetch all relevant attendance records
    const attendanceRecords = await Attendance.find(matchQuery);

    generatePDF(res, "Class Attendance Summary", (doc) => {
      let y = doc.y;
      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("Roll", 50, y, { width: 40 });
      doc.text("Name", 90, y, { width: 150 });
      doc.text("Total", 250, y, { width: 50 });
      doc.text("Present", 310, y, { width: 60 });
      doc.text("Absent", 380, y, { width: 60 });
      doc.text("Late", 450, y, { width: 50 });
      doc.text("%", 510, y, { width: 40 });
      
      doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
      
      y += 20;
      doc.font("Helvetica");
      
      if (students.length === 0) {
        doc.text("No students found in this class.", 50, y, { align: "center" });
        return;
      }

      students.forEach((student) => {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }

        const studentRecords = attendanceRecords.filter(r => r.userId.toString() === student._id.toString());
        const present = studentRecords.filter(r => r.status === "Present").length;
        const absent = studentRecords.filter(r => r.status === "Absent").length;
        const late = studentRecords.filter(r => r.status === "Late").length;
        const attended = present + late;
        const percentage = totalWorkingDays > 0 ? Math.round((attended / totalWorkingDays) * 100) : 0;
        
        doc.text((student.rollNumber || "-"), 50, y, { width: 40 });
        doc.text((student.name || "").substring(0, 30), 90, y, { width: 150 });
        doc.text(totalWorkingDays.toString(), 250, y, { width: 50 });
        doc.text(present.toString(), 310, y, { width: 60 });
        doc.text(absent.toString(), 380, y, { width: 60 });
        doc.text(late.toString(), 450, y, { width: 50 });
        doc.text(`${percentage}%`, 510, y, { width: 40 });
        
        y += 15;
      });
    }, req.query);

  } catch (error) {
    res.status(500).json({ message: "Error generating Class Attendance PDF", error: error.message });
  }
};

exports.generateStudentAttendancePDF = async (req, res) => {
  try {
    const studentId = req.params.id;

    // RBAC: teachers may only access students from their assigned classes
    if (req.user.role === "teacher") {
      const teacher = await Teacher.findOne({ userId: req.user._id }).lean();
      // Pre-fetch the student to check class membership
      const Student = require("../models/studentModel");
      const student = await Student.findById(studentId).lean();
      if (!student) return res.status(404).json({ message: "Student not found" });
      if (!teacher || !teacher.assignedClasses.includes(student.className)) {
        return res.status(403).json({ message: "Forbidden: Not assigned to this student's class" });
      }
    }

    // All business logic lives in the service
    const { student, records, summary, totalWorkingDays, periodLabel } =
      await getStudentAttendanceForPDF(studentId, req.query);

    const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    generatePDF(res, `Student Attendance Report`, (doc) => {
      // ── Summary block ────────────────────────────────────────────────────
      doc.fontSize(11).font("Helvetica-Bold");
      doc.text(`Student: ${student.name}`, 50);
      doc.font("Helvetica").fontSize(10);
      if (student.rollNumber) doc.text(`Roll No: ${student.rollNumber}`, 50);
      doc.text(`Class  : ${student.className}`, 50);
      doc.text(`Period : ${periodLabel}`, 50);
      doc.moveDown(0.8);

      doc.font("Helvetica-Bold").fontSize(10);
      doc.text(`Total Working Days : ${totalWorkingDays}`, 50, doc.y, { continued: true });
      doc.text(`   Present: ${summary.present}   Absent: ${summary.absent}   Late: ${summary.late}`, { align: "right" });
      doc.moveDown(0.3);
      doc.fontSize(11).text(
        `Attendance: ${summary.percentage}%  (${summary.attended} / ${totalWorkingDays} days attended)`,
        50, doc.y, { align: "center" }
      );

      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.6);

      // ── Date-wise table ───────────────────────────────────────────────────
      if (records.length === 0) {
        doc.font("Helvetica").fontSize(10)
           .text("No attendance records found.", 50, doc.y, { align: "center" });
        return;
      }

      // Table header
      let y = doc.y;
      const COL = { date: 50, day: 180, status: 280, remarks: 370 };

      doc.font("Helvetica-Bold").fontSize(9);
      doc.text("Date",    COL.date,    y, { width: 120 });
      doc.text("Day",     COL.day,     y, { width: 90  });
      doc.text("Status",  COL.status,  y, { width: 80  });
      doc.text("Remarks", COL.remarks, y, { width: 180 });
      y += 14;
      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 4;

      doc.font("Helvetica").fontSize(9);

      for (const record of records) {
        // Page break protection
        if (y > 720) {
          doc.addPage();
          y = 50;
          // Repeat header on new page
          doc.font("Helvetica-Bold").fontSize(9);
          doc.text("Date",    COL.date,    y, { width: 120 });
          doc.text("Day",     COL.day,     y, { width: 90  });
          doc.text("Status",  COL.status,  y, { width: 80  });
          doc.text("Remarks", COL.remarks, y, { width: 180 });
          y += 14;
          doc.moveTo(50, y).lineTo(550, y).stroke();
          y += 4;
          doc.font("Helvetica").fontSize(9);
        }

        const d      = new Date(record.date);
        const dateStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        const dayStr  = DAY_NAMES[d.getDay()];

        // Colour-code status
        const statusColors = { Present: "#16a34a", Absent: "#dc2626", Late: "#d97706" };
        doc.fillColor(statusColors[record.status] || "#000000");

        doc.text(dateStr,            COL.date,    y, { width: 120 });
        doc.fillColor("#000000");
        doc.text(dayStr,             COL.day,     y, { width: 90  });
        doc.fillColor(statusColors[record.status] || "#000000");
        doc.text(record.status,      COL.status,  y, { width: 80  });
        doc.fillColor("#000000");
        doc.text(record.remarks || "", COL.remarks, y, { width: 180 });

        y += 15;
      }

      // Footer totals line
      y += 6;
      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 6;
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#000000");
      doc.text(
        `Total: ${records.length} records  |  Present: ${summary.present}  Absent: ${summary.absent}  Late: ${summary.late}  |  Attendance: ${summary.percentage}%`,
        50, y, { width: 500, align: "center" }
      );

    });

  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ message: error.message || "Error generating Student Attendance PDF" });
  }
};

exports.generateAcademicHistoryPDF = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Enforce teacher RBAC
    if (req.user && req.user.role === "teacher") {
      const teacher = await Teacher.findOne({ userId: req.user._id });
      if (!teacher || !teacher.assignedClasses.includes(student.studentClass || student.className)) {
         return res.status(403).json({ message: "Unauthorized to view this student's history" });
      }
    }

    const allExams = await Exam.find().lean();
    const allResults = await ExamResult.find({ studentId: student._id }).lean();
    
    // Group results by exam
    const historyMap = {};
    for (const exam of allExams) {
      const results = allResults.filter(r => String(r.examId) === String(exam._id));
      if (results.length > 0) {
        let obtainedMarks = 0;
        let hasFailed = false;
        
        results.forEach(r => {
          if (r.marks === -1) {
            hasFailed = true;
          } else {
            obtainedMarks += r.marks;
            if (r.marks < exam.passingMarks) hasFailed = true;
          }
        });
        
        const totalMarks = exam.subjects.length * exam.maxMarks;
        const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
        
        let grade = "F";
        if (!hasFailed) {
          if (percentage >= 90) grade = "A+";
          else if (percentage >= 80) grade = "A";
          else if (percentage >= 70) grade = "B";
          else if (percentage >= 60) grade = "C";
          else if (percentage >= 50) grade = "D";
          else { grade = "F"; hasFailed = true; }
        }
        
        // If they missed a subject
        const subjectsFound = new Set(results.map(r => r.subject));
        exam.subjects.forEach(sub => {
          if (!subjectsFound.has(sub)) {
            hasFailed = true;
            grade = "F";
          }
        });

        historyMap[exam._id] = {
          academicYear: exam.academicYear,
          className: exam.class,
          examName: exam.name || exam.examName || "Unnamed",
          examType: exam.examType,
          percentage: percentage.toFixed(2),
          grade,
          status: hasFailed ? "Fail" : "Pass"
        };
      }
    }

    const historyData = Object.values(historyMap).sort((a, b) => b.academicYear.localeCompare(a.academicYear));

    generatePDF(res, "Academic History Report", (doc) => {
      doc.fontSize(14).font("Helvetica-Bold").text("STUDENT PROFILE", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica");
      doc.text(`Name: ${student.fullName || student.name}`);
      doc.text(`Roll Number: ${student.rollNumber || "—"}`);
      doc.text(`Current Class: ${student.studentClass || student.className}`);
      doc.moveDown();

      doc.fontSize(14).font("Helvetica-Bold").text("ACADEMIC HISTORY", { underline: true });
      doc.moveDown(0.5);
      
      const tableTop = doc.y;
      doc.font("Helvetica-Bold");
      doc.text("Academic Year", 50, tableTop);
      doc.text("Class", 150, tableTop);
      doc.text("Exam", 280, tableTop);
      doc.text("%", 400, tableTop);
      doc.text("Grade", 450, tableTop);
      doc.text("Status", 500, tableTop);
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
      
      let y = tableTop + 20;
      doc.font("Helvetica");

      historyData.forEach(hist => {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
        doc.text(hist.academicYear, 50, y);
        doc.text(hist.className, 150, y, { width: 120 });
        doc.text(`${hist.examName} (${hist.examType})`, 280, y, { width: 110 });
        doc.text(`${hist.percentage}%`, 400, y);
        doc.text(hist.grade, 450, y);
        doc.text(hist.status, 500, y);
        y += 20;
      });

      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 10;
      doc.text(`Total Records: ${historyData.length}`, 50, y);
    });

  } catch (error) {
    res.status(500).json({ message: "Error generating PDF", error: error.message });
  }
};

exports.generateYearlyResultPDF = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Enforce teacher RBAC
    if (req.user && req.user.role === "teacher") {
      const teacher = await Teacher.findOne({ userId: req.user._id });
      if (!teacher || !teacher.assignedClasses.includes(student.studentClass || student.className)) {
         return res.status(403).json({ message: "Unauthorized to view this student's result" });
      }
    }

    const { academicYear } = req.query;
    if (!academicYear) return res.status(400).json({ message: "Academic Year is required" });

    const exams = await Exam.find({ 
      academicYear, 
      class: { $in: [student.studentClass, student.className].filter(Boolean) }
    }).lean();

    if (exams.length === 0) {
      return res.status(404).json({ message: "No exams found for this academic year" });
    }

    // Filter to only Yearly exam if exists, otherwise aggregate all
    let targetExams = exams;
    const yearlyExam = exams.find(e => e.examType === "Yearly");
    if (yearlyExam) targetExams = [yearlyExam];

    const examIds = targetExams.map(e => e._id);
    const results = await ExamResult.find({ studentId: student._id, examId: { $in: examIds } }).lean();

    // Summing up logic (simplified for Yearly Result: if there's a Yearly exam, we use it. Otherwise, combine)
    // Actually, "Do not blindly combine all exams... use only exams/results belonging to requested student+year+class"
    // Let's use the Yearly exam if present. If not, just list the exams they have.
    
    generatePDF(res, "Yearly Result", (doc) => {
      doc.fontSize(14).font("Helvetica-Bold").text("STUDENT PROFILE", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica");
      doc.text(`Name: ${student.fullName || student.name}`);
      doc.text(`Roll Number: ${student.rollNumber || "—"}`);
      doc.text(`Class: ${student.studentClass || student.className}`);
      doc.text(`Academic Year: ${academicYear}`);
      doc.moveDown();

      targetExams.forEach(exam => {
        const studentResults = results.filter(r => String(r.examId) === String(exam._id));
        if (studentResults.length === 0) return;

        doc.fontSize(12).font("Helvetica-Bold").text(`${exam.name || exam.examName || exam.examType}`, { underline: true });
        doc.moveDown(0.5);
        
        let obtainedMarks = 0;
        let hasFailed = false;
        let subjectMarks = {};
        
        exam.subjects.forEach(sub => { subjectMarks[sub] = null; });
        studentResults.forEach(r => {
          if (exam.subjects.includes(r.subject)) {
            if (r.marks === -1) {
              subjectMarks[r.subject] = "Absent";
              hasFailed = true;
            } else {
              subjectMarks[r.subject] = r.marks;
              obtainedMarks += r.marks;
              if (r.marks < exam.passingMarks) hasFailed = true;
            }
          }
        });

        const totalMarks = exam.subjects.length * exam.maxMarks;
        const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
        
        let grade = "F";
        if (!hasFailed) {
          if (percentage >= 90) grade = "A+";
          else if (percentage >= 80) grade = "A";
          else if (percentage >= 70) grade = "B";
          else if (percentage >= 60) grade = "C";
          else if (percentage >= 50) grade = "D";
          else { grade = "F"; hasFailed = true; }
        }

        exam.subjects.forEach(sub => {
          if (subjectMarks[sub] === null) {
            hasFailed = true;
            grade = "F";
          }
        });

        // Subjects Table Header
        const tableTop = doc.y;
        doc.font("Helvetica-Bold").fontSize(10);
        doc.text("Subject", 50, tableTop);
        doc.text("Max Marks", 250, tableTop);
        doc.text("Obtained", 400, tableTop);
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        
        let y = tableTop + 20;
        doc.font("Helvetica");

        exam.subjects.forEach(sub => {
          if (y > 700) { doc.addPage(); y = 50; }
          doc.text(sub, 50, y);
          doc.text(exam.maxMarks.toString(), 250, y);
          const m = subjectMarks[sub];
          doc.text(m === null || m === "Absent" ? "Absent" : m.toString(), 400, y);
          y += 20;
        });

        doc.moveTo(50, y).lineTo(550, y).stroke();
        y += 10;
        doc.font("Helvetica-Bold");
        doc.text(`Total Marks: ${totalMarks}  |  Obtained: ${obtainedMarks}  |  Percentage: ${percentage.toFixed(2)}%  |  Grade: ${grade}  |  Result: ${hasFailed ? 'FAIL' : 'PASS'}`, 50, y);
        doc.moveDown(2);
      });
    });

  } catch (error) {
    res.status(500).json({ message: "Error generating PDF", error: error.message });
  }
};
