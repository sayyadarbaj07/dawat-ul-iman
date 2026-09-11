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
const { verifyTeacherClassAccess } = require("../middleware/authMiddleware");
const urduPdfHelper = require("../utils/pdf/urduPdfHelper");
const numberToWords = require("../utils/pdf/numberToWords");

const PDF_FONT_PATHS = {
  english: "Helvetica",
  englishBold: "Helvetica-Bold",
  urdu: path.join(__dirname, "../utils/pdf/fonts/Amiri-Regular.ttf")
};

const URDU_LABELS = {
  title: "دعوتِ ایمان مدرسہ",
  reportCard: "طالب علم کی مارک شیٹ",
  profile: "طالب علم کا پروفائل",
  name: "نام",
  rollNumber: "رول نمبر",
  className: "کلاس",
  academicYear: "تعلیمی سال",
  examDetails: "امتحان کی تفصیلات",
  examName: "امتحان کا نام",
  examType: "امتحان کی قسم",
  subject: "مضمون",
  maxMarks: "کل نمبر",
  obtainedMarks: "حاصل کردہ نمبر",
  totalMarks: "کل نمبر",
  obtained: "حاصل کردہ",
  percentage: "فیصد",
  grade: "گریڈ",
  result: "نتیجہ",
  pass: "پاس",
  fail: "فیل",
  absent: "غیر حاضر"
};

/**
 * Resolves the PDF language: only "en" is explicitly English;
 * absent, "ur", or any other value → "ur" (Urdu default).
 */
function resolvePdfLanguage(rawLanguage) {
  return rawLanguage === "en" ? "en" : "ur";
}

