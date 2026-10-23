const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const Student = require("../models/studentModel");
const Teacher = require("../models/teacherModel");
const Transaction = require("../models/transactionModel");
const Attendance = require("../models/attendanceModel");
const Exam = require("../models/examModel");
const ExamResult = require("../models/examResultModel");
const { calculateResult } = require("../utils/grading");
const TeacherSalary = require("../models/teacherSalaryModel");
const { getTotalWorkingDays, getStudentAttendanceForPDF } = require("../services/attendanceService");
const { verifyTeacherClassAccess } = require("../middleware/authMiddleware");
const urduPdfHelper = require("../utils/pdf/urduPdfHelper");
const financeSummaryHtml = require("../utils/pdf/financeSummaryHtml");
const { toUrduDigits } = require("../utils/pdf/digitLocalization");
const numberToWords = require("../utils/pdf/numberToWords");
const { applyInstitutionalTemplate } = require("../utils/pdf/institutionalReportTemplate");
const { drawStudentMarksheet } = require("../utils/pdf/marksheetRenderer");
const {
  getLocalizedStudentName,
  getLocalizedFatherName,
  getLocalizedClassName,
  getLocalizedTeacherName,
} = require("../utils/transliteration");

const PDF_FONT_PATHS = {
  english: "Helvetica",
  englishBold: "Helvetica-Bold",
  urdu: path.join(__dirname, "../utils/fonts/Jameel Noori Nastaleeq.ttf")
};

const URDU_LABELS = {
  title: "دعوتِ ایمان مدرسہ",
  reportCard: "طالب علم کی مارک شیٹ",
  profile: "طالب علم کا پروفائل",
  student: "طالب علم",
  name: "نام",
  rollNumber: "رول نمبر",
  rollNo: "رول نمبر",
  admissionNo: "داخلہ نمبر",
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
  present: "حاضر",
  absent: "غیر حاضر",
  late: "تاخیر",
  leave: "چھٹی",
  date: "تاریخ",
  day: "دن",
  status: "کیفیت",
  remarks: "ریمارکس",
  totalRecords: "کل ریکارڈز",
  totalWorkingDays: "کل کام کے دن",
  period: "مدت",
  authorizedSignature: "مجاز دستخط",
  financeReport: "مالی رپورٹ",
  dateRange: "تاریخ کی حد",
  totalIncome: "کل آمدنی",
  totalExpense: "کل اخراجات",
  currentBalance: "موجودہ بیلنس",
  income: "آمدنی",
  expense: "اخراجات",
  description: "تفصیل",
  category: "زمرہ",
  paymentMode: "طریقہ ادائیگی",
  amount: "رقم",
  teacherSalarySlip: "اساتذہ کی تنخواہ کی پرچی",
  salaryCalculationBreakdown: "تنخواہ کی تفصیلات",
  teacherId: "استاد آئی ڈی",
  designation: "عہدہ",
  department: "شعبہ",
  joiningDate: "شمولیت کی تاریخ",
  salaryPeriod: "تنخواہ کی مدت",
  monthlySalary: "ماہانہ تنخواہ",
  dailySalary: "روزانہ تنخواہ",
  attendanceSummary: "حاضری کا خلاصہ",
  allowedLeave: "مجاز رخصت",
  extraLeave: "اضافی رخصت",
  sundays: "اتوار",
  deductions: "کٹوتیاں",
  leaveDeduction: "رخصت کٹوتی",
  absentDeduction: "غیر حاضری کٹوتی",
  totalDeduction: "کل کٹوتی",
  payableSalary: "قابل ادا تنخواہ",
  paymentInformation: "ادائیگی کی تفصیلات",
  paid: "ادا شدہ",
  draft: "ڈرافٹ",
  paymentDate: "ادائیگی کی تاریخ",
  paymentMethod: "طریقہ ادائیگی",
  paymentReference: "حوالہ نمبر",
  financeTransactionID: "ٹرانزیکشن آئی ڈی"
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
  const asciiTitle = (title || "report").replace(/[^\x20-\x7E]/g, "").trim().replace(/\s+/g, "_") || "report";
  const encodedTitle = encodeURIComponent((title || "report").replace(/\s+/g, "_"));
  res.setHeader("Content-Disposition", `attachment; filename="${asciiTitle}.pdf"; filename*=UTF-8''${encodedTitle}.pdf`);
  
  // Apply Institutional Template
  applyInstitutionalTemplate(doc, options);
  
  doc.pipe(res);
  
  const isUrdu = options.language === 'ur';

  // Always register Urdu font so any report can display Urdu student names/details without mojibake
  if (fs.existsSync(PDF_FONT_PATHS.urdu)) {
    doc.registerFont("UrduFont", PDF_FONT_PATHS.urdu);
  } else {
    doc.registerFont("UrduFont", "Helvetica"); // Fallback
  }

  // Ensure title starts cleanly below header
  const titleY = Math.max(doc.y || 0, 142);

  // Title rendering directly below the header
  if (isUrdu) {
    const uTitle = options.translatedTitle || title;
    urduPdfHelper.drawTextRTL(doc, uTitle, 50, titleY, { 
      font: "UrduFont", 
      fontSize: 18, 
      width: 500, 
      align: "center" 
    });

    if (options.hideSubHeader) {
      doc.y = titleY + 30;
    } else {
      const subY = titleY + 32;
      doc.font("Helvetica").fontSize(9).fillColor("#333333").text(`Generated On: ${new Date().toLocaleDateString()}`, 50, subY);

      const yearStr = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
      urduPdfHelper.drawTextRTL(doc, `:${URDU_LABELS.academicYear}`, 550, subY, { font: "UrduFont", fontSize: 10 });
      doc.font("Helvetica").fontSize(9).fillColor("#333333").text(yearStr, 420, subY + 2, { width: 75, align: "right" });

      doc.y = subY + 25;
    }
  } else {
    doc.y = titleY;
    doc.fontSize(16).font("Helvetica-Bold").fillColor("#000000").text(title, { align: "center" });
    if (options.hideSubHeader) {
      doc.y = titleY + 30;
    } else {
      doc.fontSize(9).font("Helvetica").text(`Academic Year: ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, 50, doc.y, { align: "left" });
      doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 50, doc.y, { align: "right" });
      doc.moveDown(0.5);
    }
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

exports.generateStudentIdCard = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate('classId');
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (req.user.role === 'teacher') {
      const targetClassId = student.classId ? (student.classId._id || student.classId) : null;
      const isAuthorized = await verifyTeacherClassAccess(req.user, targetClassId);
      if (!isAuthorized) {
        return res.status(403).json({ message: "Unauthorized to access this student's ID card" });
      }
    }

    const doc = new PDFDocument({
      size: [243, 153],
      margin: 0
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="ID_Card_${student.studentId || student._id}.pdf"`);
    doc.pipe(res);

    const language = resolvePdfLanguage(req.query.language);
    const isUrdu = language === "ur";
    const fontRegular = isUrdu ? "UrduFont" : PDF_FONT_PATHS.english;
    const fontBold = isUrdu ? "UrduFont" : PDF_FONT_PATHS.englishBold;

    if (fs.existsSync(PDF_FONT_PATHS.urdu)) {
      doc.registerFont("UrduFont", PDF_FONT_PATHS.urdu);
    } else {
      doc.registerFont("UrduFont", "Helvetica");
    }

    // Border
    doc.rect(2, 2, 239, 149).strokeColor('#047857').lineWidth(1.5).stroke();

    // Top Header Banner
    doc.rect(2, 2, 239, 36).fill('#047857');
    
    // Logo
    const logoPath = path.join(__dirname, "../../../client/public/logo1.jpeg");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 8, 6, { height: 26 });
    }

    // Header Text
    doc.fillColor('white');
    if (isUrdu) {
      doc.font(fontBold).fontSize(13);
      urduPdfHelper.drawTextRTL(doc, "جامعہ دعوتِ ایمان", 230, 8, { font: fontBold, fontSize: 13, color: 'white' });
      doc.font(fontRegular).fontSize(8);
      urduPdfHelper.drawTextRTL(doc, "شناختی کارڈ", 230, 24, { font: fontRegular, fontSize: 8, color: 'white' });
    } else {
      doc.font(fontBold).fontSize(11).text("JAMIA DAWAT-UL-EIMAN", 42, 9, { width: 195, align: 'center' });
      doc.font(fontRegular).fontSize(8).text("Student Identity Card", 42, 22, { width: 195, align: 'center' });
    }

    // Photo Box
    const photoX = 12;
    const photoY = 48;
    const photoWidth = 60;
    const photoHeight = 75;
    
    // Draw photo border
    doc.rect(photoX, photoY, photoWidth, photoHeight).lineWidth(1).strokeColor('#ccc').stroke();

    if (student.photo) {
      let photoFsPath = student.photo;
      // Handle relative paths stored in DB (e.g. /uploads/...)
      if (student.photo.startsWith('/uploads')) {
        photoFsPath = path.join(__dirname, "../../", student.photo);
      } else if (!path.isAbsolute(student.photo)) {
        photoFsPath = path.join(__dirname, "../../public", student.photo);
      }
      
      if (fs.existsSync(photoFsPath)) {
        doc.image(photoFsPath, photoX, photoY, { width: photoWidth, height: photoHeight });
      } else {
        drawPlaceholderPhoto();
      }
    } else {
      drawPlaceholderPhoto();
    }

    function drawPlaceholderPhoto() {
      doc.font(PDF_FONT_PATHS.englishBold).fontSize(28).fillColor('#aaa').text(
        (student.fullName || student.name || "S").charAt(0).toUpperCase(),
        photoX, photoY + 22,
        { width: photoWidth, align: 'center' }
      );
    }

    // Student Details
    doc.fillColor('black');
    const labelX = 82;
    let currentY = 48;
    const yStep = 15;

    const nameStr = getLocalizedStudentName(student, language);
    const classNameStr = getLocalizedClassName(student.classId || student.className, language);
    const rollNoStr = student.rollNumber;
    const admNoStr = student.admissionNumber;

    if (isUrdu) {
      doc.fontSize(11).font(fontBold);
      urduPdfHelper.drawTextRTL(doc, nameStr, 230, currentY);
      currentY += 18;
      
      doc.fontSize(9).font(fontRegular);
      urduPdfHelper.drawTextRTL(doc, `${classNameStr} :کلاس`, 230, currentY);
      currentY += yStep;
      
      if (rollNoStr) {
          doc.font(fontRegular);
          urduPdfHelper.drawTextRTL(doc, URDU_LABELS.rollNo + ":", 230, currentY);
          urduPdfHelper.drawTextRTL(doc, toUrduDigits(rollNoStr), 230 - 80, currentY);
          currentY += yStep;
        }
      
      if (admNoStr) {
          doc.font(fontRegular);
          urduPdfHelper.drawTextRTL(doc, URDU_LABELS.admissionNo + ":", 230, currentY);
          urduPdfHelper.drawTextRTL(doc, toUrduDigits(admNoStr), 230 - 80, currentY);
        }
    } else {
      doc.fontSize(11).font(fontBold);
      doc.text(nameStr, labelX, currentY, { width: 150 });
      currentY += 18;
      
      doc.fontSize(9).font(fontRegular);
      doc.text(`Class: ${classNameStr}`, labelX, currentY, { width: 150 });
      currentY += yStep;

      if (rollNoStr) {
        doc.font(fontRegular).text("Roll No:", labelX, currentY);
        doc.font(fontBold).text(rollNoStr, labelX + 45, currentY);
        currentY += yStep;
      }
      
      if (admNoStr) {
        doc.font(fontRegular).text("Adm No:", labelX, currentY);
        doc.font(fontBold).text(admNoStr, labelX + 45, currentY);
      }
    }

    // Bottom Accent
    doc.rect(2, 138, 239, 13).fill('#047857');
    doc.fillColor('white').font(PDF_FONT_PATHS.english).fontSize(6).text("Issued by Jamia Dawat-ul-Eiman Administration", 0, 142, { align: 'center', width: 243 });

    doc.end();

  } catch (error) {
    console.error("ID Card generation failed:", error);
    res.status(500).json({ message: "Failed to generate ID card" });
  }
};

