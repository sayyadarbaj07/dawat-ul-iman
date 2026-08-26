const PDFDocument = require("pdfkit");
const Student = require("../models/studentModel");
const Teacher = require("../models/teacherModel");
const Transaction = require("../models/transactionModel");
const Attendance = require("../models/attendanceModel");
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

    generatePDF(res, `Report Card - ${student.name}`, (doc) => {
      doc.fontSize(12).text(`Name: ${student.name}`);
      doc.text(`Father's Name: ${student.fatherName}`);
      doc.text(`Class: ${student.className}`);
      doc.text(`Residential: ${student.residential ? 'Yes' : 'No'}`);
      doc.text(`Attendance: ${student.attendancePercent}%`);
      doc.moveDown();
      doc.text("Academic Performance:", { underline: true });
      doc.text("Currently unavailable as grades are not fully tracked yet.");
    });
  } catch (error) {
    res.status(500).json({ message: "Error generating PDF", error: error.message });
  }
};

exports.generateFinanceSummary = async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ date: -1 });
    
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(tx => {
      if (tx.type === "income") totalIncome += tx.amount;
      if (tx.type === "expense") totalExpense += tx.amount;
    });

    const currentBalance = totalIncome - totalExpense;

    generatePDF(res, "Finance Summary", (doc) => {
      doc.fontSize(12);
      doc.text(`Total Income: Rs ${totalIncome}`, { continued: true }).text(` | Total Expense: Rs ${totalExpense}`, { align: "right" });
      doc.moveDown();
      doc.fontSize(14).text(`Current Balance: Rs ${currentBalance}`, { underline: true });
      doc.moveDown(2);
      
      doc.fontSize(12).text("Recent Transactions", { underline: true });
      doc.moveDown();
      
      transactions.slice(0, 20).forEach(tx => {
        doc.text(`${new Date(tx.date).toLocaleDateString()} - ${tx.description}`);
        doc.text(`Type: ${tx.type.toUpperCase()} | Amount: Rs ${tx.amount}`, { align: "right" });
        doc.moveDown(0.5);
      });
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

    // Human-readable filter block for the PDF header (no raw query keys)
    const pdfFilters = {
      Student : `${student.name}${student.rollNumber ? ` (Roll ${student.rollNumber})` : ""}`,
      Class   : student.className,
      Period  : periodLabel,
    };

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
           .text("No attendance records found for the selected period.", 50, doc.y, { align: "center" });
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

    }, pdfFilters);

  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ message: error.message || "Error generating Student Attendance PDF" });
  }
};