// PDF generation utility
const generatePDF = (res, title, generateContent, filters = null, options = {}) => {
  const doc = new PDFDocument({ margin: 50 });
  
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${title.replace(/\s+/g, "_")}.pdf"`);
  
  doc.pipe(res);
  
  const isUrdu = options.language === 'ur';

  // Header
  if (isUrdu) {
    if (fs.existsSync(PDF_FONT_PATHS.urdu)) {
      doc.registerFont("UrduFont", PDF_FONT_PATHS.urdu);
    } else {
      doc.registerFont("UrduFont", "Helvetica"); // Fallback
    }

    doc.font("UrduFont");
    urduPdfHelper.drawTextRTL(doc, "دعوتِ ایمان مدرسہ", 550, doc.y, { font: "UrduFont", fontSize: 24, align: "right" });
    doc.moveDown(0.5);
    urduPdfHelper.drawTextRTL(doc, "123 Islamic Center Road, Cityville, State 12345", 550, doc.y, { font: "Helvetica", fontSize: 10, align: "right" });
    urduPdfHelper.drawTextRTL(doc, "Phone: +1 234 567 8900 | Email: contact@dawatuliman.edu", 550, doc.y, { font: "Helvetica", fontSize: 10, align: "right" });
    doc.moveDown(0.5);
    urduPdfHelper.drawTextRTL(doc, options.translatedTitle || title, 550, doc.y, { font: "UrduFont", fontSize: 16, align: "right" });
    
    doc.moveDown(0.5);
    urduPdfHelper.drawTextRTL(doc, `${new Date().getFullYear()}-${new Date().getFullYear() + 1} :${URDU_LABELS.academicYear}`, 550, doc.y, { font: "UrduFont", fontSize: 9 });
    doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 50, doc.y - 12, { font: "Helvetica", fontSize: 9 }); // LTR default drawing for the date on the left
    
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
  } else {
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
  }


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

    const hasAccess = await verifyTeacherClassAccess(req.user, student.classId, student.studentClass || student.className);
    if (!hasAccess) return res.status(403).json({ message: "Unauthorized to access this student's report card" });

    const examIdParam = req.query.examId;
    const language = resolvePdfLanguage(req.query.language);
    if (!examIdParam) return res.status(400).json({ message: "examId or examType query parameter is required" });

    let exam;
    if (examIdParam.match(/^[0-9a-fA-F]{24}$/)) {
        exam = await Exam.findById(examIdParam);
    } else {
        // It's an examType like 'monthly', find the latest for this class
        let examQuery = { examType: examIdParam };
        if (student.classId) {
            examQuery.$or = [{ classId: student.classId }, { class: student.studentClass || student.className }];
        } else {
            examQuery.class = student.studentClass || student.className;
        }
        exam = await Exam.findOne(examQuery).sort({ createdAt: -1 });
    }

    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const examResults = await ExamResult.find({ examId: exam._id, studentId: student._id });

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

    const isUrdu = language === 'ur';
    generatePDF(res, `Student Marksheet`, (doc) => {
      
      
      if (isUrdu) {
        if (fs.existsSync(PDF_FONT_PATHS.urdu)) {
          doc.registerFont("UrduFont", PDF_FONT_PATHS.urdu);
        } else {
          doc.registerFont("UrduFont", "Helvetica"); // Fallback
        }
      }

      const fontRegular = isUrdu ? "UrduFont" : PDF_FONT_PATHS.english;
      const fontBold = isUrdu ? "UrduFont" : PDF_FONT_PATHS.englishBold;
      
      const RIGHT_MARGIN = 550;
      const LEFT_MARGIN = 50;



      const titleText = isUrdu ? URDU_LABELS.reportCard : "STUDENT PROFILE";

      if (isUrdu) {
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.profile, RIGHT_MARGIN, doc.y, { font: fontBold, fontSize: 14 });
        doc.moveDown(0.5);
        
        doc.fontSize(12).font(fontRegular);
        const nameVal = student.nameUrdu || student.fullName || student.name;
        urduPdfHelper.drawTextRTL(doc, `${nameVal} :${URDU_LABELS.name}`, RIGHT_MARGIN, doc.y, { font: fontRegular, fontSize: 12 });
        urduPdfHelper.drawTextRTL(doc, `${student.rollNumber || "—"} :${URDU_LABELS.rollNumber}`, RIGHT_MARGIN, doc.y, { font: fontRegular, fontSize: 12 });
        urduPdfHelper.drawTextRTL(doc, `${student.studentClass || student.className} :${URDU_LABELS.className}`, RIGHT_MARGIN, doc.y, { font: fontRegular, fontSize: 12 });
        urduPdfHelper.drawTextRTL(doc, `${exam.academicYear} :${URDU_LABELS.academicYear}`, RIGHT_MARGIN, doc.y, { font: fontRegular, fontSize: 12 });
        doc.moveDown();

        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.examDetails, RIGHT_MARGIN, doc.y, { font: fontBold, fontSize: 14 });
        doc.moveDown(0.5);
        
        doc.fontSize(12).font(fontRegular);
        urduPdfHelper.drawTextRTL(doc, `${exam.name || exam.examName || "Unnamed Exam"} :${URDU_LABELS.examName}`, RIGHT_MARGIN, doc.y, { font: fontRegular, fontSize: 12 });
        urduPdfHelper.drawTextRTL(doc, `${exam.examType} :${URDU_LABELS.examType}`, RIGHT_MARGIN, doc.y, { font: fontRegular, fontSize: 12 });
        doc.moveDown();
      } else {
        doc.fontSize(14).font(fontBold).text("STUDENT PROFILE", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).font(fontRegular);
        doc.text(`Name: ${student.fullName || student.name}`);
        doc.text(`Roll Number: ${student.rollNumber || "—"}`);
        doc.text(`Class: ${student.studentClass || student.className}`);
        doc.text(`Academic Year: ${exam.academicYear}`);
        doc.moveDown();

        doc.fontSize(14).font(fontBold).text("EXAM DETAILS", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).font(fontRegular);
        doc.text(`Exam Name: ${exam.name || exam.examName || "Unnamed Exam"}`);
        doc.text(`Exam Type: ${exam.examType}`);
        doc.moveDown();
      }

      // Subjects Table Header
      const tableTop = doc.y;
      
      // We will define columns for LTR: [Subj: 50, Max: 250, Obt: 400]
      // For RTL: [Subj: RIGHT_MARGIN(550) -> 400, Max: 250, Obt: 50]
      if (isUrdu) {
        doc.font(fontBold).fontSize(12);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.subject, RIGHT_MARGIN, tableTop);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.maxMarks, 300, tableTop);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.obtainedMarks, 150, tableTop);
        doc.moveTo(LEFT_MARGIN, tableTop + 20).lineTo(RIGHT_MARGIN, tableTop + 20).stroke();
        
        let y = tableTop + 30;
        doc.font(fontRegular);
        
        exam.subjects.forEach(sub => {
          urduPdfHelper.drawTextRTL(doc, sub, RIGHT_MARGIN, y);
          urduPdfHelper.drawTextRTL(doc, exam.maxMarks.toString(), 300, y);
          const m = subjectMarks[sub];
          const mStr = m === null || m === "Absent" ? URDU_LABELS.absent : m.toString();
          urduPdfHelper.drawTextRTL(doc, mStr, 150, y);
          y += 25;
        });

        doc.moveTo(LEFT_MARGIN, y).lineTo(RIGHT_MARGIN, y).stroke();
        y += 15;

        // Summary
        doc.font(fontBold);
        urduPdfHelper.drawTextRTL(doc, `${totalMarks} :${URDU_LABELS.totalMarks}`, RIGHT_MARGIN, y);
        urduPdfHelper.drawTextRTL(doc, `${obtainedMarks} :${URDU_LABELS.obtained}`, 300, y);
        y += 25;
        urduPdfHelper.drawTextRTL(doc, `${percentage.toFixed(2)}% :${URDU_LABELS.percentage}`, RIGHT_MARGIN, y);
        urduPdfHelper.drawTextRTL(doc, `${grade} :${URDU_LABELS.grade}`, 300, y);
        y += 25;
        const resultStr = hasFailed ? URDU_LABELS.fail : URDU_LABELS.pass;
        urduPdfHelper.drawTextRTL(doc, `${resultStr} :${URDU_LABELS.result}`, RIGHT_MARGIN, y);

      } else {
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
      }
    }, null, { language: isUrdu ? 'ur' : 'en', translatedTitle: URDU_LABELS.reportCard });
  } catch (error) {
    res.status(500).json({ message: "Error generating PDF", error: error.message });
  }
};
exports.generateClassResultPDF = async (req, res) => {
  try {
    const { examId, class: className, examType } = req.query;
    const language = resolvePdfLanguage(req.query.language);
    const isUrdu = language === "ur";
    let exam;
    
    if (examId) {
      exam = await Exam.findById(examId);
    } else if (className && examType) {
      let examQuery = { examType };
      if (className.match(/^[0-9a-fA-F]{24}$/)) {
        const mongoose = require("mongoose");
        examQuery.$or = [{ classId: new mongoose.Types.ObjectId(className) }, { class: className }];
      } else {
        examQuery.class = className;
      }
      exam = await Exam.findOne(examQuery).sort({ createdAt: -1 });
    }

    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const hasAccess = await verifyTeacherClassAccess(req.user, exam.classId, exam.class);
    if (!hasAccess) {
      return res.status(403).json({ message: "You are not authorized to export results for this class" });
    }

    const query = {
      $or: [{ studentClass: exam.class }, { className: exam.class }]
    };
    if (exam.classId) {
      query.$or.push({ classId: exam.classId });
    }
    const students = await Student.find(query).lean();

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
        name: isUrdu ? (student.nameUrdu || student.fullName || student.name) : (student.fullName || student.name),
        nameUrdu: student.nameUrdu,
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
      if (isUrdu) {
        if (fs.existsSync(PDF_FONT_PATHS.urdu)) {
          doc.registerFont("UrduFont", PDF_FONT_PATHS.urdu);
        } else {
          doc.registerFont("UrduFont", "Helvetica");
        }
        const RIGHT_MARGIN = 550;
        const LEFT_MARGIN = 50;
        
        doc.fontSize(12).font("UrduFont");
        urduPdfHelper.drawTextRTL(doc, `${exam.name || exam.examName || "Unnamed"} (${exam.examType}) :${URDU_LABELS.examName}`, RIGHT_MARGIN, doc.y);
        urduPdfHelper.drawTextRTL(doc, `${exam.academicYear} :${URDU_LABELS.academicYear}`, RIGHT_MARGIN, doc.y);
        doc.moveDown();

        const tableTop = doc.y;
        doc.font("UrduFont").fontSize(10);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.rollNumber, RIGHT_MARGIN, tableTop);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.name, RIGHT_MARGIN - 60, tableTop);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.obtainedMarks, 280, tableTop);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.percentage, 180, tableTop);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.grade, 120, tableTop);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.status, LEFT_MARGIN, tableTop);
        
        doc.moveTo(LEFT_MARGIN, tableTop + 20).lineTo(RIGHT_MARGIN, tableTop + 20).stroke();

        let y = tableTop + 25;
        
        calculated.forEach(c => {
          if (y > 700) {
            doc.addPage();
            y = 50;
          }
          doc.font("Helvetica").fontSize(9);
          // Roll No, Percentage, Grade, Status can use default layout mixed
          doc.text(c.rollNumber || "-", RIGHT_MARGIN - 40, y);
          doc.text(`${c.obtainedMarks}/${c.totalMarks}`, 220, y);
          doc.text(c.percentage, 160, y);
          doc.text(c.grade, 100, y);
          
          doc.font("UrduFont");
          const statusStr = c.status === "Pass" ? URDU_LABELS.pass : URDU_LABELS.fail;
          urduPdfHelper.drawTextRTL(doc, statusStr, LEFT_MARGIN + 30, y);
          urduPdfHelper.drawTextRTL(doc, c.name, RIGHT_MARGIN - 60, y);
          
          y += 20;
        });

      } else {
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
      }
    }, null, { language: isUrdu ? 'ur' : 'en', translatedTitle: "کلاس کا نتیجہ" });
  } catch (error) {
    res.status(500).json({ message: "Error generating class result PDF", error: error.message });
  }
};