exports.generateTeacherSalarySlip = async (req, res) => {
  try {
    const { salaryId } = req.params;
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(salaryId)) {
      return res.status(400).json({ message: "Invalid Salary ID" });
    }
    
    // RBAC/IDOR Validation is handled inside the controller here
    // since PDF routes use generic protect without specific Teacher auth.
    // Actually, we'll verify it right away.
    const salary = await TeacherSalary.findById(salaryId).populate("teacherId", "name nameUrdu teacherId designation department joiningDate").lean();
    
    if (!salary) {
      return res.status(404).json({ message: "Salary record not found" });
    }

    if (req.user.role === "teacher") {
      // Must be own salary
      if (salary.teacherId.userId?.toString() !== req.user._id.toString() && salary.teacherId._id?.toString() !== req.user.teacherId?.toString()) {
        // Fallback: Need to check user->teacher relation correctly.
        // Let's explicitly query Teacher if populated doesn't have userId
        const teacherRec = await Teacher.findOne({ userId: req.user._id }).lean();
        if (!teacherRec || teacherRec._id.toString() !== salary.teacherId._id.toString()) {
           return res.status(403).json({ message: "Unauthorized to view this salary slip" });
        }
      }
    } else if (req.user.role !== "admin") {
      // Accountant and others blocked per policy
      return res.status(403).json({ message: "Unauthorized role" });
    }

    const language = resolvePdfLanguage(req.query.language);
    const isUrdu = language === "ur";

    const title = salary.status === "Paid" 
      ? (isUrdu ? URDU_LABELS.teacherSalarySlip : "Teacher Salary Slip")
      : (isUrdu ? URDU_LABELS.salaryCalculationBreakdown : "Salary Calculation Breakdown");

    generatePDF(res, `Teacher_Salary_${salary.teacherId.name.replace(/\s+/g, '_')}_${salary.month}_${salary.year}`, (doc) => {
      const fontRegular = isUrdu ? "UrduFont" : PDF_FONT_PATHS.english;
      const fontBold = isUrdu ? "UrduFont" : PDF_FONT_PATHS.englishBold;
      
      const teacherName = getLocalizedTeacherName(salary.teacherId, language);
      const salaryPeriodStr = `${salary.month}/${salary.year}`;

      const drawRow = (label, value, y, alignLeft = false) => {
         // Background row alternating is nice, but keeping it simple and structural.
         if (isUrdu) {
             doc.font(fontRegular).fontSize(14);
             urduPdfHelper.drawTextRTL(doc, label, 500, y, { font: fontBold, fontSize: 14 });
             // values might be LTR, but we'll draw them strictly positioned.
             doc.font(PDF_FONT_PATHS.english).fontSize(12);
             doc.text(String(value), 100, y, { width: 250, align: "right" });
         } else {
             doc.font(fontBold).fontSize(10).text(label, 50, y, { width: 150 });
             doc.font(fontRegular).fontSize(10).text(String(value), 200, y, { width: 300 });
         }
      };

      const drawSectionHeader = (text, y) => {
        doc.rect(50, y, 500, 24).fill("#047857");
        doc.fillColor("white");
        if (isUrdu) {
           doc.font(fontBold).fontSize(16);
           urduPdfHelper.drawTextRTL(doc, text, 540, y + 2, { font: fontBold, fontSize: 16, color: 'white' });
        } else {
           doc.font(fontBold).fontSize(12).text(text, 60, y + 4);
        }
        doc.fillColor("black");
      };

      let yPos = doc.y;

      // TEACHER INFORMATION
      drawSectionHeader(isUrdu ? URDU_LABELS.name : "Teacher Information", yPos);
      yPos += 30;
      
      drawRow(isUrdu ? URDU_LABELS.name : "Name", teacherName, yPos);
      yPos += 20;
      drawRow(isUrdu ? URDU_LABELS.teacherId : "Teacher ID", salary.teacherId.teacherId || "ΓÇö", yPos);
      yPos += 20;
      drawRow(isUrdu ? URDU_LABELS.designation : "Designation", salary.teacherId.designation || "ΓÇö", yPos);
      yPos += 20;
      drawRow(isUrdu ? URDU_LABELS.department : "Department", salary.teacherId.department || "ΓÇö", yPos);
      yPos += 20;
      
      const joiningDateStr = salary.teacherId.joiningDate ? new Date(salary.teacherId.joiningDate).toLocaleDateString() : "ΓÇö";
      drawRow(isUrdu ? URDU_LABELS.joiningDate : "Joining Date", joiningDateStr, yPos);
      yPos += 20;
      
      drawRow(isUrdu ? URDU_LABELS.salaryPeriod : "Salary Period", salaryPeriodStr, yPos);
      yPos += 35;

      // SALARY BREAKDOWN
      drawSectionHeader(isUrdu ? URDU_LABELS.salaryCalculationBreakdown : "Salary Breakdown", yPos);
      yPos += 30;
      drawRow(isUrdu ? URDU_LABELS.monthlySalary : "Monthly Salary", salary.monthlySalarySnapshot || 0, yPos);
      yPos += 20;
      drawRow(isUrdu ? URDU_LABELS.dailySalary : "Daily Salary", salary.dailySalary ? salary.dailySalary.toFixed(2) : 0, yPos);
      yPos += 35;

      // ATTENDANCE SUMMARY
      drawSectionHeader(isUrdu ? URDU_LABELS.attendanceSummary : "Attendance Summary", yPos);
      yPos += 30;
      // We don't have presentDays in the schema explicitly unless we derive it, but the user said "If presentDays does NOT exist: DO NOT add it merely for the PDF." 
      drawRow(isUrdu ? URDU_LABELS.absent : "Absent Days", salary.absentDays || 0, yPos);
      yPos += 20;
      drawRow(isUrdu ? URDU_LABELS.late : "Late Days", salary.lateDays || 0, yPos);
      yPos += 20;
      drawRow(isUrdu ? URDU_LABELS.leave : "Leave Taken", salary.leaveTaken || 0, yPos);
      yPos += 20;
      drawRow(isUrdu ? URDU_LABELS.allowedLeave : "Allowed Leave", salary.allowedLeave || 0, yPos);
      yPos += 20;
      drawRow(isUrdu ? URDU_LABELS.extraLeave : "Extra Leave", salary.extraLeave || 0, yPos);
      yPos += 20;
      drawRow(isUrdu ? URDU_LABELS.sundays : "Sundays", salary.sundays || 0, yPos);
      yPos += 35;

      // DEDUCTIONS
      drawSectionHeader(isUrdu ? URDU_LABELS.deductions : "Deductions", yPos);
      yPos += 30;
      drawRow(isUrdu ? URDU_LABELS.leaveDeduction : "Leave Deduction", salary.leaveDeduction || 0, yPos);
      yPos += 20;
      drawRow(isUrdu ? URDU_LABELS.absentDeduction : "Absent Deduction", salary.absentDeduction || 0, yPos);
      yPos += 20;
      drawRow(isUrdu ? URDU_LABELS.totalDeduction : "Total Deduction", salary.totalDeduction || 0, yPos);
      yPos += 35;

      // CHECK IF NEW PAGE NEEDED
      if (yPos > 600) {
          doc.addPage();
          yPos = 50;
      }

      // NET SALARY
      drawSectionHeader(isUrdu ? URDU_LABELS.payableSalary : "NET / PAYABLE SALARY", yPos);
      yPos += 30;
      doc.font(fontBold).fontSize(14);
      if (isUrdu) {
         doc.text(String(salary.payableSalary || 0), 50, yPos, { width: 500, align: "center" });
      } else {
         doc.text(String(salary.payableSalary || 0), 50, yPos, { width: 500, align: "center" });
      }
      yPos += 35;

      // PAYMENT INFORMATION
      drawSectionHeader(isUrdu ? URDU_LABELS.paymentInformation : "Payment Information", yPos);
      yPos += 30;
      
      const statusStr = salary.status === "Paid" ? (isUrdu ? URDU_LABELS.paid : "Paid") : (isUrdu ? URDU_LABELS.draft : "Draft");
      drawRow(isUrdu ? URDU_LABELS.status : "Status", statusStr, yPos);
      yPos += 20;

      if (salary.status === "Paid") {
          const pDate = salary.paymentDate ? new Date(salary.paymentDate).toLocaleDateString() : "ΓÇö";
          drawRow(isUrdu ? URDU_LABELS.paymentDate : "Payment Date", pDate, yPos);
          yPos += 20;
          drawRow(isUrdu ? URDU_LABELS.paymentMethod : "Payment Method", salary.paymentMethod || "ΓÇö", yPos);
          yPos += 20;
          drawRow(isUrdu ? URDU_LABELS.paymentReference : "Payment Reference", salary.paymentReference || "ΓÇö", yPos);
          yPos += 20;
          if (salary.financeTransactionId) {
             drawRow(isUrdu ? URDU_LABELS.financeTransactionID : "Finance Transaction ID", String(salary.financeTransactionId), yPos);
             yPos += 20;
          }
      } else {
          drawRow(isUrdu ? URDU_LABELS.paymentDate : "Payment Date", "ΓÇö", yPos);
          yPos += 20;
          drawRow(isUrdu ? URDU_LABELS.paymentMethod : "Payment Method", "ΓÇö", yPos);
          yPos += 20;
      }
      
      if (salary.remarks) {
          drawRow(isUrdu ? URDU_LABELS.remarks : "Remarks", salary.remarks, yPos);
          yPos += 20;
      }

      yPos += 60;
      // SIGNATURE
      if (yPos > 680) {
          doc.addPage();
          yPos = 50;
      }

      doc.moveTo(400, yPos).lineTo(550, yPos).stroke();
      if (isUrdu) {
         doc.font(fontRegular).fontSize(10);
         urduPdfHelper.drawTextRTL(doc, URDU_LABELS.authorizedSignature, 550, yPos + 5, { font: fontRegular, fontSize: 10, align: "center" });
      } else {
         doc.font(fontRegular).fontSize(10).text("Authorized Signature", 400, yPos + 5, { width: 150, align: "center" });
      }

    }, null, { language, translatedTitle: title });

  } catch (error) {
    console.error("Teacher Salary Slip PDF Error:", error);
    if (error.name === "CastError") {
       return res.status(400).json({ message: "Invalid Salary ID" });
    }
    res.status(500).json({ message: "Failed to generate Salary Slip PDF", error: error.message });
  }
};