exports.generateClassMarksheetsPDF = async (req, res) => {
  try {
    const { class: className, examType } = req.query;
    const language = resolvePdfLanguage(req.query.language);
    const isUrdu = language === "ur";
    if (!className || !examType) return res.status(400).json({ message: "class and examType are required" });

    let examQuery = { examType };
    if (className.match(/^[0-9a-fA-F]{24}$/)) {
      const mongoose = require("mongoose");
      examQuery.$or = [{ classId: new mongoose.Types.ObjectId(className) }, { class: className }];
    } else {
      examQuery.class = className;
    }
    const exam = await Exam.findOne(examQuery).sort({ createdAt: -1 });
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const hasAccess = await verifyTeacherClassAccess(req.user, exam.classId, exam.class);
    if (!hasAccess) {
      return res.status(403).json({ message: "You are not authorized to export results for this class" });
    }

    const query = {
      $or: [{ studentClass: exam.class }, { className: exam.class }]
    };
    if (exam.classId) {
      query.$or.push({ classId: exam.classId });
    }
    const students = await Student.find(query).lean();

    if (students.length === 0) {
      return res.status(404).json({ message: "No students found in this class" });
    }

    // Sort students
    students.sort((a, b) => {
      if (a.rollNumber && b.rollNumber) return String(a.rollNumber).localeCompare(String(b.rollNumber));
      return a.name.localeCompare(b.name);
    });

    const results = await ExamResult.find({ examId: exam._id }).lean();

    generatePDF(res, `Student Marksheets - ${exam.class}`, (doc) => {
      let isFirstPage = true;

      students.forEach((student, index) => {
        if (!isFirstPage) {
          doc.addPage();
        }
        isFirstPage = false;

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

        
        const RIGHT_MARGIN = 550;
        const LEFT_MARGIN = 50;
        
        if (isUrdu) {
          if (fs.existsSync(PDF_FONT_PATHS.urdu)) {
            doc.registerFont("UrduFont", PDF_FONT_PATHS.urdu);
          } else {
            doc.registerFont("UrduFont", "Helvetica");
          }
          const fontRegular = "UrduFont";
          const fontBold = "UrduFont";

          urduPdfHelper.drawTextRTL(doc, URDU_LABELS.profile, RIGHT_MARGIN, doc.y, { font: fontBold, fontSize: 14 });
          doc.moveDown(0.5);
          
          doc.fontSize(12).font(fontRegular);
          const nameVal = student.nameUrdu || student.fullName || student.name;
          urduPdfHelper.drawTextRTL(doc, `${nameVal} :${URDU_LABELS.name}`, RIGHT_MARGIN, doc.y, { font: fontRegular, fontSize: 12 });
          urduPdfHelper.drawTextRTL(doc, `${student.rollNumber || "—"} :${URDU_LABELS.rollNumber}`, RIGHT_MARGIN, doc.y, { font: fontRegular, fontSize: 12 });
          urduPdfHelper.drawTextRTL(doc, `${student.studentClass || student.className} :${URDU_LABELS.className}`, RIGHT_MARGIN, doc.y, { font: fontRegular, fontSize: 12 });
          urduPdfHelper.drawTextRTL(doc, `${exam.academicYear} :${URDU_LABELS.academicYear}`, RIGHT_MARGIN, doc.y, { font: fontRegular, fontSize: 12 });
          doc.moveDown();

          urduPdfHelper.drawTextRTL(doc, URDU_LABELS.examDetails, RIGHT_MARGIN, doc.y, { font: fontBold, fontSize: 14 });
          doc.moveDown(0.5);
          
          doc.fontSize(12).font(fontRegular);
          urduPdfHelper.drawTextRTL(doc, `${exam.name || exam.examName || "Unnamed Exam"} :${URDU_LABELS.examName}`, RIGHT_MARGIN, doc.y, { font: fontRegular, fontSize: 12 });
          urduPdfHelper.drawTextRTL(doc, `${exam.examType} :${URDU_LABELS.examType}`, RIGHT_MARGIN, doc.y, { font: fontRegular, fontSize: 12 });
          doc.moveDown();

          const tableTop = doc.y;
          doc.font(fontBold).fontSize(12);
          urduPdfHelper.drawTextRTL(doc, URDU_LABELS.subject, RIGHT_MARGIN, tableTop);
          urduPdfHelper.drawTextRTL(doc, URDU_LABELS.maxMarks, 300, tableTop);
          urduPdfHelper.drawTextRTL(doc, URDU_LABELS.obtainedMarks, 150, tableTop);
          doc.moveTo(LEFT_MARGIN, tableTop + 20).lineTo(RIGHT_MARGIN, tableTop + 20).stroke();
          
          let y = tableTop + 30;
          doc.font(fontRegular);
          
          exam.subjects.forEach(sub => {
            urduPdfHelper.drawTextRTL(doc, sub, RIGHT_MARGIN, y);
            urduPdfHelper.drawTextRTL(doc, exam.maxMarks.toString(), 300, y);
            const m = subjectMarks[sub];
            const mStr = m === null || m === "Absent" ? URDU_LABELS.absent : m.toString();
            urduPdfHelper.drawTextRTL(doc, mStr, 150, y);
            y += 25;
          });

          doc.moveTo(LEFT_MARGIN, y).lineTo(RIGHT_MARGIN, y).stroke();
          y += 15;

          doc.font(fontBold);
          urduPdfHelper.drawTextRTL(doc, `${totalMarks} :${URDU_LABELS.totalMarks}`, RIGHT_MARGIN, y);
          urduPdfHelper.drawTextRTL(doc, `${obtainedMarks} :${URDU_LABELS.obtained}`, 300, y);
          y += 25;
          urduPdfHelper.drawTextRTL(doc, `${percentage.toFixed(2)}% :${URDU_LABELS.percentage}`, RIGHT_MARGIN, y);
          urduPdfHelper.drawTextRTL(doc, `${grade} :${URDU_LABELS.grade}`, 300, y);
          y += 25;
          const resultStr = hasFailed ? URDU_LABELS.fail : URDU_LABELS.pass;
          urduPdfHelper.drawTextRTL(doc, `${resultStr} :${URDU_LABELS.result}`, RIGHT_MARGIN, y);

        } else {
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
        }
      });
    }, null, { language: isUrdu ? 'ur' : 'en', translatedTitle: URDU_LABELS.reportCard });
  } catch (error) {
    res.status(500).json({ message: "Error generating class marksheets PDF", error: error.message });
  }
};