exports.generateStudentReportCard = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate("classId").populate("schoolClassId");
    if (!student) return res.status(404).json({ message: "Student not found" });

    const hasAccess = await verifyTeacherClassAccess(req.user, student.classId, student.studentClass || student.className);
    if (!hasAccess) return res.status(403).json({ message: "Unauthorized to access this student's report card" });

    const examIdParam = req.query.examId;
    const language = resolvePdfLanguage(req.query.language);
    if (!examIdParam) return res.status(400).json({ message: "examId or examType query parameter is required" });

    let exam;
    if (examIdParam.match(/^[0-9a-fA-F]{24}$/)) {
        exam = await Exam.findById(examIdParam).populate("classId");
    } else {
        // It's an examType like 'monthly', find the latest for this class
        let examQuery = { examType: examIdParam };
        const classOr = [];
        if (student.classId) {
          classOr.push({ classId: student.classId._id || student.classId });
          if (student.classId.name) classOr.push({ class: student.classId.name });
          if (student.classId.fullName) classOr.push({ class: student.classId.fullName });
        }
        if (student.studentClass) classOr.push({ class: student.studentClass });
        if (student.className) classOr.push({ class: student.className });
        if (classOr.length > 0) examQuery.$or = classOr;
        exam = await Exam.findOne(examQuery).populate("classId").sort({ createdAt: -1 });
    }

    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const examResults = await ExamResult.find({ examId: exam._id, studentId: student._id });

    const isUrdu = language === 'ur';
    const reportTitle = isUrdu ? URDU_LABELS.reportCard : "Student Marksheet";
    generatePDF(res, reportTitle, (doc) => {
      drawStudentMarksheet(doc, {
        student,
        exam,
        results: examResults,
        language,
        academicYear: exam.academicYear,
        startY: Math.max(doc.y || 0, 185)
      });
    }, null, { language: isUrdu ? 'ur' : 'en', translatedTitle: reportTitle, hideSubHeader: true });
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
      
      let isAbsentInAny = false;
      exam.subjects.forEach(sub => {
        if (subjectMarks[sub] === null || subjectMarks[sub] === "Absent") {
          isAbsentInAny = true;
        }
      });
      const calcRes = calculateResult({
        marks: obtainedMarks,
        maxMarks: typeof finalTotalMarks !== 'undefined' ? finalTotalMarks : totalMarks,
        passingMarks: isAbsentInAny ? (typeof finalTotalMarks !== 'undefined' ? finalTotalMarks : totalMarks) + 1 : (exam.passingMarks * exam.subjects.length)
      });
      let grade = isAbsentInAny ? "F" : calcRes.grade;
      hasFailed = isAbsentInAny ? true : !calcRes.passed;
      
      

      return {
        rollNumber: student.rollNumber,
        name: getLocalizedStudentName(student, language),
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
          doc.font("Helvetica").fontSize(9);
          doc.text(c.rollNumber || "-", 50, y);
          const isNameArabic = /[\u0600-\u06FF]/.test(c.name || "");
          if (isNameArabic) {
            doc.font("UrduFont").fontSize(11);
            doc.text(c.name || "-", 120, y - 2, { width: 170, align: "left", features: ["rtla"] });
          } else {
            doc.font("Helvetica").fontSize(9);
            doc.text(c.name || "-", 120, y);
          }
          doc.font("Helvetica").fontSize(9);
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
      query.$or.push({ classId: exam.classId._id || exam.classId });
    }
    const students = await Student.find(query).populate("classId").populate("schoolClassId").lean();

    if (students.length === 0) {
      return res.status(404).json({ message: "No students found in this class" });
    }

    // Sort students
    students.sort((a, b) => {
      const numA = parseInt(a.rollNumber, 10);
      const numB = parseInt(b.rollNumber, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a.rollNumber || "").localeCompare(String(b.rollNumber || ""));
    });

    const results = await ExamResult.find({ examId: exam._id }).lean();
    const classNameDisplay = getLocalizedClassName(exam.classId || exam.class, language);
    const reportTitle = isUrdu ? `${URDU_LABELS.reportCard} - ${classNameDisplay}` : `Student Marksheets - ${classNameDisplay}`;

    generatePDF(res, reportTitle, (doc) => {
      let isFirstPage = true;
      students.forEach((student) => {
        if (!isFirstPage) {
          doc.addPage();
        }
        const studentResults = results.filter(r => String(r.studentId) === String(student._id));
        drawStudentMarksheet(doc, {
          student,
          exam,
          results: studentResults,
          language,
          academicYear: exam.academicYear,
          startY: Math.max(doc.y || 0, 185),
          drawTitle: !isFirstPage
        });
        isFirstPage = false;
      });
    }, null, { language: isUrdu ? 'ur' : 'en', translatedTitle: reportTitle, standalonePages: true, hideSubHeader: true });
  } catch (error) {
    res.status(500).json({ message: "Error generating class marksheets PDF", error: error.message });
  }
};


exports.generateFinanceSummaryPuppeteerTest = async (req, res) => {
    try {
      const { startDate, endDate, academicYear, status, type } = req.query;
      const language = resolvePdfLanguage(req.query.language);
      
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
  
      await financeSummaryHtml.generateFinanceSummaryHTMLPDF(res, {
        transactions,
        dateStr,
        academicYear,
        totalIncome,
        totalExpense,
        currentBalance,
        language,
        URDU_LABELS
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error generating Finance PDF", error: error.message });
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
        const LEFT_MARGIN = 50;
        const RIGHT_MARGIN = doc.page.width - 50;
        const USABLE_WIDTH = RIGHT_MARGIN - LEFT_MARGIN;
  
        // Define column widths
        const colDateW = 70;
        const colAmountW = 80;
        const colModeW = 80;
        const colCatW = 90;
        // The rest goes to description
        const colDescW = USABLE_WIDTH - colDateW - colAmountW - colModeW - colCatW;
  
        if (isUrdu) {
          if (fs.existsSync(PDF_FONT_PATHS.urdu)) {
            doc.registerFont("UrduFont", PDF_FONT_PATHS.urdu);
          } else {
            doc.registerFont("UrduFont", "Helvetica");
          }
  
          const fontRegular = "UrduFont";
          const fontBold = "UrduFont";
  
          doc.fontSize(10);
          
          // Header Stats
          const statY = doc.y;
          doc.font(fontBold);
          urduPdfHelper.drawTextRTL(doc, URDU_LABELS.dateRange + ":", RIGHT_MARGIN, statY);
          doc.font("Helvetica");
          doc.text(dateStr, RIGHT_MARGIN - 80 - doc.widthOfString(dateStr), statY + 2); // approximate offset
          
          if (academicYear) {
            doc.font(fontBold);
            urduPdfHelper.drawTextRTL(doc, URDU_LABELS.academicYear + ":", LEFT_MARGIN + 150, statY);
            doc.font("Helvetica");
            doc.text(academicYear, LEFT_MARGIN + 150 - 80 - doc.widthOfString(academicYear), statY + 2);
          }
          doc.moveDown();
  
          // Summary Section
          doc.fontSize(12);
          const ySummary = doc.y;
          doc.font(fontBold);
          urduPdfHelper.drawTextRTL(doc, URDU_LABELS.totalIncome + ":", RIGHT_MARGIN, ySummary);
          doc.font("Helvetica-Bold");
          doc.fillColor("green").text(`Rs ${totalIncome}`, RIGHT_MARGIN - 90 - doc.widthOfString(`Rs ${totalIncome}`), ySummary + 2);
          doc.fillColor("black");

          doc.font(fontBold);
          urduPdfHelper.drawTextRTL(doc, URDU_LABELS.totalExpense + ":", LEFT_MARGIN + 180, ySummary);
          doc.font("Helvetica-Bold");
          doc.fillColor("red").text(`Rs ${totalExpense}`, LEFT_MARGIN + 180 - 90 - doc.widthOfString(`Rs ${totalExpense}`), ySummary + 2);
          doc.fillColor("black");
          doc.moveDown();
          
          const yBal = doc.y;
          doc.fontSize(14).font(fontBold);
          urduPdfHelper.drawTextRTL(doc, URDU_LABELS.currentBalance + ":", RIGHT_MARGIN, yBal);
          doc.font("Helvetica-Bold");
          const balText = `Rs ${currentBalance}`;
          doc.text(balText, RIGHT_MARGIN - 110 - doc.widthOfString(balText), yBal + 2);
          doc.moveDown(2);
          
          // Transactions Table Header (RTL Visual Order)
          const drawTableHeaderUR = (y) => {
            doc.fontSize(10).font(fontBold).fillColor("black");
            let currX = RIGHT_MARGIN;
            urduPdfHelper.drawTextRTL(doc, URDU_LABELS.date, currX, y, { width: colDateW });
            currX -= colDateW;
            urduPdfHelper.drawTextRTL(doc, URDU_LABELS.description, currX, y, { width: colDescW });
            currX -= colDescW;
            urduPdfHelper.drawTextRTL(doc, URDU_LABELS.category, currX, y, { width: colCatW });
            currX -= colCatW;
            urduPdfHelper.drawTextRTL(doc, URDU_LABELS.paymentMode, currX, y, { width: colModeW });
            currX -= colModeW;
            urduPdfHelper.drawTextRTL(doc, URDU_LABELS.amount, currX, y, { width: colAmountW });
            doc.moveTo(LEFT_MARGIN, y + 15).lineTo(RIGHT_MARGIN, y + 15).stroke();
          };

          let tableY = doc.y;
          drawTableHeaderUR(tableY);
          
          let y = tableY + 20;
          
          transactions.forEach(tx => {
            doc.fontSize(10);
            const txDate = new Date(tx.date).toLocaleDateString();
            const sign = tx.type === "income" ? "+" : "-";
            const amtText = `${sign} Rs ${tx.amount}`;
            const desc = tx.description || "";
            const cat = tx.category || "-";
            const mode = tx.paymentMode || "Cash";

            // Calculate height needed
            doc.font(fontRegular);
            const descH = doc.heightOfString(desc, { features: ['rtla'], width: colDescW }) || 15;
            const catH = doc.heightOfString(cat, { features: ['rtla'], width: colCatW }) || 15;
            const rowH = Math.max(descH, catH, 15) + 10; // padding

            if (y + rowH > doc.page.height - 50) {
              doc.addPage();
              y = 50;
              drawTableHeaderUR(y);
              y += 20;
            }
            
            let currX = RIGHT_MARGIN;
            
            // Date (LTR)
            doc.font("Helvetica").fillColor("black");
            doc.text(txDate, currX - colDateW, y + 2, { width: colDateW, align: "right" });
            currX -= colDateW;

            // Description (RTL)
            doc.font(fontRegular);
            urduPdfHelper.drawTextRTL(doc, desc, currX, y, { width: colDescW, align: "center" });
            currX -= colDescW;

            // Category (RTL)
            urduPdfHelper.drawTextRTL(doc, cat, currX, y, { width: colCatW });
            currX -= colCatW;

            // Mode (LTR fallback if no Urdu modes)
            doc.font("Helvetica");
            doc.text(mode, currX - colModeW, y + 2, { width: colModeW, align: "right" });
            currX -= colModeW;

            // Amount (LTR)
            doc.fillColor(tx.type === "income" ? "green" : "red").font("Helvetica-Bold");
            doc.text(amtText, currX - colAmountW, y + 2, { width: colAmountW, align: "right" });
            
            y += rowH;
          });
  
          doc.fillColor("black");
  
        } else {
          // English Render
          if (fs.existsSync(PDF_FONT_PATHS.urdu)) {
            doc.registerFont("UrduFont", PDF_FONT_PATHS.urdu);
          } else {
            doc.registerFont("UrduFont", "Helvetica");
          }
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
          
          // Transactions Table Header (LTR)
          const drawTableHeaderEN = (y) => {
            doc.fontSize(9).font("Helvetica-Bold").fillColor("black");
            let currX = LEFT_MARGIN;
            doc.text("Date", currX, y, { width: colDateW });
            currX += colDateW;
            doc.text("Description", currX, y, { width: colDescW });
            currX += colDescW;
            doc.text("Category", currX, y, { width: colCatW });
            currX += colCatW;
            doc.text("Mode", currX, y, { width: colModeW });
            currX += colModeW;
            doc.text("Amount", currX, y, { width: colAmountW, align: "right" });
            doc.moveTo(LEFT_MARGIN, y + 12).lineTo(RIGHT_MARGIN, y + 12).stroke();
          };

          let tableTop = doc.y;
          drawTableHeaderEN(tableTop);
          
          let y = tableTop + 20;
  
          transactions.forEach(tx => {
            doc.fontSize(9).font("Helvetica");
            const txDate = new Date(tx.date).toLocaleDateString();
            const sign = tx.type === "income" ? "+" : "-";
            const amtText = `${sign} Rs ${tx.amount}`;
            const desc = tx.description || "";
            const cat = tx.category || "-";
            const mode = tx.paymentMode || "Cash";

            // Calculate height needed
            const descH = doc.heightOfString(desc, { width: colDescW }) || 15;
            const catH = doc.heightOfString(cat, { width: colCatW }) || 15;
            const rowH = Math.max(descH, catH, 15) + 10; // padding

            if (y + rowH > doc.page.height - 50) {
              doc.addPage();
              y = 50;
              drawTableHeaderEN(y);
              y += 20;
            }
            
            let currX = LEFT_MARGIN;
            doc.fillColor("black");
            doc.text(txDate, currX, y, { width: colDateW });
            currX += colDateW;
            
            const hasUrdu = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(desc);
            const descFont = hasUrdu ? "UrduFont" : "Helvetica";
            
            doc.font(descFont);
            if (hasUrdu) {
                urduPdfHelper.drawTextRTL(doc, desc, currX, y, { width: colDescW, align: "center" });
            } else {
                doc.text(desc, currX, y, { width: colDescW, align: "center" });
            }
            currX += colDescW;

            doc.font("Helvetica");
            doc.text(cat, currX, y, { width: colCatW });
            currX += colCatW;

            doc.text(mode, currX, y, { width: colModeW });
            currX += colModeW;
            
            doc.fillColor(tx.type === "income" ? "green" : "red").font("Helvetica-Bold");
            doc.text(amtText, currX, y, { width: colAmountW, align: "right" });
            
            y += rowH;
          });
  
          doc.fillColor("black");
        }
      }, null, { language: isUrdu ? 'ur' : 'en', translatedTitle: isUrdu ? URDU_LABELS.financeReport : "Finance Report" });
    } catch (error) {
      res.status(500).json({ message: "Error generating Finance PDF", error: error.message });
    }
  };

  exports.generateFeeReceiptPDF = async (req, res) => {
  try {
    const language = resolvePdfLanguage(req.query.language);
    // If language is 'ur' or explicitly requested, use Urdu words; otherwise use English words
    const isUrduWords = req.query.words === "ur" || language === "ur";
    
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
    doc.lineWidth(3).strokeColor("#1e3a8a");
    doc.rect(10, 10, w - 20, h - 20).stroke();
    doc.lineWidth(1).strokeColor("#1e3a8a");
    doc.rect(14, 14, w - 28, h - 28).stroke();
    
    // Inner decorative corner arcs
    doc.lineWidth(0.8).strokeColor("#1e3a8a");
    doc.path("M 20 20 Q 32 20 32 32").stroke();
    doc.path("M 580 20 Q 568 20 568 32").stroke();
    doc.path("M 20 295 Q 32 295 32 283").stroke();
    doc.path("M 580 295 Q 568 295 568 283").stroke();

    // Rest of drawing colors reset to dark
    doc.fillColor("#0f172a").strokeColor("#0f172a");

    // LEFT Header
    doc.fontSize(12).font(englishBold).fillColor("#1e3a8a").text("JAMIA", 25, 24);
    doc.fontSize(22).font(englishBold).fillColor("#be185d").text("DAWAT-UL-EIMAN", 25, 38);
    
    doc.fontSize(7).font(englishFont).fillColor("#1e293b");
    doc.text("6 Minar Masjid, Roshanpura, Hazrat Balepeer, Beed", 25, 65, { lineBreak: false });
    doc.text("431122 (MS), : 8446124215 / 9011115313 / 8999020106", 25, 75, { lineBreak: false });
    
    // Top Registration text
    doc.fontSize(7.5).font(englishBold).fillColor("#334155");
    doc.text("Reg.No.: F-0027800(BED)", 155, 25, { lineBreak: false });

    // RIGHT Header (Urdu)
    doc.fillColor("#059669");
    urduPdfHelper.drawTextRTL(doc, "جامعہ دعوۃ الایمان", 575, 12, { font: urduFont, fontSize: 36 });
    
    doc.fillColor("#1e293b");
    urduPdfHelper.drawTextRTL(doc, "چھ مینار مسجد، روشن پورہ، حضرت بالے پیر بیڑ(مہاراشٹر)", 575, 68, { font: urduFont, fontSize: 14 });

    // CENTER Logo
    const logoPath = path.join(__dirname, "../../../client/public/logo1.jpeg");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 255, 16, { width: 90 });
    }

    // === META ===
    doc.font(englishBold).fontSize(10).fillColor("#0f172a");
    const receiptNo = tx.receiptId || tx._id.toString().slice(-6).toUpperCase();
    doc.text(`No.: ${receiptNo}`, 25, 105, { lineBreak: false });
    
    const d = new Date(tx.date);
    const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    doc.text(`Date: ${dateStr}`, 470, 105, { lineBreak: false });

    // === BODY LINES ===
    doc.lineWidth(0.8).strokeColor("#475569");
    doc.moveTo(25, 142).lineTo(575, 142).stroke(); // Line 1
    doc.moveTo(25, 178).lineTo(575, 178).stroke(); // Line 2
    doc.moveTo(25, 216).lineTo(575, 216).stroke(); // Line 3

    // Resolve details for Line 1 and Purpose
    const isExpense = tx.type === "expense";
    const nameLabel = isExpense ? "اسم گرامی / نام" : "اسم گرامی معطی";

    let personName = "";
    let purposeName = "";

    const categoryUrduMap = {
      "Fees": "فیس تعلیمی",
      "Kafalat": "کفالت",
      "Atiya": "عطیہ",
      "Zakat": "زکوٰۃ",
      "Sadqa": "صدقہ",
      "Isale Sawab": "ایصال ثواب",
      "Tankha": "تنخواہ",
      "Food": "خوراک / مطبخ",
      "Medical": "علاج معالجہ",
      "Wazifa": "وظیفہ",
      "Other": "متفرق"
    };

    if (tx.referenceId) {
      personName = tx.referenceId.nameUrdu || tx.referenceId.name || "";
      const father = tx.referenceId.fatherNameUrdu || tx.referenceId.fatherName;
      if (father) {
        personName += ` ولد ${father}`;
      }
      const studentCls = tx.referenceId.studentClass || tx.className || tx.referenceId.className;
      const roll = tx.referenceId.rollNumber;
      const metaParts = [];
      if (studentCls) metaParts.push(`کلاس: ${studentCls}`);
      if (roll) metaParts.push(`رول: ${roll}`);
      if (metaParts.length > 0) {
        personName += ` (${metaParts.join(" | ")})`;
      }

      purposeName = tx.category === "Fees" ? "فیس تعلیمی" : (categoryUrduMap[tx.category] || tx.description || tx.category || "");
    } else if (tx.description) {
      const salaryMatch = tx.description.match(/^(.+?)\s*(?:کی\s*تنخواہ|تنخواہ|salary)/i);
      if (salaryMatch) {
        personName = salaryMatch[1].trim();
        purposeName = "تنخواہ" + (tx.remarks ? ` (${tx.remarks})` : "");
      } else {
        const collMatch = tx.description.match(/^(.+?)\s*(?:یومیہ\s*وصولی|عطیہ|امداد|صدقہ|زکوٰۃ)/i);
        if (collMatch) {
          personName = collMatch[1].trim();
          purposeName = categoryUrduMap[tx.category] || tx.category || "عطیہ";
        } else {
          if (tx.type === "expense" && !tx.description.includes(" ")) {
            purposeName = tx.description;
          } else {
            personName = tx.description;
            purposeName = categoryUrduMap[tx.category] || tx.category || "";
          }
        }
      }
    } else {
      purposeName = categoryUrduMap[tx.category] || tx.category || "";
    }

    // Line 1: Name
    doc.fillColor("#0f172a");
    urduPdfHelper.drawTextRTL(doc, nameLabel, 575, 122, { font: urduFont, fontSize: 18 });
    if (personName) {
      urduPdfHelper.drawTextRTL(doc, personName, 460, 122, { 
        font: urduFont, 
        fontSize: personName.length > 35 ? 13 : 16 
      });
    }

    // Line 2: Address
    urduPdfHelper.drawTextRTL(doc, "مکمل پتہ:", 575, 158, { font: urduFont, fontSize: 18 });
    let addressText = "";
    if (tx.referenceId) {
      addressText = [tx.referenceId.address, tx.referenceId.city].filter(Boolean).join("، ");
    }
    if (addressText) {
      urduPdfHelper.drawTextRTL(doc, addressText, 510, 158, { font: urduFont, fontSize: 15 });
    }

    // Line 3: Amount in words & purpose
    // 5 dedicated non-overlapping zones:
    // Zone 1: [475 .. 575] Right label: رقم / اشیاء عبارت میں
    urduPdfHelper.drawTextRTL(doc, "رقم / اشیاء عبارت میں", 575, 196, { font: urduFont, fontSize: 16 });

    // Zone 2: [340 .. 465] Amount in words
    const amtWords = isUrduWords ? numberToWords(tx.amount, "ur") : numberToWords(tx.amount, "en");
    if (isUrduWords) {
      urduPdfHelper.drawTextRTL(doc, amtWords, 465, 196, {
        font: urduFont,
        fontSize: amtWords.length > 25 ? 13 : 15
      });
    } else {
      // English words using standard Helvetica-Bold with proper character & word spacing
      doc.font(englishBold).fillColor("#0f172a");
      let enFontSize = 9.5;
      if (amtWords.length > 32) enFontSize = 8;
      else if (amtWords.length > 24) enFontSize = 8.5;
      doc.fontSize(enFontSize);
      const textWidth = doc.widthOfString(amtWords);
      const startX = 335 + Math.max(0, (135 - textWidth) / 2);
      doc.text(amtWords, startX, 203, { lineBreak: false });
    }

    // Zone 3: [305 .. 330] Label: بمد
    urduPdfHelper.drawTextRTL(doc, "بمد", 330, 196, { font: urduFont, fontSize: 16 });

    // Zone 4: [135 .. 295] Purpose
    urduPdfHelper.drawTextRTL(doc, purposeName, 295, 196, {
      font: urduFont,
      fontSize: purposeName.length > 20 ? 13 : 15
    });

    // Zone 5: [25 .. 125] Left label: بشکریہ وصول ہوئے۔
    urduPdfHelper.drawTextRTL(doc, "بشکریہ وصول ہوئے۔", 125, 196, { font: urduFont, fontSize: 16 });

    // === AMOUNT BOX ===
    const boxY = 238;
    // Magenta "Rs." Box
    doc.fillColor("#be185d").rect(25, boxY, 42, 26).fill();
    doc.fillColor("white").font(englishBold).fontSize(14).text("Rs.", 33, boxY + 6);

    // White Box with border for amount
    doc.lineWidth(1.2).strokeColor("#1e3a8a").fillColor("#f8fafc");
    doc.rect(67, boxY, 125, 26).fillAndStroke();
    doc.fillColor("#0f172a").font(englishBold).fontSize(14).text(tx.amount.toLocaleString("en-IN"), 80, boxY + 6, { lineBreak: false });

    // === JAZAK ALLAH ===
    doc.fillColor("#0f172a");
    urduPdfHelper.drawTextRTL(doc, "جزاک اللہ", 390, 238, { font: urduFont, fontSize: 20 });

    // === SIGNATURES ===
    urduPdfHelper.drawTextRTL(doc, "دستخط وصول کنندہ", 360, 274, { font: urduFont, fontSize: 15 });
    urduPdfHelper.drawTextRTL(doc, "دستخط صدر", 150, 274, { font: urduFont, fontSize: 15 });

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
          
          const urduName = getLocalizedStudentName(student, 'ur');
          const urduClass = getLocalizedClassName(student.className, 'ur');
          doc.font(fontRegular);
          urduPdfHelper.drawTextRTL(doc, urduName, 460, y);
          urduPdfHelper.drawTextRTL(doc, urduClass, 350, y);
          
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
          
          const enName = getLocalizedStudentName(student, 'en');
          const enClass = getLocalizedClassName(student.className, 'en');

          doc.text((index + 1).toString(), 50, y, { width: 25 });
          doc.text((student.studentId || "N/A"), 75, y, { width: 50 });
          doc.text(enName.substring(0, 20), 125, y, { width: 100 });
          doc.text(enClass.substring(0, 15), 225, y, { width: 60 });
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
    const { className, classId, month, year, startDate, endDate } = req.query;
    const language = resolvePdfLanguage(req.query.language);
    const isUrdu = language === "ur";
    
    // The class parameter comes from req.query.className.
    // checkClassAccess middleware handles the RBAC before reaching here,
    // but just to be safe, we will leave the middleware check as is in the routes.
    // We can clean this redundant check up since checkClassAccess handles it.
    // If className is an ObjectId string, pass it as classId, otherwise as legacyClassName
    let cId = classId || null;
    let cName = className || null;
    if (className && className.match(/^[0-9a-fA-F]{24}$/)) {
      cId = className;
      cName = null;
    }
    const hasAccess = await verifyTeacherClassAccess(req.user, cId, cName);
    if (!hasAccess) {
      return res.status(403).json({ message: "Forbidden: Not assigned to this class" });
    }

    if (!cId && !cName) {
      return res.status(400).json({ message: "A valid class filter (classId or className) is required." });
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
          
          const nameVal = getLocalizedStudentName(student, 'ur');
          
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
          
          const nameVal = getLocalizedStudentName(student, 'en');
          doc.text((student.rollNumber || "-"), 50, y, { width: 40 });
          doc.text(nameVal.substring(0, 30), 90, y, { width: 150 });
          doc.text(totalWorkingDays.toString(), 250, y, { width: 50 });
          doc.text(present.toString(), 310, y, { width: 60 });
          doc.text(absent.toString(), 380, y, { width: 60 });
          doc.text(late.toString(), 450, y, { width: 50 });
          doc.text(`${percentage}%`, 510, y, { width: 40 });
          y += 15;
        });
      }}, null, { language, translatedTitle: isUrdu ? "کلاس حاضری کا خلاصہ" : "Class Attendance Summary" });

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

    const baseTitle = "Student Attendance Report";
    const translatedTitle = "طالب علم کی حاضری رپورٹ";

    generatePDF(
      res,
      baseTitle,
      (doc) => {
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
          let curY = doc.y;
          doc.fontSize(11).font(fontBold);
          const nameVal = getLocalizedStudentName(student, 'ur');
          const classVal = getLocalizedClassName(student.className || student.studentClass, 'ur');
          urduPdfHelper.drawTextRTL(doc, `${nameVal} :${URDU_LABELS.student}`, RIGHT_MARGIN, curY);
          curY += 18;

          doc.font(fontRegular).fontSize(10);
          if (student.rollNumber) {
            urduPdfHelper.drawTextRTL(doc, `${toUrduDigits(String(student.rollNumber))} :${URDU_LABELS.rollNumber}`, RIGHT_MARGIN, curY);
            curY += 16;
          }
          urduPdfHelper.drawTextRTL(doc, `${classVal} :${URDU_LABELS.className}`, RIGHT_MARGIN, curY);
          curY += 16;

          const periodDisplay = periodLabel === "All Time" ? "مکمل مدت" : (periodLabel || "مکمل مدت");
          urduPdfHelper.drawTextRTL(doc, `${periodDisplay} :${URDU_LABELS.period || "مدت"}`, RIGHT_MARGIN, curY);
          curY += 22;

          doc.font(fontBold).fontSize(10);
          urduPdfHelper.drawTextRTL(doc, `${toUrduDigits(String(totalWorkingDays || 0))} :${URDU_LABELS.totalWorkingDays}`, RIGHT_MARGIN, curY);
          doc.font(fontRegular);
          urduPdfHelper.drawTextRTL(doc, `${toUrduDigits(String(summary.present || 0))} :${URDU_LABELS.present}`, RIGHT_MARGIN - 150, curY);
          urduPdfHelper.drawTextRTL(doc, `${toUrduDigits(String(summary.absent || 0))} :${URDU_LABELS.absent}`, RIGHT_MARGIN - 270, curY);
          urduPdfHelper.drawTextRTL(doc, `${toUrduDigits(String(summary.late || 0))} :${URDU_LABELS.late}`, RIGHT_MARGIN - 390, curY);
          curY += 20;

          doc.fontSize(11);
          const attendedVal = summary.attended ?? ((summary.present || 0) + (summary.late || 0));
          urduPdfHelper.drawTextRTL(doc, `${toUrduDigits(String(summary.percentage || 0))}% (${toUrduDigits(String(attendedVal))} / ${toUrduDigits(String(totalWorkingDays || 0))}) :${URDU_LABELS.percentage}`, RIGHT_MARGIN, curY);
          curY += 22;

          doc.moveTo(LEFT_MARGIN, curY).lineTo(RIGHT_MARGIN, curY).stroke();
          curY += 14;

          // ── Date-wise table ──
          if (records.length === 0) {
            doc.font(fontRegular).fontSize(10);
            urduPdfHelper.drawTextRTL(doc, "حاضری کا کوئی ریکارڈ نہیں ملا۔", RIGHT_MARGIN, curY);
            return;
          }

          let y = curY;
          doc.font(fontBold).fontSize(9);
          urduPdfHelper.drawTextRTL(doc, URDU_LABELS.date, RIGHT_MARGIN, y);
          urduPdfHelper.drawTextRTL(doc, URDU_LABELS.day || "دن", RIGHT_MARGIN - 130, y);
          urduPdfHelper.drawTextRTL(doc, URDU_LABELS.status, RIGHT_MARGIN - 230, y);
          urduPdfHelper.drawTextRTL(doc, URDU_LABELS.remarks, RIGHT_MARGIN - 320, y);
          y += 14;
          doc.moveTo(LEFT_MARGIN, y).lineTo(RIGHT_MARGIN, y).stroke();
          y += 6;

          doc.font(fontRegular).fontSize(9);

          const DAY_NAMES_URDU = ["اتوار", "پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ"];

          for (const record of records) {
            if (y > 720) {
              doc.addPage();
              y = 50;
              doc.font(fontBold).fontSize(9);
              urduPdfHelper.drawTextRTL(doc, URDU_LABELS.date, RIGHT_MARGIN, y);
              urduPdfHelper.drawTextRTL(doc, URDU_LABELS.day || "دن", RIGHT_MARGIN - 130, y);
              urduPdfHelper.drawTextRTL(doc, URDU_LABELS.status, RIGHT_MARGIN - 230, y);
              urduPdfHelper.drawTextRTL(doc, URDU_LABELS.remarks, RIGHT_MARGIN - 320, y);
              y += 14;
              doc.moveTo(LEFT_MARGIN, y).lineTo(RIGHT_MARGIN, y).stroke();
              y += 6;
              doc.font(fontRegular).fontSize(9);
            }

            const d = new Date(record.date);
            const dateStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            const dayStr = DAY_NAMES_URDU[d.getDay()];

            let translatedStatus = record.status;
            if (record.status === "Present") translatedStatus = URDU_LABELS.present;
            else if (record.status === "Absent") translatedStatus = URDU_LABELS.absent;
            else if (record.status === "Late") translatedStatus = URDU_LABELS.late;
            else if (record.status === "Leave") translatedStatus = URDU_LABELS.leave || "چھٹی";

            const statusColors = { Present: "#16a34a", Absent: "#dc2626", Late: "#d97706", Leave: "#2563eb" };

            doc.fillColor("#000000");
            urduPdfHelper.drawTextRTL(doc, dateStr, RIGHT_MARGIN, y);
            urduPdfHelper.drawTextRTL(doc, dayStr, RIGHT_MARGIN - 130, y);

            doc.fillColor(statusColors[record.status] || "#000000");
            urduPdfHelper.drawTextRTL(doc, translatedStatus, RIGHT_MARGIN - 230, y);

            doc.fillColor("#000000");
            urduPdfHelper.drawTextRTL(doc, record.remarks || "", RIGHT_MARGIN - 320, y);

            y += 16;
          }

          y += 6;
          doc.moveTo(LEFT_MARGIN, y).lineTo(RIGHT_MARGIN, y).stroke();
          y += 8;
          doc.font(fontBold).fontSize(9).fillColor("#000000");
          urduPdfHelper.drawTextRTL(
            doc,
            `${toUrduDigits(records.length.toString())} :${URDU_LABELS.totalRecords || "کل ریکارڈز"} | ${toUrduDigits(summary.present.toString())} :${URDU_LABELS.present} | ${toUrduDigits(summary.absent.toString())} :${URDU_LABELS.absent} | ${toUrduDigits(summary.late.toString())} :${URDU_LABELS.late} | ${toUrduDigits(summary.percentage.toString())}% :${URDU_LABELS.percentage}`,
            RIGHT_MARGIN,
            y
          );

        } else {
          // ── Summary block ──
          const enName = getLocalizedStudentName(student, 'en');
          const enClass = getLocalizedClassName(student.className, 'en');
          doc.fontSize(11).font("Helvetica-Bold");
          doc.text(`Student: ${enName}`, 50);
          doc.font("Helvetica").fontSize(10);
          if (student.rollNumber) doc.text(`Roll No: ${student.rollNumber}`, 50);
          doc.text(`Class  : ${enClass}`, 50);
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
        }
      },
      null,
      {
        language,
        translatedTitle: isUrdu ? "طالب علم کی حاضری رپورٹ" : "Student Attendance Report"
      }
    );

  } catch (error) {
    console.error("Student Attendance PDF Error:", error);
    const status = error.status || 500;
    res.status(status).json({ message: error.message || "Error generating Student Attendance PDF" });
  }
};