exports.generateFinanceSummary = async (req, res) => {
  try {
    const { startDate, endDate, academicYear, status, type } = req.query;
    const language = resolvePdfLanguage(req.query.language);
    const isUrdu = language === 'ur';

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
      const RIGHT_MARGIN = 550;
      const LEFT_MARGIN = 50;

      if (isUrdu) {
        if (fs.existsSync(PDF_FONT_PATHS.urdu)) {
          doc.registerFont("UrduFont", PDF_FONT_PATHS.urdu);
        } else {
          doc.registerFont("UrduFont", "Helvetica");
        }

        const fontRegular = "UrduFont";
        const fontBold = "UrduFont";

        doc.fontSize(10).font(fontRegular);
        urduPdfHelper.drawTextRTL(doc, `${dateStr} :مقررہ مدت`, RIGHT_MARGIN, doc.y);
        if (academicYear) {
          urduPdfHelper.drawTextRTL(doc, `${academicYear} :تعلیمی سال`, RIGHT_MARGIN, doc.y);
        }
        doc.moveDown();

        // Summary Header
        doc.fontSize(12).font(fontBold);
        const ySummary = doc.y;
        urduPdfHelper.drawTextRTL(doc, `${totalIncome} Rs :کل آمدنی`, RIGHT_MARGIN, ySummary);
        urduPdfHelper.drawTextRTL(doc, `${totalExpense} Rs :کل اخراجات`, LEFT_MARGIN + 150, ySummary);
        doc.moveDown();
        
        urduPdfHelper.drawTextRTL(doc, `${currentBalance} Rs :موجودہ بیلنس`, RIGHT_MARGIN, doc.y, { font: fontBold, fontSize: 14 });
        doc.moveDown(2);
        
        // Transactions Table
        const tableTop = doc.y;
        doc.fontSize(10).font(fontBold);
        
        urduPdfHelper.drawTextRTL(doc, "تاریخ", RIGHT_MARGIN, tableTop);
        urduPdfHelper.drawTextRTL(doc, "تفصیل", 460, tableTop);
        urduPdfHelper.drawTextRTL(doc, "زمرہ", 260, tableTop);
        urduPdfHelper.drawTextRTL(doc, "طریقہ", 180, tableTop);
        urduPdfHelper.drawTextRTL(doc, "رقم", 80, tableTop);
        
        doc.moveTo(LEFT_MARGIN, tableTop + 15).lineTo(RIGHT_MARGIN, tableTop + 15).stroke();
        
        let y = tableTop + 20;
        
        transactions.forEach(tx => {
          if (y > 700) {
            doc.addPage();
            y = 50;
          }
          
          const txDate = new Date(tx.date).toLocaleDateString();
          doc.fillColor(tx.type === "income" ? "green" : "red");
          
          doc.font("Helvetica").fontSize(10);
          doc.text(txDate, RIGHT_MARGIN - 50, y);
          
          doc.font(fontRegular);
          urduPdfHelper.drawTextRTL(doc, tx.description || "", 460, y, { width: 170 });
          urduPdfHelper.drawTextRTL(doc, tx.category || "-", 260, y);
          doc.font("Helvetica");
          doc.text(tx.paymentMode || "Cash", 120, y);
          
          const sign = tx.type === "income" ? "+" : "-";
          doc.text(`${sign} Rs ${tx.amount}`, 50, y);
          
          y += 15;
        });

        doc.fillColor("black");

      } else {
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
      }
    }, null, { language: isUrdu ? 'ur' : 'en', translatedTitle: "مالیاتی رپورٹ" });
  } catch (error) {
    res.status(500).json({ message: "Error generating Finance PDF", error: error.message });
  }
};

exports.generateFeeReceiptPDF = async (req, res) => {
  try {
    const language = resolvePdfLanguage(req.query.language);
    const isUrdu = language === 'ur';
    const tx = await Transaction.findById(req.params.id)
      .populate("recordedBy", "name")
      .populate("referenceId")
      .populate("classId")
      .lean();

    if (!tx) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const doc = new PDFDocument({ 
      size: [600, 315],
      margin: 0,
      autoFirstPage: true
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Receipt_${tx._id}.pdf"`);
    doc.pipe(res);

    // Font Configuration
    const englishFont = "Helvetica";
    const englishBold = "Helvetica-Bold";
    let urduFont = "Helvetica";
    if (fs.existsSync(PDF_FONT_PATHS.urdu)) {
      doc.registerFont("UrduFont", PDF_FONT_PATHS.urdu);
      urduFont = "UrduFont";
    }

    const w = 600;
    const h = 315;
    
    // Draw Ornate Border (Double blue line)
    doc.lineWidth(3).strokeColor("#3b5998");
    doc.rect(10, 10, w - 20, h - 20).stroke();
    doc.lineWidth(1).strokeColor("#3b5998");
    doc.rect(14, 14, w - 28, h - 28).stroke();
    
    // Inner decorative corner arcs
    doc.lineWidth(0.5);
    doc.path("M 20 20 Q 30 20 30 30").stroke();
    doc.path("M 580 20 Q 570 20 570 30").stroke();
    doc.path("M 20 295 Q 30 295 30 285").stroke();
    doc.path("M 580 295 Q 570 295 570 285").stroke();

    // Rest of drawing colors reset to black
    doc.fillColor("black").strokeColor("black");

    // === HEADER ===
    
    // LEFT Header
    doc.fontSize(12).font(englishBold).fillColor("#3b5998").text("JAMIA", 25, 25);
    doc.fontSize(22).font(englishBold).fillColor("#d91176").text("DAWAT-UL-EIMAN", 25, 40);
    
    doc.fontSize(7).font(englishFont).fillColor("black");
    doc.text("6 Minar Masjid, Roshanpura, Hazrat Balepeer, Beed", 25, 65, { lineBreak: false });
    doc.text("431122 (MS), : 8446124215 / 9011115313 / 8999020106", 25, 75, { lineBreak: false });
    
    // Top Registration text
    doc.fontSize(7).font(englishBold);
    doc.text("Reg.No.: F-0027800(BED)", 150, 25, { lineBreak: false });

    // RIGHT Header (Urdu)
    doc.font(urduFont);
    // Green and Magenta split - for simplicity we render it in green
    doc.fillColor("#059669");
    urduPdfHelper.drawTextRTL(doc, "جامعہ دعوۃ الایمان", 575, 25, { font: urduFont, fontSize: 32 });
    
    doc.fillColor("black");
    urduPdfHelper.drawTextRTL(doc, "چھ مینار مسجد، روشن پورہ، حضرت بالے پیر بیڑ(مہاراشٹر)", 575, 70, { font: urduFont, fontSize: 11 });

    // CENTER Logo
    const logoPath = path.join(__dirname, "../../../client/public/logo1.jpeg");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 255, 18, { width: 90 });
    }

    // === META ===
    doc.font(englishFont).fontSize(10);
    const receiptNo = tx.receiptId || tx._id.toString().slice(-6).toUpperCase();
    doc.text(`No.: ${receiptNo}`, 25, 105, { lineBreak: false });
    
    doc.text(`Date: ${new Date(tx.date).toLocaleDateString()}`, 330, 105, { lineBreak: false });

    // === BODY ===
    // Lines
    doc.lineWidth(1).strokeColor("black");
    doc.moveTo(25, 140).lineTo(575, 140).stroke(); // Name
    doc.moveTo(25, 175).lineTo(575, 175).stroke(); // Address
    doc.moveTo(25, 215).lineTo(575, 215).stroke(); // Amount
    
    doc.font(urduFont).fontSize(12);
    
    // Line 1: Name
    urduPdfHelper.drawTextRTL(doc, "اسم گرامی معطی", 575, 125);
    // Explicitly left blank per verified semantics (no explicit donorName field in Transaction schema)
    
    // Line 2: Address
    urduPdfHelper.drawTextRTL(doc, "مکمل پتہ:", 575, 160);
    // Leave address blank as per instructions (no field in schema)
    
    // Line 3: Amount in words
    urduPdfHelper.drawTextRTL(doc, "رقم / اشیاء عبارت میں", 575, 200);
    urduPdfHelper.drawTextRTL(doc, "بمد", 350, 200);
    urduPdfHelper.drawTextRTL(doc, "بشکریہ وصول ہوئے۔", 130, 200);

    const amountInWords = numberToWords(tx.amount, isUrdu ? "ur" : "en");
    urduPdfHelper.drawTextRTL(doc, amountInWords, 460, 200);
    
    const purpose = tx.description || tx.category || "";
    urduPdfHelper.drawTextRTL(doc, purpose.substring(0, 40), 320, 200);

    // === AMOUNT BOX ===
    const boxY = 240;
    // Magenta "Rs." Box
    doc.fillColor("#d91176").rect(25, boxY, 40, 25).fill();
    doc.fillColor("white").font(englishBold).fontSize(14).text("Rs.", 32, boxY + 6);
    
    // White Box with border for amount
    doc.lineWidth(1).strokeColor("#3b5998").fillColor("white");
    doc.rect(65, boxY, 120, 25).fillAndStroke();
    doc.fillColor("black").font(englishBold).fontSize(14).text(tx.amount.toString(), 75, boxY + 6, { lineBreak: false });

    // === SIGNATURES ===
    doc.font(urduFont).fontSize(12);
    
    // Center signature
    urduPdfHelper.drawTextRTL(doc, "دستخط وصول کنندہ", 350, 275);
    
    // Using UrduFont for Jazak Allah to be safe
    doc.font(urduFont).fontSize(12);
    urduPdfHelper.drawTextRTL(doc, "جزاک اللہ", 400, 245);
    
    // Right signature
    urduPdfHelper.drawTextRTL(doc, "دستخط صدر", 150, 275);

    doc.end();

  } catch (error) {
    res.status(500).json({ message: "Error generating Finance Receipt PDF", error: error.message });
  }
};