exports.generateAcademicHistoryPDF = async (req, res) => {
  try {
    const language = resolvePdfLanguage(req.query.language);
    const isUrdu = language === "ur";
    const student = await Student.findById(req.params.id).populate("classId").populate("schoolClassId");
    if (!student) return res.status(404).json({ message: "Student not found" });

    const hasAccess = await verifyTeacherClassAccess(req.user, student.classId, student.studentClass || student.className);
    if (!hasAccess) {
       return res.status(403).json({ message: "Unauthorized to view this student's history" });
    }

    const allExams = await Exam.find().populate("classId").lean();
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
        
        const marksBySubject = {};
        results.forEach(r => { marksBySubject[r.subject] = r.marks; });
        let isAbsentInAny = false;
        exam.subjects.forEach(sub => {
          const m = marksBySubject[sub];
          if (m === undefined || m === null || m === -1) {
            isAbsentInAny = true;
          }
        });
        const calcRes = calculateResult({
          marks: obtainedMarks,
          maxMarks: totalMarks,
          passingMarks: isAbsentInAny ? totalMarks + 1 : (exam.passingMarks * exam.subjects.length)
        });
        let grade = isAbsentInAny ? "F" : calcRes.grade;
        hasFailed = isAbsentInAny ? true : !calcRes.passed;
        
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
          className: (exam.classId && (exam.classId.fullName || exam.classId.name)) || exam.class || "",
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
      const TABLE_LEFT = 50;
      const TABLE_RIGHT = 545;
      const HAS_ARABIC = /[\u0600-\u06FF]/;
      const EXAM_TYPE_UR = { monthly: "ماہانہ", "half-yearly": "ششماہی", halfyearly: "ششماہی", quarterly: "سہ ماہی", yearly: "سالانہ", annual: "سالانہ" };

      // Draws text vertically centred in a box; Urdu text is auto-detected and shaped RTL.
      const drawCell = (text, x, y, w, h, o = {}) => {
        const str = String(text === undefined || text === null ? "" : text);
        if (!str) return;
        const rtl = HAS_ARABIC.test(str);
        const font = o.font || (rtl ? "UrduFont" : "Helvetica");
        doc.font(font).fontSize(o.size || 10).fillColor(o.color || "#111111");
        const opts = { width: w - 8, align: o.align || "center", ellipsis: true };
        if (rtl) opts.features = ["rtla"];
        const th = Math.min(doc.heightOfString(str, opts), h);
        doc.text(str, x + 4, y + (h - th) / 2, { ...opts, height: h });
      };

      const localizeType = (t) => {
        const key = String(t || "").toLowerCase().trim();
        if (isUrdu) return EXAM_TYPE_UR[key] || t || "";
        return t ? String(t).charAt(0).toUpperCase() + String(t).slice(1) : "";
      };
      const examLabel = (h) => {
        const type = localizeType(h.examType);
        const name = h.examName && h.examName !== "Unnamed" ? h.examName : "";
        if (!name) return type;
        if (String(name).toLowerCase().trim() === String(h.examType || "").toLowerCase().trim()) return type;
        return type ? `${name} (${type})` : name;
      };

      // ---- Student profile ------------------------------------------------
      const nameVal = getLocalizedStudentName(student, language);
      const classVal = getLocalizedClassName(student.classId || student.schoolClassId || student.studentClass || student.className, language);
      const profileTop = doc.y;
      const profileW = TABLE_RIGHT - TABLE_LEFT;
      const profileRows = isUrdu
        ? [
            [URDU_LABELS.name, nameVal],
            [URDU_LABELS.rollNumber, student.rollNumber || "—"],
            [URDU_LABELS.className, classVal],
          ]
        : [
            ["Name", nameVal],
            ["Roll Number", student.rollNumber || "—"],
            ["Current Class", classVal],
          ];
      const profileRowH = 24;
      doc.rect(TABLE_LEFT, profileTop, profileW, profileRowH * profileRows.length + 28).fillAndStroke("#f3f7f5", "#9aa5a0");
      drawCell(isUrdu ? URDU_LABELS.profile : "STUDENT PROFILE", TABLE_LEFT, profileTop + 2, profileW, 24, { font: isUrdu ? "UrduFont" : "Helvetica-Bold", size: isUrdu ? 14 : 12, color: "#1e5c47" });
      profileRows.forEach(([label, value], i) => {
        const ry = profileTop + 28 + i * profileRowH;
        const labelW = 110;
        if (isUrdu) {
          drawCell(label, TABLE_RIGHT - labelW, ry, labelW, profileRowH, { size: 12, align: "right", font: "UrduFont" });
          drawCell(value, TABLE_LEFT, ry, profileW - labelW, profileRowH, { size: 12, align: "right" });
        } else {
          drawCell(label, TABLE_LEFT + 6, ry, labelW, profileRowH, { size: 10, align: "left", font: "Helvetica-Bold" });
          drawCell(value, TABLE_LEFT + labelW, ry, profileW - labelW, profileRowH, { size: 10, align: "left" });
        }
      });

      // ---- Academic history table ----------------------------------------
      let y = profileTop + profileRowH * profileRows.length + 28 + 18;
      drawCell(isUrdu ? "تعلیمی ریکارڈ" : "ACADEMIC HISTORY", TABLE_LEFT, y, TABLE_RIGHT - TABLE_LEFT, 24, {
        font: isUrdu ? "UrduFont" : "Helvetica-Bold", size: isUrdu ? 14 : 12, color: "#1e5c47", align: isUrdu ? "right" : "left",
      });
      y += 30;

      const widths = [28, 78, 108, 122, 62, 49, 48]; // sums to 495
      const headers = isUrdu
        ? ["شمار", URDU_LABELS.academicYear, URDU_LABELS.className, URDU_LABELS.examName, URDU_LABELS.percentage, URDU_LABELS.grade, URDU_LABELS.status]
        : ["#", "Academic Year", "Class", "Exam", "Percentage", "Grade", "Status"];
      const colX = [];
      let acc = 0;
      widths.forEach((w) => {
        colX.push(isUrdu ? TABLE_RIGHT - acc - w : TABLE_LEFT + acc);
        acc += w;
      });
      const HEADER_H = 26;
      const ROW_H = 26;

      const drawHeader = () => {
        widths.forEach((w, i) => {
          doc.rect(colX[i], y, w, HEADER_H).fillAndStroke("#1e5c47", "#ffffff");
          drawCell(headers[i], colX[i], y, w, HEADER_H, { font: isUrdu ? "UrduFont" : "Helvetica-Bold", size: isUrdu ? 11 : 9, color: "#ffffff" });
        });
        y += HEADER_H;
      };
      drawHeader();

      historyData.forEach((hist, idx) => {
        if (y + ROW_H > 740) {
          doc.addPage();
          y = doc.y;
          drawHeader();
        }
        const passed = hist.status === "Pass";
        const values = [
          String(idx + 1),
          hist.academicYear,
          getLocalizedClassName(hist.className, language),
          examLabel(hist),
          `${hist.percentage}%`,
          hist.grade,
          isUrdu ? (passed ? URDU_LABELS.pass : URDU_LABELS.fail) : (passed ? "Pass" : "Fail"),
        ];
        widths.forEach((w, i) => {
          doc.rect(colX[i], y, w, ROW_H).fillAndStroke(idx % 2 ? "#f3f7f5" : "#ffffff", "#9aa5a0");
          const isStatus = i === 6;
          drawCell(values[i], colX[i], y, w, ROW_H, {
            size: i === 3 || i === 2 ? 9.5 : 10,
            color: isStatus ? (passed ? "#15803d" : "#c62828") : "#111111",
            font: isStatus && !isUrdu ? "Helvetica-Bold" : undefined,
          });
        });
        y += ROW_H;
      });

      // ---- Total records -------------------------------------------------
      y += 12;
      if (isUrdu) {
        drawCell(`${historyData.length} :${URDU_LABELS.totalRecords}`, TABLE_LEFT, y, TABLE_RIGHT - TABLE_LEFT, 20, { font: "UrduFont", size: 11, align: "right" });
      } else {
        drawCell(`Total Records: ${historyData.length}`, TABLE_LEFT, y, TABLE_RIGHT - TABLE_LEFT, 20, { font: "Helvetica-Bold", size: 10, align: "left" });
      }
    }, null, { language: isUrdu ? 'ur' : 'en', translatedTitle: "تعلیمی ریکارڈ" });

  } catch (error) {
    res.status(500).json({ message: "Error generating PDF", error: error.message });
  }
};

exports.generateYearlyResultPDF = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate("classId").populate("schoolClassId");
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Enforce teacher RBAC
    if (req.user && req.user.role === "teacher") {
      const hasAccess = await verifyTeacherClassAccess(req.user, student.classId, student.studentClass || student.className);
      if (!hasAccess) {
         return res.status(403).json({ message: "Unauthorized to view this student's result" });
      }
    }

    const language = resolvePdfLanguage(req.query.language);
    const isUrdu = language === "ur";
    let { academicYear } = req.query;

    // Exams of the student's class (by classId or legacy class name)
    const classNames = [student.studentClass, student.className].filter(Boolean);
    const classMatch = [];
    if (student.classId) {
      classMatch.push({ classId: student.classId._id || student.classId });
      if (student.classId.name) classMatch.push({ class: student.classId.name });
      if (student.classId.fullName) classMatch.push({ class: student.classId.fullName });
    }
    if (classNames.length) classMatch.push({ class: { $in: classNames } });
    if (classMatch.length === 0) {
      return res.status(404).json({ message: "Student has no class assigned" });
    }

    const allClassExams = await Exam.find({ $or: classMatch }).populate("classId").sort({ createdAt: -1 }).lean();
    if (allClassExams.length === 0) {
      return res.status(404).json({ message: "No exams found for this student's class" });
    }

    // Academic year is optional: default to the most recent one that has exams
    if (!academicYear) academicYear = allClassExams[0].academicYear;
    const exams = allClassExams.filter((e) => e.academicYear === academicYear);
    if (exams.length === 0) {
      return res.status(404).json({ message: "No exams found for this academic year" });
    }

    // Use the Yearly exam if present, otherwise combine all exams of the year
    const isYearlyType = (e) => ["yearly", "annual"].includes(String(e.examType || "").toLowerCase().trim());
    const yearlyExam = exams.find(isYearlyType);
    const targetExams = yearlyExam ? [yearlyExam] : exams;

    const examIds = targetExams.map((e) => e._id);
    const results = await ExamResult.find({ studentId: student._id, examId: { $in: examIds } }).lean();
    if (results.length === 0) {
      return res.status(404).json({ message: "No results found for this student in the selected academic year" });
    }

    const nameVal = getLocalizedStudentName(student, language);
    const classVal = getLocalizedClassName(student.classId || student.schoolClassId || student.studentClass || student.className, language);
    const reportTitle = isUrdu ? "سالانہ نتیجہ" : "Yearly Result";

    generatePDF(res, reportTitle, (doc) => {
      const RIGHT_MARGIN = 550;
      const LEFT_MARGIN = 50;

      if (isUrdu) {
        urduPdfHelper.drawTextRTL(doc, URDU_LABELS.profile, RIGHT_MARGIN, doc.y, { font: "UrduFont", fontSize: 14 });
        doc.moveDown(0.5);
        
        urduPdfHelper.drawTextRTL(doc, `${nameVal} :${URDU_LABELS.name}`, RIGHT_MARGIN, doc.y, { font: "UrduFont", fontSize: 12 });
        urduPdfHelper.drawTextRTL(doc, `${student.rollNumber || "—"} :${URDU_LABELS.rollNumber}`, RIGHT_MARGIN, doc.y, { font: "UrduFont", fontSize: 12 });
        urduPdfHelper.drawTextRTL(doc, `${classVal} :${URDU_LABELS.className}`, RIGHT_MARGIN, doc.y, { font: "UrduFont", fontSize: 12 });
        urduPdfHelper.drawTextRTL(doc, `${academicYear} :${URDU_LABELS.academicYear}`, RIGHT_MARGIN, doc.y, { font: "UrduFont", fontSize: 12 });
        doc.moveDown();

        targetExams.forEach(exam => {
          const studentResults = results.filter(r => String(r.examId) === String(exam._id));
          if (studentResults.length === 0) return;

          urduPdfHelper.drawTextRTL(doc, `${exam.name || exam.examName || exam.examType}`, RIGHT_MARGIN, doc.y, { font: "UrduFont", fontSize: 12 });
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
          
          let isAbsentInAny = false;
          exam.subjects.forEach(sub => {
            if (subjectMarks[sub] === null || subjectMarks[sub] === "Absent") {
              isAbsentInAny = true;
            }
          });
          const calcRes = calculateResult({
            marks: obtainedMarks,
            maxMarks: totalMarks,
            passingMarks: isAbsentInAny ? totalMarks + 1 : (exam.passingMarks * exam.subjects.length)
          });
          let grade = isAbsentInAny ? "F" : calcRes.grade;
          hasFailed = isAbsentInAny ? true : !calcRes.passed;

          const tableTop = doc.y;
          doc.font("UrduFont").fontSize(12);
          urduPdfHelper.drawTextRTL(doc, URDU_LABELS.subject, RIGHT_MARGIN, tableTop);
          urduPdfHelper.drawTextRTL(doc, URDU_LABELS.maxMarks, 300, tableTop);
          urduPdfHelper.drawTextRTL(doc, URDU_LABELS.obtainedMarks, 150, tableTop);
          doc.moveTo(LEFT_MARGIN, tableTop + 20).lineTo(RIGHT_MARGIN, tableTop + 20).stroke();
          
          let y = tableTop + 30;
          
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
          y += 10;
          
          const totalUrdu = `${totalMarks} :${URDU_LABELS.totalMarks}   |   ${obtainedMarks} :${URDU_LABELS.obtainedMarks}   |   ${percentage.toFixed(2)}% :${URDU_LABELS.percentage}   |   ${grade} :${URDU_LABELS.grade}   |   ${hasFailed ? URDU_LABELS.fail : URDU_LABELS.pass} :${URDU_LABELS.status}`;
          urduPdfHelper.drawTextRTL(doc, totalUrdu, RIGHT_MARGIN, y);
          doc.moveDown(2);
        });
      } else {
        doc.fontSize(14).font("Helvetica-Bold").text("STUDENT PROFILE", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).font("Helvetica");
        doc.text(`Name: ${nameVal}`);
        doc.text(`Roll Number: ${student.rollNumber || "—"}`);
        doc.text(`Class: ${classVal}`);
        doc.text(`Academic Year: ${academicYear}`);
        doc.moveDown();

        targetExams.forEach(exam => {
          const studentResults = results.filter(r => String(r.examId) === String(exam._id));
          if (studentResults.length === 0) return;

          doc.fontSize(12).font("Helvetica-Bold").text(`${exam.name || exam.examName || exam.examType}`);
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
          
          let isAbsentInAny = false;
          exam.subjects.forEach(sub => {
            if (subjectMarks[sub] === null || subjectMarks[sub] === "Absent") {
              isAbsentInAny = true;
            }
          });
          const calcRes = calculateResult({
            marks: obtainedMarks,
            maxMarks: totalMarks,
            passingMarks: isAbsentInAny ? totalMarks + 1 : (exam.passingMarks * exam.subjects.length)
          });
          let grade = isAbsentInAny ? "F" : calcRes.grade;
          hasFailed = isAbsentInAny ? true : !calcRes.passed;

          const tableTop = doc.y;
          doc.font("Helvetica-Bold").fontSize(10);
          doc.text("Subject", LEFT_MARGIN, tableTop);
          doc.text("Max Marks", 250, tableTop);
          doc.text("Obtained", 400, tableTop);
          doc.moveTo(LEFT_MARGIN, tableTop + 15).lineTo(RIGHT_MARGIN, tableTop + 15).stroke();
          
          let y = tableTop + 20;
          doc.font("Helvetica");

          exam.subjects.forEach(sub => {
            if (y > 700) { doc.addPage(); y = 50; }
            doc.text(sub, LEFT_MARGIN, y);
            doc.text(exam.maxMarks.toString(), 250, y);
            const m = subjectMarks[sub];
            doc.text(m === null || m === "Absent" ? "Absent" : m.toString(), 400, y);
            y += 20;
          });

          doc.moveTo(LEFT_MARGIN, y).lineTo(RIGHT_MARGIN, y).stroke();
          y += 10;
          doc.font("Helvetica-Bold");
          doc.text(`Total Marks: ${totalMarks}  |  Obtained: ${obtainedMarks}  |  Percentage: ${percentage.toFixed(2)}%  |  Grade: ${grade}  |  Result: ${hasFailed ? 'FAIL' : 'PASS'}`, LEFT_MARGIN, y);
          doc.moveDown(2);
        });
      }
    }, null, { language: isUrdu ? 'ur' : 'en', translatedTitle: reportTitle });
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
    const students = await Student.find(matchQuery).populate("classId").lean();

    // Sort students numerically by roll number
    students.sort((a, b) => {
      const numA = parseInt(a.rollNumber, 10);
      const numB = parseInt(b.rollNumber, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a.rollNumber || "").localeCompare(String(b.rollNumber || ""));
    });

    const translatedTitle = isUrdu ? "طلبہ کی فہرست" : "Student List";

    generatePDF(res, "Student List", (doc) => {
      let y = doc.y || 150;

      const drawHeader = () => {
        if (isUrdu) {
          doc.font("UrduFont").fontSize(12);
          urduPdfHelper.drawTextRTL(doc, "رول نمبر", 550, y, { font: "UrduFont", fontSize: 12 });
          urduPdfHelper.drawTextRTL(doc, "نام طالب علم", 460, y, { font: "UrduFont", fontSize: 12 });
          urduPdfHelper.drawTextRTL(doc, "جماعت", 250, y, { font: "UrduFont", fontSize: 12 });
          urduPdfHelper.drawTextRTL(doc, "رابطہ نمبر", 120, y, { font: "UrduFont", fontSize: 12 });
        } else {
          doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000");
          doc.text("Roll No", 50, y);
          doc.text("Student Name", 130, y);
          doc.text("Class", 340, y);
          doc.text("Phone", 440, y);
        }
        y += 16;
        doc.moveTo(50, y).lineTo(550, y).strokeColor("#2b2b2b").lineWidth(0.8).stroke();
        y += 10;
      };

      drawHeader();

      students.forEach(student => {
        if (y > 720) {
          doc.addPage();
          y = 50;
          drawHeader();
        }

        const roll = student.rollNumber || "-";
        const nameVal = getLocalizedStudentName(student, language);
        const classVal = getLocalizedClassName(student.classId || student.studentClass || student.className, language);
        const phoneVal = student.contactNumber || student.whatsapp || student.guardianContact || student.phone || "-";

        if (isUrdu) {
          doc.font("Helvetica").fontSize(10).fillColor("#000000");
          doc.text(roll, 510, y + 2, { width: 40, align: "center" });

          doc.font("UrduFont").fontSize(12).fillColor("#000000");
          urduPdfHelper.drawTextRTL(doc, nameVal, 460, y, { font: "UrduFont", fontSize: 12 });
          urduPdfHelper.drawTextRTL(doc, classVal, 250, y, { font: "UrduFont", fontSize: 12 });

          doc.font("Helvetica").fontSize(10).fillColor("#000000");
          doc.text(phoneVal, 50, y + 2, { width: 80, align: "center" });
        } else {
          doc.font("Helvetica").fontSize(10).fillColor("#000000");
          doc.text(roll, 50, y);
          doc.text(nameVal, 130, y, { width: 190 });
          doc.text(classVal, 340, y, { width: 90 });
          doc.text(phoneVal, 440, y);
        }

        y += 22;
      });
    }, null, { language: isUrdu ? 'ur' : 'en', translatedTitle });

  } catch (error) {
    res.status(500).json({ message: "Error generating Student List PDF", error: error.message });
  }
};