exports.generateWeakStudentsReport = async (req, res) => {
  try {
    const { class: className } = req.query;
    const language = resolvePdfLanguage(req.query.language);
    const isUrdu = language === 'ur';
    
    const initialMatch = { status: "active" };
    if (className && className !== "all") {
      initialMatch.$or = [{ studentClass: className }, { className: className }];
      if (className.match(/^[0-9a-fA-F]{24}$/)) {
        const mongoose = require("mongoose");
        initialMatch.$or.push({ classId: new mongoose.Types.ObjectId(className) });
      }
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
                cond: { $lt: ["$result.marks", 33] }
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
          nameUrdu: 1,
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
      
      if (isUrdu) {
        if (fs.existsSync(PDF_FONT_PATHS.urdu)) {
          doc.registerFont("UrduFont", PDF_FONT_PATHS.urdu);
        } else {
          doc.registerFont("UrduFont", "Helvetica");
        }

        const fontRegular = "UrduFont";
        const fontBold = "UrduFont";
        
        doc.fontSize(10).font(fontBold);
        
        urduPdfHelper.drawTextRTL(doc, "نمبر شمار", 550, y);
        urduPdfHelper.drawTextRTL(doc, "آئی ڈی", 515, y);
        urduPdfHelper.drawTextRTL(doc, "نام", 460, y);
        urduPdfHelper.drawTextRTL(doc, "کلاس", 350, y);
        urduPdfHelper.drawTextRTL(doc, "اوسط فیصد", 280, y);
        urduPdfHelper.drawTextRTL(doc, "حاضری فیصد", 225, y);
        urduPdfHelper.drawTextRTL(doc, "فیل مضامین", 165, y);
        urduPdfHelper.drawTextRTL(doc, "وجہ", 100, y);
        
        doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
        
        y += 20;
        
        if (weakStudents.length === 0) {
          doc.font(fontRegular);
          urduPdfHelper.drawTextRTL(doc, "منتخب کردہ معیار کے لیے کوئی کمزور طالب علم نہیں ملا۔", 300, y);
          return;
        }

        weakStudents.forEach((student, index) => {
          if (y > 700) {
            doc.addPage();
            y = 50;
          }
          
          doc.font("Helvetica");
          doc.text((index + 1).toString(), 550 - 20, y);
          doc.text((student.studentId || "N/A"), 515 - 40, y);
          
          const urduName = student.nameUrdu || student.name || "";
          doc.font(fontRegular);
          urduPdfHelper.drawTextRTL(doc, urduName, 460, y);
          urduPdfHelper.drawTextRTL(doc, (student.className || ""), 350, y);
          
          doc.font("Helvetica");
          doc.text((student.averageMarks || 0).toString() + "%", 280 - 30, y);
          doc.text((student.attendancePercent || 0).toString() + "%", 225 - 30, y);
          doc.text((student.failedSubjectsCount || 0).toString(), 165 - 20, y);
          
          // Map reasons
          const reasonsMap = {
            "Low Attendance": "حاضری کم",
            "Low Avg": "اوسط کم",
            "Failed Subj": "مضامین میں فیل"
          };
          const translatedReasons = (student.reasons || []).map(r => reasonsMap[r] || r).join("، ");
          
          doc.font(fontRegular);
          urduPdfHelper.drawTextRTL(doc, translatedReasons, 100, y);
          
          y += 15;
        });

      } else {
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
      }
    }, null, { language: isUrdu ? 'ur' : 'en', translatedTitle: "کمزور طلباء کی رپورٹ" });
  } catch (error) {
    res.status(500).json({ message: "Error generating PDF", error: error.message });
  }
};

exports.generateClassAttendancePDF = async (req, res) => {
  try {
    const { className, month, year, startDate, endDate } = req.query;
    const language = resolvePdfLanguage(req.query.language);
    const isUrdu = language === "ur";
    
    // The class parameter comes from req.query.className.
    // checkClassAccess middleware handles the RBAC before reaching here,
    // but just to be safe, we will leave the middleware check as is in the routes.
    // We can clean this redundant check up since checkClassAccess handles it.
    // If className is an ObjectId string, pass it as classId, otherwise as legacyClassName
    let cId = null;
    let cName = className;
    if (className && className.match(/^[0-9a-fA-F]{24}$/)) {
      cId = className;
      cName = null;
    }
    const hasAccess = await verifyTeacherClassAccess(req.user, cId, cName);
    if (!hasAccess) {
      return res.status(403).json({ message: "Forbidden: Not assigned to this class" });
    }

    let matchQuery = { userType: "Student" };
    let studentMatchQuery = { status: "active" };
    if (cId) {
      const mongoose = require("mongoose");
      matchQuery.classId = new mongoose.Types.ObjectId(cId);
      studentMatchQuery.classId = matchQuery.classId;
    } else {
      matchQuery.className = cName;
      studentMatchQuery.className = cName;
    }
    
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
    const students = await Student.find(studentMatchQuery).sort({ rollNumber: 1, name: 1 });
    
    // Fetch all relevant attendance records
    const attendanceRecords = await Attendance.find(matchQuery);

    generatePDF(res, "Class Attendance Summary", (doc) => {
      let y = doc.y;
      const RIGHT_MARGIN = 550;
      const LEFT_MARGIN = 50;
      
      if (isUrdu) {
        if (fs.existsSync(PDF_FONT_PATHS.urdu)) {
          doc.registerFont("UrduFont", PDF_FONT_PATHS.urdu);
        } else {
          doc.registerFont("UrduFont", "Helvetica");
        }
        const fontRegular = "UrduFont";
        const fontBold = "UrduFont";

        doc.fontSize(10).font(fontBold);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.rollNumber, RIGHT_MARGIN, y);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.name, RIGHT_MARGIN - 40, y);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.totalMarks, RIGHT_MARGIN - 200, y);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.present, RIGHT_MARGIN - 260, y);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.absent, RIGHT_MARGIN - 330, y);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.late, RIGHT_MARGIN - 400, y);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.percentage, RIGHT_MARGIN - 460, y);
        
        doc.moveTo(LEFT_MARGIN, y + 15).lineTo(RIGHT_MARGIN, y + 15).stroke();
        
        y += 20;
        doc.font(fontRegular);
        
        if (students.length === 0) {
          urduPdfHelper.drawTextRTL(doc, "اس کلاس میں کوئی طالب علم نہیں ملا۔", RIGHT_MARGIN, y, { align: "center" });
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
          
          const nameVal = student.nameUrdu || student.fullName || student.name || "";
          
          urduPdfHelper.drawTextRTL(doc, (student.rollNumber || "-").toString(), RIGHT_MARGIN, y);
          urduPdfHelper.drawTextRTL(doc, nameVal.substring(0, 30), RIGHT_MARGIN - 40, y);
          urduPdfHelper.drawTextRTL(doc, totalWorkingDays.toString(), RIGHT_MARGIN - 200, y);
          urduPdfHelper.drawTextRTL(doc, present.toString(), RIGHT_MARGIN - 260, y);
          urduPdfHelper.drawTextRTL(doc, absent.toString(), RIGHT_MARGIN - 330, y);
          urduPdfHelper.drawTextRTL(doc, late.toString(), RIGHT_MARGIN - 400, y);
          urduPdfHelper.drawTextRTL(doc, `${percentage}%`, RIGHT_MARGIN - 460, y);
          
          y += 15;
        });

      } else {
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
      }}, { ...req.query, language: isUrdu ? 'ur' : 'en', translatedTitle: "حاضری رپورٹ" });

  } catch (error) {
    res.status(500).json({ message: "Error generating Class Attendance PDF", error: error.message });
  }
};