exports.generateTeacherIdCard = async (req, res) => {
  try {
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid teacher ID format" });
    }

    const teacher = await Teacher.findById(req.params.id).populate('teachingAssignments.classId assignedClassIds');
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    if (req.user.role === 'teacher' && req.user._id.toString() !== teacher.userId.toString()) {
      return res.status(403).json({ message: "Unauthorized to access this teacher's ID card" });
    }

    const doc = new PDFDocument({
      size: [243, 153],
      margin: 0
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Teacher_ID_Card_${teacher._id}.pdf"`);
    doc.pipe(res);

    const language = resolvePdfLanguage(req.query.language);
    const isUrdu = language === "ur";
    const fontRegular = isUrdu ? "UrduFont" : PDF_FONT_PATHS.english;
    const fontBold = isUrdu ? "UrduFont" : PDF_FONT_PATHS.englishBold;

    if (isUrdu && fs.existsSync(PDF_FONT_PATHS.urdu)) {
      doc.registerFont("UrduFont", PDF_FONT_PATHS.urdu);
    } else if (isUrdu) {
      doc.registerFont("UrduFont", "Helvetica");
    }

    // Border
    doc.rect(2, 2, 239, 149).strokeColor('#047857').lineWidth(1.5).stroke();

    // Top Header Banner
    doc.rect(2, 2, 239, 36).fill('#047857');
    
    // Logo
    const logoPath = path.join(__dirname, "../../../client/public/logo1.jpeg");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 8, 6, { height: 26 });
    }

    // Header Text
    doc.fillColor('white');
    if (isUrdu) {
      doc.font(fontBold).fontSize(13);
      urduPdfHelper.drawTextRTL(doc, "جامعہ دعوتِ ایمان", 230, 8, { font: fontBold, fontSize: 13, color: 'white' });
      doc.font(fontRegular).fontSize(8);
      urduPdfHelper.drawTextRTL(doc, "استاد شناختی کارڈ", 230, 24, { font: fontRegular, fontSize: 8, color: 'white' });
    } else {
      doc.font(fontBold).fontSize(11).text("JAMIA DAWAT-UL-EIMAN", 42, 9, { width: 195, align: 'center' });
      doc.font(fontRegular).fontSize(8).text("Teacher Identity Card", 42, 22, { width: 195, align: 'center' });
    }

    // Photo Box
    const photoX = 12;
    const photoY = 48;
    const photoWidth = 60;
    const photoHeight = 75;
    
    // Draw photo border
    doc.rect(photoX, photoY, photoWidth, photoHeight).lineWidth(1).strokeColor('#ccc').stroke();

    if (teacher.photo) {
      let photoFsPath = teacher.photo;
      if (teacher.photo.startsWith('/uploads')) {
        photoFsPath = path.join(__dirname, "../../", teacher.photo);
      } else if (!path.isAbsolute(teacher.photo)) {
        photoFsPath = path.join(__dirname, "../../public", teacher.photo);
      }
      
      if (fs.existsSync(photoFsPath)) {
        doc.image(photoFsPath, photoX, photoY, { width: photoWidth, height: photoHeight });
      } else {
        drawPlaceholderPhoto();
      }
    } else {
      drawPlaceholderPhoto();
    }

    function drawPlaceholderPhoto() {
      doc.font(PDF_FONT_PATHS.englishBold).fontSize(28).fillColor('#aaa').text(
        (teacher.name || "T").charAt(0).toUpperCase(),
        photoX, photoY + 22,
        { width: photoWidth, align: 'center' }
      );
    }

    // Teacher Details
    doc.fillColor('black');
    const labelX = 82;
    let currentY = 48;

    const nameStr = getLocalizedTeacherName(teacher, language);

    if (isUrdu) {
      doc.fontSize(11).font(fontBold);
      urduPdfHelper.drawTextRTL(doc, nameStr, 230, currentY);
      currentY += 15;
    } else {
      doc.fontSize(12).font(fontBold).text(nameStr, labelX, currentY, { width: 150 });
      currentY += 16;
    }

    // Teaching Assignments
    let assignmentsGroups = {};
    if (teacher.teachingAssignments && teacher.teachingAssignments.length > 0) {
      teacher.teachingAssignments.forEach(a => {
        if (a.classId) {
          const cName = a.classId.fullName || a.classId.name || "Unknown Class";
          if (!assignmentsGroups[cName]) assignmentsGroups[cName] = [];
          assignmentsGroups[cName].push(a.subjectId);
        }
      });
    } else if (teacher.assignedClassIds && teacher.assignedClassIds.length > 0) {
      teacher.assignedClassIds.forEach(c => {
        if (c) {
          const cName = c.fullName || c.name || "Unknown Class";
          assignmentsGroups[cName] = [];
        }
      });
    }

    const classesList = Object.keys(assignmentsGroups);
    if (classesList.length > 0) {
      if (isUrdu) {
        doc.fontSize(9).font(fontRegular).fillColor('#666');
        urduPdfHelper.drawTextRTL(doc, "مضامین:", 230, currentY);
        currentY += 12;
        doc.fillColor('black');
        
        // Overflow control: display max 4 lines
        let renderedLines = 0;
        for (let i = 0; i < classesList.length; i++) {
          if (renderedLines >= 4) {
             urduPdfHelper.drawTextRTL(doc, "...", 230, currentY);
             break;
          }
          const cName = classesList[i];
          const subs = assignmentsGroups[cName];
          let lineStr = cName;
          if (subs && subs.length > 0) {
            lineStr += " — " + subs.join("، ");
          }
          doc.fontSize(8);
          urduPdfHelper.drawTextRTL(doc, lineStr, 230, currentY);
          currentY += 11;
          renderedLines++;
        }
      } else {
        doc.fontSize(8).font(fontBold).fillColor('#666').text("Assignments:", labelX, currentY);
        currentY += 10;
        doc.fillColor('black').font(fontRegular);
        
        let renderedLines = 0;
        for (let i = 0; i < classesList.length; i++) {
          if (renderedLines >= 4) {
             doc.text("...", labelX, currentY);
             break;
          }
          const cName = classesList[i];
          const subs = assignmentsGroups[cName];
          let lineStr = cName;
          if (subs && subs.length > 0) {
            lineStr += " — " + subs.join(", ");
          }
          doc.text(lineStr, labelX, currentY, { width: 155, height: 11, lineBreak: false, ellipsis: true });
          currentY += 11;
          renderedLines++;
        }
      }
    }

    // Bottom Accent
    doc.rect(2, 138, 239, 13).fill('#047857');
    doc.fillColor('white').font(PDF_FONT_PATHS.english).fontSize(6).text("Issued by Jamia Dawat-ul-Eiman Administration", 0, 142, { align: 'center', width: 243 });

    doc.end();

  } catch (error) {
    console.error("Teacher ID Card generation failed:", error);
    res.status(500).json({ message: "Failed to generate ID card" });
  }
};