exports.generateStudentAttendancePDF = async (req, res) => {
  try {
    const studentId = req.params.id;
    const language = resolvePdfLanguage(req.query.language);
    const isUrdu = language === "ur";

    // Pre-fetch the student to check class membership
    const StudentModel = require("../models/studentModel");
    const studentDoc = await StudentModel.findById(studentId).lean();
    if (!studentDoc) return res.status(404).json({ message: "Student not found" });

    const hasAccess = await verifyTeacherClassAccess(req.user, studentDoc.classId, studentDoc.className || studentDoc.studentClass);
    if (!hasAccess) return res.status(403).json({ message: "Forbidden: Not assigned to this student's class" });

    // All business logic lives in the service
    const { student, records, summary, totalWorkingDays, periodLabel } =
      await getStudentAttendanceForPDF(studentId, req.query);

    const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    generatePDF(res, `Student Attendance Report`, (doc) => {
      const RIGHT_MARGIN = 550;
      const LEFT_MARGIN = 50;

      if (isUrdu) {
        if (fs.existsSync(PDF_FONT_PATHS.urdu)) {
          doc.registerFont("UrduFont", PDF_FONT_PATHS.urdu);
        } else {
          doc.registerFont("UrduFont", "Helvetica");
        }
        const fontRegular = "UrduFont";
        const fontBold = "UrduFont";

        // ── Summary block ──
        doc.fontSize(11).font(fontBold);
        const nameVal = student.nameUrdu || student.fullName || student.name;
        urduPdfHelper.drawTextRTL(doc, `${nameVal} :${URDU_LABELS.student}`, RIGHT_MARGIN, doc.y);
        doc.font(fontRegular).fontSize(10);
        if (student.rollNumber) {
          urduPdfHelper.drawTextRTL(doc, `${student.rollNumber} :${URDU_LABELS.rollNumber}`, RIGHT_MARGIN, doc.y);
        }
        urduPdfHelper.drawTextRTL(doc, `${student.className} :${URDU_LABELS.className}`, RIGHT_MARGIN, doc.y);
        urduPdfHelper.drawTextRTL(doc, `${periodLabel} :مدت`, RIGHT_MARGIN, doc.y);
        doc.moveDown(0.8);

        doc.font(fontBold).fontSize(10);
        urduPdfHelper.drawTextRTL(doc, `${totalWorkingDays} :کل کام کے دن`, RIGHT_MARGIN, doc.y);
        doc.font(fontRegular);
        urduPdfHelper.drawTextRTL(doc, `${summary.present} :${URDU_LABELS.present}`, RIGHT_MARGIN - 200, doc.y - 12);
        urduPdfHelper.drawTextRTL(doc, `${summary.absent} :${URDU_LABELS.absent}`, RIGHT_MARGIN - 300, doc.y - 12);
        urduPdfHelper.drawTextRTL(doc, `${summary.late} :${URDU_LABELS.late}`, RIGHT_MARGIN - 400, doc.y - 12);
        doc.moveDown(0.3);
        
        doc.fontSize(11);
        urduPdfHelper.drawTextRTL(doc, `${summary.percentage}% (${summary.attended} / ${totalWorkingDays}) :${URDU_LABELS.percentage}`, RIGHT_MARGIN, doc.y);

        doc.moveDown(1);
        doc.moveTo(LEFT_MARGIN, doc.y).lineTo(RIGHT_MARGIN, doc.y).stroke();
        doc.moveDown(0.6);

        // ── Date-wise table ──
        if (records.length === 0) {
          doc.font(fontRegular).fontSize(10);
          urduPdfHelper.drawTextRTL(doc, "حاضری کا کوئی ریکارڈ نہیں ملا۔", RIGHT_MARGIN, doc.y);
          return;
        }

        let y = doc.y;
        doc.font(fontBold).fontSize(9);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.date, RIGHT_MARGIN, y);
        urduPdfHelper.drawTextRTL(doc, "دن", RIGHT_MARGIN - 130, y);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.status, RIGHT_MARGIN - 230, y);
        urduPdfHelper.drawTextRTL(doc, "ریمارکس", RIGHT_MARGIN - 320, y);
        y += 14;
        doc.moveTo(LEFT_MARGIN, y).lineTo(RIGHT_MARGIN, y).stroke();
        y += 4;

        doc.font(fontRegular).fontSize(9);

        const DAY_NAMES_URDU = ["اتوار", "پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ"];

        for (const record of records) {
          if (y > 720) {
            doc.addPage();
            y = 50;
            doc.font(fontBold).fontSize(9);
            urduPdfHelper.drawTextRTL(doc, URDU_LABELS.date, RIGHT_MARGIN, y);
            urduPdfHelper.drawTextRTL(doc, "دن", RIGHT_MARGIN - 130, y);
            urduPdfHelper.drawTextRTL(doc, URDU_LABELS.status, RIGHT_MARGIN - 230, y);
            urduPdfHelper.drawTextRTL(doc, "ریمارکس", RIGHT_MARGIN - 320, y);
            y += 14;
            doc.moveTo(LEFT_MARGIN, y).lineTo(RIGHT_MARGIN, y).stroke();
            y += 4;
            doc.font(fontRegular).fontSize(9);
          }

          const d = new Date(record.date);
          const dateStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
          const dayStr = DAY_NAMES_URDU[d.getDay()];

          let translatedStatus = record.status;
          if (record.status === "Present") translatedStatus = URDU_LABELS.present;
          else if (record.status === "Absent") translatedStatus = URDU_LABELS.absent;
          else if (record.status === "Late") translatedStatus = URDU_LABELS.late;

          const statusColors = { Present: "#16a34a", Absent: "#dc2626", Late: "#d97706" };
          
          doc.fillColor("#000000");
          urduPdfHelper.drawTextRTL(doc, dateStr, RIGHT_MARGIN, y);
          urduPdfHelper.drawTextRTL(doc, dayStr, RIGHT_MARGIN - 130, y);
          
          doc.fillColor(statusColors[record.status] || "#000000");
          urduPdfHelper.drawTextRTL(doc, translatedStatus, RIGHT_MARGIN - 230, y);
          
          doc.fillColor("#000000");
          urduPdfHelper.drawTextRTL(doc, record.remarks || "", RIGHT_MARGIN - 320, y);

          y += 15;
        }

        y += 6;
        doc.moveTo(LEFT_MARGIN, y).lineTo(RIGHT_MARGIN, y).stroke();
        y += 6;
        doc.font(fontBold).fontSize(9).fillColor("#000000");
        urduPdfHelper.drawTextRTL(doc, `${records.length} :کل ریکارڈز | ${summary.present} :${URDU_LABELS.present} ${summary.absent} :${URDU_LABELS.absent} ${summary.late} :${URDU_LABELS.late} | ${summary.percentage}% :${URDU_LABELS.percentage}`, RIGHT_MARGIN, y);

      } else {
        // ── Summary block ──
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

        // ── Date-wise table ──
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
        const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        for (const record of records) {
          if (y > 720) {
            doc.addPage();
            y = 50;
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

        y += 6;
        doc.moveTo(50, y).lineTo(550, y).stroke();
        y += 6;
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#000000");
        doc.text(
          `Total: ${records.length} records  |  Present: ${summary.present}  Absent: ${summary.absent}  Late: ${summary.late}  |  Attendance: ${summary.percentage}%`,
          50, y, { width: 500, align: "center" }
        );
      }});

  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ message: error.message || "Error generating Student Attendance PDF" });
  }
};