exports.generateCombinedResultPDF = async (req, res) => {
  try {
    const { fetchCombinedStudentResult } = require('./reportController');
    const language = resolvePdfLanguage(req.query.language);
    const isUrdu = language === 'ur';
    
    // Fetch data using the newly isolated Phase 4A logic
    let combinedData;
    try {
      combinedData = await fetchCombinedStudentResult(req.params.id, req.query, req.user);
    } catch (e) {
      if (e.message.includes('authorized')) return res.status(403).json({ message: e.message });
      if (e.message.includes('not found')) return res.status(404).json({ message: e.message });
      return res.status(400).json({ message: e.message });
    }

    if (combinedData.requiresExamSelection) {
      return res.status(400).json(combinedData);
    }

    const { student, madrasa, school, combined } = combinedData;

    const LABELS = {
      en: {
        title: "STUDENT RESULT",
        studentInfo: "Student Information",
        partA: "PART (A) — DEENI EDUCATION",
        partB: "PART (B) — ASRI EDUCATION",
        class: "Class",
        section: "Section",
        subject: "Subject",
        max: "Max",
        obtained: "Obtained",
        remarks: "Remarks",
        total: "Total",
        percentage: "Percentage",
        grade: "Grade",
        combined: "COMBINED RESULT",
        totalMarks: "Total Marks",
        admissionNo: "Admission No",
        name: "Name",
        absent: "Absent",
        pass: "Pass",
        fail: "Fail"
      },
      ur: {
        title: "طالب علم کا نتیجہ",
        studentInfo: "طالب علم کی معلومات",
        partA: "حصہ (الف) — دینی تعلیم",
        partB: "حصہ (ب) — عصری تعلیم",
        class: "درجہ",
        section: "سیکشن",
        subject: "مضمون",
        max: "کل نمبر",
        obtained: "حاصل کردہ",
        remarks: "کیفیت",
        total: "میزان",
        percentage: "فیصد",
        grade: "گریڈ",
        combined: "مجموعی نتیجہ",
        totalMarks: "کل نمبر",
        admissionNo: "داخلہ نمبر",
        name: "نام",
        absent: "غیر حاضر",
        pass: "پاس",
        fail: "فیل"
      }
    };
    
    const l = LABELS[isUrdu ? 'ur' : 'en'];
    const isUrduTextStr = (str) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(str);

    generatePDF(res, "Combined Result", (doc) => {
      if (fs.existsSync(PDF_FONT_PATHS.urdu)) {
        doc.registerFont("UrduFont", PDF_FONT_PATHS.urdu);
      }
      
      const drawText = (text, x, y, options = {}) => {
        const textStr = String(text || '');
        if (isUrduTextStr(textStr)) {
          urduPdfHelper.drawTextRTL(doc, textStr, x, y, { font: "UrduFont", fontSize: options.fontSize || 10, ...options });
        } else {
          doc.font(options.font || "Helvetica").fontSize(options.fontSize || 10).text(textStr, x, y, options);
        }
      };

      let y = 100;
      const leftMargin = 50;

      // Title
      drawText(l.title, 0, doc.y, { font: "Helvetica-Bold", fontSize: 16, align: "center", width: doc.page.width });
      doc.moveDown(2);

      // Student Info
      drawText(l.studentInfo, leftMargin, doc.y, { font: "Helvetica-Bold", fontSize: 12 });
      doc.moveDown(0.2);
      doc.font("Helvetica").fontSize(10).text("────────────────────────────", leftMargin, doc.y);
      doc.moveDown(0.5);
      
      let studentName = getLocalizedStudentName(student, language);
      
      drawText(l.name + ":", leftMargin, doc.y, { font: "Helvetica-Bold" });
      drawText(studentName, leftMargin + 80, doc.y);
      doc.moveDown(1);
      drawText(l.admissionNo + ":", leftMargin, doc.y, { font: "Helvetica-Bold" });
      drawText(student.admissionNumber || "N/A", leftMargin + 80, doc.y);
      doc.moveDown(1.5);

      // PART (A)
      if (madrasa && madrasa.resultsAvailable) {
        drawText(l.partA, leftMargin, doc.y, { font: "Helvetica-Bold", fontSize: 12 });
        doc.moveDown(1);
        
        drawText(l.class + ":", leftMargin, doc.y, { font: "Helvetica-Bold", fontSize: 10 });
        drawText(getLocalizedClassName(madrasa.class.name, language), leftMargin + 50, doc.y);
        doc.moveDown(1);
        
        let startY = doc.y;
        drawText(l.subject, leftMargin, startY, { font: "Helvetica-Bold" });
        drawText(l.max, leftMargin + 200, startY, { font: "Helvetica-Bold" });
        drawText(l.obtained, leftMargin + 270, startY, { font: "Helvetica-Bold" });
        drawText(l.remarks, leftMargin + 350, startY, { font: "Helvetica-Bold" });
        doc.moveDown(1);
        
        madrasa.subjects.forEach(sub => {
          let y = doc.y;
          drawText(sub.subject, leftMargin, y);
          drawText(sub.maxMarks.toString(), leftMargin + 200, y);
          drawText(sub.marks === -1 ? l.absent : sub.marks.toString(), leftMargin + 270, y);
          drawText(sub.marks >= sub.passingMarks ? l.pass : l.fail, leftMargin + 350, y);
          doc.moveDown(1.5);
        });

        doc.moveDown(0.5);
        drawText(l.total, leftMargin, doc.y, { font: "Helvetica-Bold" });
        drawText(madrasa.totals.maxMarks.toString(), leftMargin + 200, doc.y);
        drawText(madrasa.totals.obtainedMarks.toString(), leftMargin + 270, doc.y);
        doc.moveDown(1);
        
        drawText(l.percentage, leftMargin, doc.y, { font: "Helvetica-Bold" });
        drawText(madrasa.totals.percentage.toFixed(2) + "%", leftMargin + 270, doc.y);
        doc.moveDown(2);
      }

      // PART (B)
      if (school && school.resultsAvailable) {
        drawText(l.partB, leftMargin, doc.y, { font: "Helvetica-Bold", fontSize: 12 });
        doc.moveDown(1);
        
        drawText(l.class + ":", leftMargin, doc.y, { font: "Helvetica-Bold", fontSize: 10 });
        drawText(school.class.name, leftMargin + 50, doc.y);
        
        if (school.class.section) {
          doc.moveDown(1);
          drawText(l.section + ":", leftMargin, doc.y, { font: "Helvetica-Bold", fontSize: 10 });
          drawText(school.class.section, leftMargin + 50, doc.y);
        }
        doc.moveDown(1);
        
        let startY = doc.y;
        drawText(l.subject, leftMargin, startY, { font: "Helvetica-Bold" });
        drawText(l.max, leftMargin + 200, startY, { font: "Helvetica-Bold" });
        drawText(l.obtained, leftMargin + 270, startY, { font: "Helvetica-Bold" });
        drawText(l.remarks, leftMargin + 350, startY, { font: "Helvetica-Bold" });
        doc.moveDown(1);
        
        school.subjects.forEach(sub => {
          let y = doc.y;
          drawText(sub.subject, leftMargin, y);
          drawText(sub.maxMarks.toString(), leftMargin + 200, y);
          drawText(sub.marks === -1 ? l.absent : sub.marks.toString(), leftMargin + 270, y);
          drawText(sub.marks >= sub.passingMarks ? l.pass : l.fail, leftMargin + 350, y);
          doc.moveDown(1.5);
        });

        doc.moveDown(0.5);
        drawText(l.total, leftMargin, doc.y, { font: "Helvetica-Bold" });
        drawText(school.totals.maxMarks.toString(), leftMargin + 200, doc.y); 
        drawText(school.totals.obtainedMarks.toString(), leftMargin + 270, doc.y);
        doc.moveDown(1);
        
        drawText(l.percentage, leftMargin, doc.y, { font: "Helvetica-Bold" });
        drawText(school.totals.percentage.toFixed(2) + "%", leftMargin + 270, doc.y);
        doc.moveDown(2);
      }

      // COMBINED
      if (combined) {
        doc.font("Helvetica").fontSize(10).text("────────────────────────────", leftMargin, doc.y);
        doc.moveDown(0.5);
        drawText(l.combined, leftMargin, doc.y, { font: "Helvetica-Bold", fontSize: 12 });
        doc.moveDown(1);
        
        drawText(l.totalMarks + ":", leftMargin, doc.y, { font: "Helvetica-Bold" });
        drawText(`${combined.obtainedMarks} / ${combined.maxMarks}`, leftMargin + 150, doc.y);
        doc.moveDown(1);
        
        drawText(l.percentage + ":", leftMargin, doc.y, { font: "Helvetica-Bold" });
        drawText(`${combined.percentage.toFixed(3)}%`, leftMargin + 150, doc.y);
        doc.moveDown(1);
        
        drawText(l.grade + ":", leftMargin, doc.y, { font: "Helvetica-Bold" });
        drawText(`${combined.grade}`, leftMargin + 150, doc.y);
        doc.moveDown(1);
        
        doc.font("Helvetica").text("────────────────────────────", leftMargin, doc.y);
      }

    });
  } catch (error) {
    console.error("Combined Result PDF generation failed:", error);
    res.status(500).json({ message: "Failed to generate combined result pdf", error: error.message });
  }
};