exports.generateAcademicHistoryPDF = async (req, res) => {
  try {
    const language = resolvePdfLanguage(req.query.language);
    const isUrdu = language === "ur";
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const hasAccess = await verifyTeacherClassAccess(req.user, student.classId, student.studentClass || student.className);
    if (!hasAccess) {
       return res.status(403).json({ message: "Unauthorized to view this student's history" });
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
      
      const RIGHT_MARGIN = 550;
      const LEFT_MARGIN = 50;

      if (isUrdu) {
        if (fs.existsSync(PDF_FONT_PATHS.urdu)) {
          doc.registerFont("UrduFont", PDF_FONT_PATHS.urdu);
        } else {
          doc.registerFont("UrduFont", "Helvetica");
        }

        const fontRegular = "UrduFont";
        const fontBold = "UrduFont";

        doc.fontSize(12).font(fontRegular);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.profile, RIGHT_MARGIN, doc.y, { font: fontBold, fontSize: 14 });
        doc.moveDown(0.5);
        
        const nameVal = student.nameUrdu || student.fullName || student.name;
        urduPdfHelper.drawTextRTL(doc, `${nameVal} :${URDU_LABELS.name}`, RIGHT_MARGIN, doc.y, { font: fontRegular, fontSize: 12 });
        urduPdfHelper.drawTextRTL(doc, `${student.rollNumber || "—"} :${URDU_LABELS.rollNumber}`, RIGHT_MARGIN, doc.y, { font: fontRegular, fontSize: 12 });
        urduPdfHelper.drawTextRTL(doc, `${student.studentClass || student.className} :${URDU_LABELS.className}`, RIGHT_MARGIN, doc.y, { font: fontRegular, fontSize: 12 });
        doc.moveDown();

        urduPdfHelper.drawTextRTL(doc, "تعلیمی ریکارڈ", RIGHT_MARGIN, doc.y, { font: fontBold, fontSize: 14 });
        doc.moveDown(0.5);
        
        const tableTop = doc.y;
        doc.font(fontBold).fontSize(10);
        
        // RTL columns
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.academicYear, RIGHT_MARGIN, tableTop);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.className, 420, tableTop);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.examName, 320, tableTop);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.percentage, 180, tableTop);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.grade, 120, tableTop);
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.status, 60, tableTop);
        
        doc.moveTo(LEFT_MARGIN, tableTop + 15).lineTo(RIGHT_MARGIN, tableTop + 15).stroke();
        
        let y = tableTop + 20;
        
        historyData.forEach(hist => {
          if (y > 700) {
            doc.addPage();
            y = 50;
          }
          doc.font("Helvetica").fontSize(10);
          doc.text(hist.academicYear, RIGHT_MARGIN - 80, y);
          doc.text(`${hist.percentage}%`, 140, y);
          doc.text(hist.grade, 100, y);
          
          doc.font(fontRegular).fontSize(10);
          urduPdfHelper.drawTextRTL(doc, hist.className, 420, y);
          urduPdfHelper.drawTextRTL(doc, `${hist.examName} (${hist.examType})`, 320, y);
          
          const statusStr = hist.status === "Pass" ? URDU_LABELS.pass : URDU_LABELS.fail;
          urduPdfHelper.drawTextRTL(doc, statusStr, 60, y);
          
          y += 20;
        });

        doc.moveTo(LEFT_MARGIN, y).lineTo(RIGHT_MARGIN, y).stroke();
        y += 10;
        urduPdfHelper.drawTextRTL(doc, `${historyData.length} :کل ریکارڈز`, RIGHT_MARGIN, y, { font: fontBold });

      } else {
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
      }
    }, null, { language: isUrdu ? 'ur' : 'en', translatedTitle: "تعلیمی ریکارڈ" });

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
      const hasAccess = await verifyTeacherClassAccess(req.user, student.classId, student.studentClass || student.className);
      if (!hasAccess) {
         return res.status(403).json({ message: "Unauthorized to view this student's result" });
      }
    }

    const { academicYear } = req.query;
    const language = resolvePdfLanguage(req.query.language);
    const isUrdu = language === "ur";
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
      
      const RIGHT_MARGIN = 550;
      const LEFT_MARGIN = 50;

      if (isUrdu) {
        if (fs.existsSync(PDF_FONT_PATHS.urdu)) {
          doc.registerFont("UrduFont", PDF_FONT_PATHS.urdu);
        } else {
          doc.registerFont("UrduFont", "Helvetica");
        }

        const fontRegular = "UrduFont";
        const fontBold = "UrduFont";

        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.profile, RIGHT_MARGIN, doc.y, { font: fontBold, fontSize: 14 });
        doc.moveDown(0.5);
        
        doc.fontSize(12).font(fontRegular);
        const nameVal = student.nameUrdu || student.fullName || student.name;
        urduPdfHelper.drawTextRTL(doc, `${nameVal} :${URDU_LABELS.name}`, RIGHT_MARGIN, doc.y, { font: fontRegular, fontSize: 12 });
        urduPdfHelper.drawTextRTL(doc, `${student.rollNumber || "—"} :${URDU_LABELS.rollNumber}`, RIGHT_MARGIN, doc.y, { font: fontRegular, fontSize: 12 });
        urduPdfHelper.drawTextRTL(doc, `${student.studentClass || student.className} :${URDU_LABELS.className}`, RIGHT_MARGIN, doc.y, { font: fontRegular, fontSize: 12 });
        urduPdfHelper.drawTextRTL(doc, `${academicYear} :${URDU_LABELS.academicYear}`, RIGHT_MARGIN, doc.y, { font: fontRegular, fontSize: 12 });
        doc.moveDown();

        targetExams.forEach(exam => {
          const studentResults = results.filter(r => String(r.examId) === String(exam._id));
          if (studentResults.length === 0) return;

          urduPdfHelper.drawTextRTL(doc, `${exam.name || exam.examName || exam.examType}`, RIGHT_MARGIN, doc.y, { font: fontBold, fontSize: 12 });
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
          doc.font(fontBold).fontSize(12);
          urduPdfHelper.drawTextRTL(doc, URDU_LABELS.subject, RIGHT_MARGIN, tableTop);
          urduPdfHelper.drawTextRTL(doc, URDU_LABELS.maxMarks, 300, tableTop);
          urduPdfHelper.drawTextRTL(doc, URDU_LABELS.obtainedMarks, 150, tableTop);
          doc.moveTo(LEFT_MARGIN, tableTop + 20).lineTo(RIGHT_MARGIN, tableTop + 20).stroke();
          
          let y = tableTop + 30;
          doc.font(fontRegular);

          exam.subjects.forEach(sub => {
            if (y > 700) { doc.addPage(); y = 50; }
            urduPdfHelper.drawTextRTL(doc, sub, RIGHT_MARGIN, y);
            urduPdfHelper.drawTextRTL(doc, exam.maxMarks.toString(), 300, y);
            const m = subjectMarks[sub];
            const mStr = m === null || m === "Absent" ? URDU_LABELS.absent : m.toString();
            urduPdfHelper.drawTextRTL(doc, mStr, 150, y);
            y += 25;
          });

          doc.moveTo(LEFT_MARGIN, y).lineTo(RIGHT_MARGIN, y).stroke();
          y += 15;
          
          doc.font(fontBold);
          urduPdfHelper.drawTextRTL(doc, `${totalMarks} :${URDU_LABELS.totalMarks}`, RIGHT_MARGIN, y);
          urduPdfHelper.drawTextRTL(doc, `${obtainedMarks} :${URDU_LABELS.obtained}`, 300, y);
          y += 25;
          urduPdfHelper.drawTextRTL(doc, `${percentage.toFixed(2)}% :${URDU_LABELS.percentage}`, RIGHT_MARGIN, y);
          urduPdfHelper.drawTextRTL(doc, `${grade} :${URDU_LABELS.grade}`, 300, y);
          y += 25;
          const resultStr = hasFailed ? URDU_LABELS.fail : URDU_LABELS.pass;
          urduPdfHelper.drawTextRTL(doc, `${resultStr} :${URDU_LABELS.result}`, RIGHT_MARGIN, y);
          
          doc.moveDown(2);
        });

      } else {
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
      }
    }, null, { language: isUrdu ? 'ur' : 'en', translatedTitle: "سالانہ نتیجہ" });

  } catch (error) {
    res.status(500).json({ message: "Error generating PDF", error: error.message });
  }
};
exports.generateStudentListPDF = async (req, res) => {
  try {
    const { classId, className } = req.query;
    const language = resolvePdfLanguage(req.query.language);
    const isUrdu = language === 'ur';

    let cId = classId || className;
    let matchQuery = { status: "active" };
    
    if (cId && cId !== "all") {
        if (cId.match(/^[0-9a-fA-F]{24}$/)) {
            const mongoose = require("mongoose");
            matchQuery.classId = new mongoose.Types.ObjectId(cId);
        }
    }
    const students = await Student.find(matchQuery);

    generatePDF(res, "Student List", (doc) => {
      let y = doc.y || 150;
      // Table Header
      doc.font("Helvetica-Bold");
      doc.text("Roll No", 50, y);
      doc.text("Name", 150, y);
      doc.text("Class", 350, y);
      doc.text("Phone", 450, y);
      y += 15;
      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 10;

      doc.font("Helvetica");
      students.forEach(student => {
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
        doc.text(student.rollNumber || "-", 50, y);
        doc.text(student.name || "-", 150, y);
        doc.text(student.studentClass || student.className || "-", 350, y);
        doc.text(student.phone || "-", 450, y);
        y += 20;
      });
    }, null, { language: isUrdu ? 'ur' : 'en', translatedTitle: "Student List" });

  } catch (error) {
    res.status(500).json({ message: "Error generating Student List PDF", error: error.message });
  }
};

