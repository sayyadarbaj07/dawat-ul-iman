/**
 * marksheetRenderer.js
 *
 * Provides a clean, elegant, perfectly formatted student marksheet/report card
 * designed for Jamia Dawat-ul-Eiman.
 *
 * Features:
 *  - Works seamlessly with applyInstitutionalTemplate (official green double border & letterhead).
 *  - Separate cells for Urdu and English/numerical text to completely eliminate fontkit RTL text reversal/corruption.
 *  - Two-row structured Student Profile & Examination Info Card with zero overlapping text.
 *  - Professional tabular Marks Table with header, borders, alternating zebra striping, and total row.
 *  - 5 Performance Summary Cards (Total Marks, Obtained, Percentage, Grade, and Pass/Fail Badge).
 *  - Grading scale guide and official signature & stamp boxes at the bottom.
 *  - Full bilingual support (Urdu 'ur' and English 'en').
 */

const path = require("path");
const fs = require("fs");
const { calculateResult } = require("../grading");
const {
  getLocalizedStudentName,
  getLocalizedFatherName,
  getLocalizedClassName,
  transliterateUrduToEnglish,
} = require("../transliteration");
const urduPdfHelper = require("./urduPdfHelper");

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

const EXAM_TYPE_URDU = {
  monthly: "ماہانہ امتحان",
  "half-yearly": "ششماہی امتحان",
  halfyearly: "ششماہی امتحان",
  quarterly: "سہ ماہی امتحان",
  yearly: "سالانہ امتحان",
  annual: "سالانہ امتحان",
};

const EXAM_TYPE_EN = {
  monthly: "Monthly Exam",
  "half-yearly": "Half-Yearly Exam",
  halfyearly: "Half-Yearly Exam",
  quarterly: "Quarterly Exam",
  yearly: "Annual Exam",
  annual: "Annual Exam",
};

const COMMON_SUBJECT_EN = {
  "ادب و انشاء": "Adab wa Insha",
  "قرآن مجید": "Quran Majeed",
  "قرآن کریم": "Quran Karim",
  "حفظ قرآن": "Hifz-ul-Quran",
  "ناظرہ قرآن": "Nazira Quran",
  "حدیث شریف": "Hadith Sharif",
  "اصول حدیث": "Usool-e-Hadith",
  "فقہ": "Fiqh",
  "اصول فقہ": "Usool-e-Fiqh",
  "عقائد": "Aqaid",
  "سیرت": "Seerat",
  "تاریخ اسلام": "Tareekh-e-Islam",
  "صرف و نحو": "Sarf wa Nahw",
  "نحو": "Nahw",
  "صرف": "Sarf",
  "ترجمہ قرآن": "Tarjuma Quran",
  "تفسیر": "Tafseer",
  "منطق": "Mantiq",
  "عربی ادب": "Arabic Literature",
  "دینیات": "Deeniyat",
  "اردو": "Urdu",
  "مراٹھی": "Marathi",
  "انگریزی": "English",
  "ریاضی": "Mathematics",
  "سائنس": "Science",
  "ہندی": "Hindi",
  "عمومی معلومات": "General Knowledge",
  "کمپیوٹر": "Computer",
};

/**
 * Computes marks, grades, and rows for an exam.
 */
function computeExamStats(exam, results) {
  const subjects = exam.subjects || [];
  const passingMarks = typeof exam.passingMarks === "number" ? exam.passingMarks : 35;
  const maxMarks = typeof exam.maxMarks === "number" ? exam.maxMarks : 100;

  const subjectMarks = {};
  subjects.forEach((s) => { subjectMarks[s] = null; });

  (results || []).forEach((r) => {
    if (subjects.includes(r.subject)) {
      if (r.marks === -1 || r.marks === "Absent" || r.marks === "ABSENT") {
        subjectMarks[r.subject] = "ABSENT";
      } else if (typeof r.marks === "number") {
        subjectMarks[r.subject] = r.marks;
      }
    }
  });

  let obtainedMarks = 0;
  let isAbsentAny = false;
  let hasFailedSubject = false;

  subjects.forEach((s) => {
    const m = subjectMarks[s];
    if (m === null || m === "ABSENT") {
      isAbsentAny = true;
    } else {
      obtainedMarks += m;
      if (m < passingMarks) {
        hasFailedSubject = true;
      }
    }
  });

  const totalMaxMarks = subjects.length * maxMarks;
  const totalPassingMarks = subjects.length * passingMarks;
  const percentage = totalMaxMarks > 0 ? (obtainedMarks / totalMaxMarks) * 100 : 0;

  const calcRes = calculateResult({
    marks: obtainedMarks,
    maxMarks: totalMaxMarks,
    passingMarks: isAbsentAny ? totalMaxMarks + 1 : totalPassingMarks,
  });

  const grade = isAbsentAny ? "F" : calcRes.grade;
  const passed = isAbsentAny ? false : (calcRes.passed && !hasFailedSubject);

  const rows = subjects.map((sub, idx) => {
    const m = subjectMarks[sub];
    let status = "";
    if (m === "ABSENT" || m === null) status = "ABSENT";
    else if (m < passingMarks) status = "FAIL";
    else status = "PASS";

    return {
      sno: String(idx + 1),
      subject: sub,
      max: maxMarks,
      pass: passingMarks,
      obtained: m,
      status,
    };
  });

  return {
    rows,
    totalMaxMarks,
    totalPassingMarks,
    obtainedMarks,
    percentage,
    grade,
    passed,
    isAbsentAny,
  };
}

/**
 * Draws text cleanly inside a bounding box.
 * Separates font and RTL features so Arabic and Latin text are never scrambled.
 */
function drawTextInBox(doc, text, x, y, w, h, opts = {}) {
  if (text === undefined || text === null || text === "") return;
  const str = String(text);
  const isArabic = ARABIC_RE.test(str);
  const font = opts.font || (isArabic ? "UrduFont" : (opts.bold ? "Helvetica-Bold" : "Helvetica"));
  const size = opts.size || (isArabic ? 11.5 : 9.5);
  const color = opts.color || "#0f172a";
  const align = opts.align || (isArabic ? "right" : "center");
  const pad = opts.pad !== undefined ? opts.pad : 4;

  doc.save();
  doc.font(font).fontSize(size).fillColor(color);

  const textOpts = {
    width: Math.max(1, w - pad * 2),
    align,
    lineBreak: false,
    ellipsis: true,
  };
  if (isArabic) {
    textOpts.features = ["rtla"];
  }

  const th = doc.heightOfString(str, textOpts);
  const ty = y + (opts.valign === "top" ? pad : Math.max(0, (h - th) / 2));
  doc.text(str, x + pad, ty, textOpts);
  doc.restore();
}

/**
 * Renders a complete, beautifully structured student marksheet on the current page of doc.
 */
function drawStudentMarksheet(doc, { student, exam, results, language = "ur", academicYear, startY = 196, drawTitle = false }) {
  const isUrdu = language === "ur";
  const stats = computeExamStats(exam, results);

  // 0. Draw Title (for standalone pages in class marksheets)
  if (drawTitle) {
    const titleText = isUrdu ? "طالب علم کی مارک شیٹ" : "Student Marksheet";
    const titleY = Math.max(startY - 40, 142);

    if (isUrdu) {
      urduPdfHelper.drawTextRTL(doc, titleText, 50, titleY, {
        font: "UrduFont",
        fontSize: 18,
        width: 500,
        align: "center",
      });
    } else {
      doc.font("Helvetica-Bold").fontSize(16).fillColor("#0f172a")
        .text(titleText, 50, titleY, { width: 495, align: "center" });
    }
    startY = titleY + 30;
  }

  // 1. Localized Identity Fields
  const studentName = getLocalizedStudentName(student, language) || (student.name || "—");
  const fatherName = getLocalizedFatherName(student, language) || (student.fatherName || "");
  const className = getLocalizedClassName(
    exam.classId || exam.class || student.classId || student.schoolClassId || student.studentClass || student.className,
    language
  ) || "—";
  const rollNumber = student.rollNumber || "—";
  const acadYear = exam.academicYear || academicYear || student.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  // Exam name & type
  const rawType = String(exam.examType || "").toLowerCase().trim();
  let examDisplayName = "";
  if (isUrdu) {
    examDisplayName = EXAM_TYPE_URDU[rawType] || (exam.name || exam.examName || "امتحان");
  } else {
    examDisplayName = EXAM_TYPE_EN[rawType] || (exam.name || exam.examName || "Examination");
  }

  const LEFT_X = 50;
  const USABLE_WIDTH = 495; // 545 - 50
  const RIGHT_X = LEFT_X + USABLE_WIDTH; // 545

  // 2. Student & Exam Information Card (2 Rows x 3 Columns)
  const infoY = startY;
  const infoH = 68;
  const colW = 165; // 495 / 3

  // Outer Box
  doc.rect(LEFT_X, infoY, USABLE_WIDTH, infoH).fillAndStroke("#f8fafc", "#cbd5e1");
  // Horizontal row divider
  doc.moveTo(LEFT_X, infoY + 34).lineTo(RIGHT_X, infoY + 34).strokeColor("#e2e8f0").lineWidth(0.8).stroke();
  // Vertical column dividers
  doc.moveTo(LEFT_X + colW, infoY).lineTo(LEFT_X + colW, infoY + infoH).strokeColor("#e2e8f0").lineWidth(0.8).stroke();
  doc.moveTo(LEFT_X + colW * 2, infoY).lineTo(LEFT_X + colW * 2, infoY + infoH).strokeColor("#e2e8f0").lineWidth(0.8).stroke();

  if (isUrdu) {
    // Urdu: Right-to-Left column arrangement
    const colRightX = LEFT_X + colW * 2; // 380
    const colMidX = LEFT_X + colW;       // 215
    const colLeftX = LEFT_X;             // 50

    // Row 1:
    // Right Col: Student Name
    drawTextInBox(doc, "نام طالب علم", colRightX, infoY + 3, colW, 13, { size: 9.5, color: "#64748b", align: "right", pad: 10 });
    drawTextInBox(doc, studentName, colRightX, infoY + 16, colW, 17, { size: 12.5, bold: true, color: "#0f172a", align: "right", pad: 10 });

    // Mid Col: Father's Name
    drawTextInBox(doc, "والد کا نام", colMidX, infoY + 3, colW, 13, { size: 9.5, color: "#64748b", align: "right", pad: 10 });
    drawTextInBox(doc, fatherName || "—", colMidX, infoY + 16, colW, 17, { size: 12.5, bold: true, color: "#0f172a", align: "right", pad: 10 });

    // Left Col: Roll Number
    drawTextInBox(doc, "رول نمبر", colLeftX, infoY + 3, colW, 13, { size: 9.5, color: "#64748b", align: "right", pad: 10 });
    drawTextInBox(doc, rollNumber, colLeftX, infoY + 16, colW, 17, { size: 12, bold: true, color: "#0f172a", align: "right", pad: 10, font: "Helvetica-Bold" });

    // Row 2:
    // Right Col: Class
    drawTextInBox(doc, "جماعت / کلاس", colRightX, infoY + 37, colW, 13, { size: 9.5, color: "#64748b", align: "right", pad: 10 });
    drawTextInBox(doc, className, colRightX, infoY + 50, colW, 17, { size: 12, bold: true, color: "#0f172a", align: "right", pad: 10 });

    // Mid Col: Exam Name
    drawTextInBox(doc, "امتحان", colMidX, infoY + 37, colW, 13, { size: 9.5, color: "#64748b", align: "right", pad: 10 });
    drawTextInBox(doc, examDisplayName, colMidX, infoY + 50, colW, 17, { size: 12, bold: true, color: "#0f172a", align: "right", pad: 10 });

    // Left Col: Academic Year
    drawTextInBox(doc, "تعلیمی سال", colLeftX, infoY + 37, colW, 13, { size: 9.5, color: "#64748b", align: "right", pad: 10 });
    drawTextInBox(doc, acadYear, colLeftX, infoY + 50, colW, 17, { size: 11, bold: true, color: "#0f172a", align: "right", pad: 10, font: "Helvetica-Bold" });
  } else {
    // English: Left-to-Right column arrangement
    const colLeftX = LEFT_X;             // 50
    const colMidX = LEFT_X + colW;       // 215
    const colRightX = LEFT_X + colW * 2; // 380

    // Row 1:
    drawTextInBox(doc, "STUDENT NAME", colLeftX, infoY + 3, colW, 13, { size: 8.5, color: "#64748b", align: "left", pad: 8, bold: true });
    drawTextInBox(doc, studentName, colLeftX, infoY + 16, colW, 17, { size: 11, bold: true, color: "#0f172a", align: "left", pad: 8 });

    drawTextInBox(doc, "FATHER'S NAME", colMidX, infoY + 3, colW, 13, { size: 8.5, color: "#64748b", align: "left", pad: 8, bold: true });
    drawTextInBox(doc, fatherName || "—", colMidX, infoY + 16, colW, 17, { size: 11, bold: true, color: "#0f172a", align: "left", pad: 8 });

    drawTextInBox(doc, "ROLL NUMBER", colRightX, infoY + 3, colW, 13, { size: 8.5, color: "#64748b", align: "left", pad: 8, bold: true });
    drawTextInBox(doc, rollNumber, colRightX, infoY + 16, colW, 17, { size: 12, bold: true, color: "#0f172a", align: "left", pad: 8, font: "Helvetica-Bold" });

    // Row 2:
    drawTextInBox(doc, "CLASS", colLeftX, infoY + 37, colW, 13, { size: 8.5, color: "#64748b", align: "left", pad: 8, bold: true });
    drawTextInBox(doc, className, colLeftX, infoY + 50, colW, 17, { size: 11, bold: true, color: "#0f172a", align: "left", pad: 8 });

    drawTextInBox(doc, "EXAMINATION", colMidX, infoY + 37, colW, 13, { size: 8.5, color: "#64748b", align: "left", pad: 8, bold: true });
    drawTextInBox(doc, examDisplayName, colMidX, infoY + 50, colW, 17, { size: 11, bold: true, color: "#0f172a", align: "left", pad: 8 });

    drawTextInBox(doc, "ACADEMIC YEAR", colRightX, infoY + 37, colW, 13, { size: 8.5, color: "#64748b", align: "left", pad: 8, bold: true });
    drawTextInBox(doc, acadYear, colRightX, infoY + 50, colW, 17, { size: 11, bold: true, color: "#0f172a", align: "left", pad: 8, font: "Helvetica-Bold" });
  }

  // 3. Marks Table
  const tableY = infoY + infoH + 14;

  const cols = isUrdu
    ? [
        { key: "status", w: 65, label: "کیفیت" },
        { key: "obt", w: 75, label: "حاصل کردہ" },
        { key: "pass", w: 70, label: "کامیابی نمبر" },
        { key: "max", w: 70, label: "کل نمبر" },
        { key: "subject", w: 180, label: "مضمون" },
        { key: "sno", w: 35, label: "شمار" },
      ]
    : [
        { key: "sno", w: 35, label: "#" },
        { key: "subject", w: 180, label: "Subject Name" },
        { key: "max", w: 70, label: "Max Marks" },
        { key: "pass", w: 70, label: "Pass Marks" },
        { key: "obt", w: 75, label: "Obtained" },
        { key: "status", w: 65, label: "Status" },
      ];

  // Header row
  let cx = LEFT_X;
  const headerH = 26;
  cols.forEach((c) => {
    doc.rect(cx, tableY, c.w, headerH).fillAndStroke("#047857", "#047857");
    drawTextInBox(doc, c.label, cx, tableY, c.w, headerH, {
      size: isUrdu ? 11 : 9.5,
      color: "#ffffff",
      bold: true,
      align: "center",
    });
    cx += c.w;
  });

  // Table rows
  let curY = tableY + headerH;
  const rowH = 26;

  stats.rows.forEach((r, idx) => {
    const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
    let rx = LEFT_X;

    // Resolve subject name according to language
    let subDisplay = r.subject;
    if (!isUrdu) {
      if (COMMON_SUBJECT_EN[subDisplay]) {
        subDisplay = COMMON_SUBJECT_EN[subDisplay];
      } else if (ARABIC_RE.test(subDisplay)) {
        subDisplay = transliterateUrduToEnglish(subDisplay);
      }
    }

    cols.forEach((c) => {
      doc.rect(rx, curY, c.w, rowH).fillAndStroke(bg, "#cbd5e1");

      if (c.key === "sno") {
        drawTextInBox(doc, r.sno, rx, curY, c.w, rowH, { align: "center", font: "Helvetica" });
      } else if (c.key === "subject") {
        drawTextInBox(doc, subDisplay, rx, curY, c.w, rowH, {
          align: isUrdu ? "right" : "left",
          pad: 8,
          font: isUrdu ? "UrduFont" : "Helvetica-Bold",
          size: isUrdu ? 12 : 9.5,
        });
      } else if (c.key === "max") {
        drawTextInBox(doc, String(r.max), rx, curY, c.w, rowH, { align: "center", font: "Helvetica" });
      } else if (c.key === "pass") {
        drawTextInBox(doc, String(r.pass), rx, curY, c.w, rowH, { align: "center", font: "Helvetica" });
      } else if (c.key === "obt") {
        if (r.obtained === "ABSENT" || r.obtained === null) {
          drawTextInBox(doc, isUrdu ? "غیر حاضر" : "Absent", rx, curY, c.w, rowH, {
            align: "center",
            color: "#b91c1c",
            bold: true,
            font: isUrdu ? "UrduFont" : "Helvetica-Bold",
            size: isUrdu ? 11 : 9.5,
          });
        } else {
          const isPassedSubject = r.obtained >= r.pass;
          drawTextInBox(doc, String(r.obtained), rx, curY, c.w, rowH, {
            align: "center",
            color: isPassedSubject ? "#15803d" : "#b91c1c",
            bold: true,
            font: "Helvetica-Bold",
            size: 11,
          });
        }
      } else if (c.key === "status") {
        if (r.status === "ABSENT") {
          drawTextInBox(doc, isUrdu ? "غیر حاضر" : "Absent", rx, curY, c.w, rowH, {
            align: "center",
            color: "#b91c1c",
            bold: true,
            font: isUrdu ? "UrduFont" : "Helvetica-Bold",
            size: isUrdu ? 11 : 9.5,
          });
        } else if (r.status === "FAIL") {
          drawTextInBox(doc, isUrdu ? "فیل" : "Fail", rx, curY, c.w, rowH, {
            align: "center",
            color: "#b91c1c",
            bold: true,
            font: isUrdu ? "UrduFont" : "Helvetica-Bold",
            size: isUrdu ? 11 : 9.5,
          });
        } else {
          drawTextInBox(doc, isUrdu ? "پاس" : "Pass", rx, curY, c.w, rowH, {
            align: "center",
            color: "#15803d",
            bold: true,
            font: isUrdu ? "UrduFont" : "Helvetica-Bold",
            size: isUrdu ? 11 : 9.5,
          });
        }
      }
      rx += c.w;
    });
    curY += rowH;
  });

  // Total Row
  const totH = 28;
  const totBg = "#ecfdf5";
  const totBorder = "#a7f3d0";

  if (isUrdu) {
    // Status cell (x=50, w=65)
    doc.rect(LEFT_X, curY, 65, totH).fillAndStroke(totBg, totBorder);
    drawTextInBox(doc, stats.passed ? "پاس" : "فیل", LEFT_X, curY, 65, totH, {
      color: stats.passed ? "#15803d" : "#b91c1c",
      bold: true,
      align: "center",
      font: "UrduFont",
      size: 12,
    });

    // Obtained cell (x=115, w=75)
    doc.rect(LEFT_X + 65, curY, 75, totH).fillAndStroke(totBg, totBorder);
    drawTextInBox(doc, String(stats.obtainedMarks), LEFT_X + 65, curY, 75, totH, {
      color: stats.passed ? "#15803d" : "#b91c1c",
      bold: true,
      align: "center",
      font: "Helvetica-Bold",
      size: 12,
    });

    // Passing cell (x=190, w=70)
    doc.rect(LEFT_X + 140, curY, 70, totH).fillAndStroke(totBg, totBorder);
    drawTextInBox(doc, String(stats.totalPassingMarks), LEFT_X + 140, curY, 70, totH, {
      color: "#064e3b",
      bold: true,
      align: "center",
      font: "Helvetica-Bold",
      size: 11,
    });

    // Max cell (x=260, w=70)
    doc.rect(LEFT_X + 210, curY, 70, totH).fillAndStroke(totBg, totBorder);
    drawTextInBox(doc, String(stats.totalMaxMarks), LEFT_X + 210, curY, 70, totH, {
      color: "#064e3b",
      bold: true,
      align: "center",
      font: "Helvetica-Bold",
      size: 11,
    });

    // Merged Subject + SNo (x=330, w=215)
    doc.rect(LEFT_X + 280, curY, 215, totH).fillAndStroke(totBg, totBorder);
    drawTextInBox(doc, "جملہ نمبرات", LEFT_X + 280, curY, 215, totH, {
      color: "#064e3b",
      bold: true,
      align: "center",
      font: "UrduFont",
      size: 13,
    });
  } else {
    // English LTR Total Row:
    // Merged S.No + Subject: w = 35 + 180 = 215
    doc.rect(LEFT_X, curY, 215, totH).fillAndStroke(totBg, totBorder);
    drawTextInBox(doc, "TOTAL MARKS", LEFT_X, curY, 215, totH, {
      color: "#064e3b",
      bold: true,
      align: "center",
      font: "Helvetica-Bold",
      size: 10.5,
    });

    // Max
    doc.rect(LEFT_X + 215, curY, 70, totH).fillAndStroke(totBg, totBorder);
    drawTextInBox(doc, String(stats.totalMaxMarks), LEFT_X + 215, curY, 70, totH, {
      color: "#064e3b",
      bold: true,
      align: "center",
      font: "Helvetica-Bold",
      size: 11,
    });

    // Pass
    doc.rect(LEFT_X + 285, curY, 70, totH).fillAndStroke(totBg, totBorder);
    drawTextInBox(doc, String(stats.totalPassingMarks), LEFT_X + 285, curY, 70, totH, {
      color: "#064e3b",
      bold: true,
      align: "center",
      font: "Helvetica-Bold",
      size: 11,
    });

    // Obtained
    doc.rect(LEFT_X + 355, curY, 75, totH).fillAndStroke(totBg, totBorder);
    drawTextInBox(doc, String(stats.obtainedMarks), LEFT_X + 355, curY, 75, totH, {
      color: stats.passed ? "#15803d" : "#b91c1c",
      bold: true,
      align: "center",
      font: "Helvetica-Bold",
      size: 12,
    });

    // Status
    doc.rect(LEFT_X + 430, curY, 65, totH).fillAndStroke(totBg, totBorder);
    drawTextInBox(doc, stats.passed ? "PASS" : "FAIL", LEFT_X + 430, curY, 65, totH, {
      color: stats.passed ? "#15803d" : "#b91c1c",
      bold: true,
      align: "center",
      font: "Helvetica-Bold",
      size: 11,
    });
  }
  curY += totH;

  // 4. Performance Summary Cards (5 Cards)
  const sumY = curY + 16;
  const cardW = 93;
  const cardH = 50;
  const cardGap = 7.5;

  const resultBadgeText = stats.passed
    ? (isUrdu ? "کامیاب (پاس)" : "PASSED")
    : (isUrdu ? "ناکام (فیل)" : "FAILED");

  const cards = isUrdu
    ? [
        {
          label: "نتیجہ",
          val: resultBadgeText,
          bg: stats.passed ? "#dcfce7" : "#fee2e2",
          border: stats.passed ? "#86efac" : "#fca5a5",
          color: stats.passed ? "#15803d" : "#b91c1c",
        },
        { label: "گریڈ", val: stats.grade, color: stats.passed ? "#15803d" : "#b91c1c" },
        { label: "فیصد", val: `${stats.percentage.toFixed(2)}%`, color: stats.passed ? "#15803d" : "#b91c1c" },
        { label: "حاصل کردہ نمبر", val: String(stats.obtainedMarks), color: stats.passed ? "#15803d" : "#b91c1c" },
        { label: "کل نمبر", val: String(stats.totalMaxMarks), color: "#0f172a" },
      ]
    : [
        { label: "TOTAL MARKS", val: String(stats.totalMaxMarks), color: "#0f172a" },
        { label: "OBTAINED", val: String(stats.obtainedMarks), color: stats.passed ? "#15803d" : "#b91c1c" },
        { label: "PERCENTAGE", val: `${stats.percentage.toFixed(2)}%`, color: stats.passed ? "#15803d" : "#b91c1c" },
        { label: "GRADE", val: stats.grade, color: stats.passed ? "#15803d" : "#b91c1c" },
        {
          label: "RESULT",
          val: resultBadgeText,
          bg: stats.passed ? "#dcfce7" : "#fee2e2",
          border: stats.passed ? "#86efac" : "#fca5a5",
          color: stats.passed ? "#15803d" : "#b91c1c",
        },
      ];

  cards.forEach((cd, i) => {
    const cardX = LEFT_X + i * (cardW + cardGap);
    doc.rect(cardX, sumY, cardW, cardH).fillAndStroke(cd.bg || "#f8fafc", cd.border || "#cbd5e1");
    drawTextInBox(doc, cd.label, cardX, sumY + 4, cardW, 14, {
      size: isUrdu ? 10 : 8,
      color: "#64748b",
      align: "center",
      font: isUrdu ? "UrduFont" : "Helvetica-Bold",
      bold: !isUrdu,
    });
    drawTextInBox(doc, cd.val, cardX, sumY + 20, cardW, 24, {
      size: 13,
      bold: true,
      color: cd.color,
      align: "center",
      font: isUrdu && ARABIC_RE.test(cd.val) ? "UrduFont" : "Helvetica-Bold",
    });
  });

  // 5. Grading Scale Guide
  const scaleY = sumY + cardH + 12;
  const gradeScale = [
    { grade: "A+", range: "80%+" },
    { grade: "A", range: "70-79%" },
    { grade: "B", range: "60-69%" },
    { grade: "C", range: "50-59%" },
    { grade: "D", range: "35-49%" },
    { grade: "F", range: "<35% / Fail" },
  ];
  const gW = USABLE_WIDTH / gradeScale.length;

  doc.rect(LEFT_X, scaleY, USABLE_WIDTH, 22).fillAndStroke("#f8fafc", "#e2e8f0");
  gradeScale.forEach((gs, i) => {
    const gx = LEFT_X + i * gW;
    if (i > 0) {
      doc.moveTo(gx, scaleY).lineTo(gx, scaleY + 22).strokeColor("#e2e8f0").lineWidth(0.8).stroke();
    }
    const txt = `${gs.grade}: ${gs.range}`;
    drawTextInBox(doc, txt, gx, scaleY, gW, 22, {
      font: "Helvetica-Bold",
      size: 8.5,
      color: "#475569",
      align: "center",
    });
  });

  // 6. Signatures and Seal Area
  const sigY = Math.max(scaleY + 45, 720);

  // Class Teacher Signature (Left)
  doc.moveTo(LEFT_X + 10, sigY).lineTo(LEFT_X + 135, sigY).strokeColor("#94a3b8").lineWidth(1).stroke();
  drawTextInBox(doc, isUrdu ? "دستخط کلاس ٹیچر" : "Class Teacher Signature", LEFT_X + 10, sigY + 6, 125, 16, {
    size: isUrdu ? 11 : 9.5,
    align: "center",
    font: isUrdu ? "UrduFont" : "Helvetica-Bold",
  });

  // Official Seal Box (Center)
  doc.save();
  doc.rect(LEFT_X + 185, sigY - 26, 125, 48).dash(2, { space: 2 }).strokeColor("#94a3b8").lineWidth(0.8).stroke();
  doc.restore();
  drawTextInBox(doc, isUrdu ? "مہر جامعہ" : "Institute Seal", LEFT_X + 185, sigY - 8, 125, 16, {
    size: isUrdu ? 12 : 10,
    align: "center",
    font: isUrdu ? "UrduFont" : "Helvetica-Bold",
    color: isUrdu ? "#0f172a" : "#64748b",
  });

  // Principal Signature (Right)
  doc.moveTo(RIGHT_X - 135, sigY).lineTo(RIGHT_X - 10, sigY).strokeColor("#94a3b8").lineWidth(1).stroke();
  drawTextInBox(doc, isUrdu ? "دستخط ناظم امتحانات / مہتمم" : "Principal / Controller Signature", RIGHT_X - 135, sigY + 6, 125, 16, {
    size: isUrdu ? 11 : 9.5,
    align: "center",
    font: isUrdu ? "UrduFont" : "Helvetica-Bold",
  });

  // Date of Issue
  const todayStr = new Date().toLocaleDateString("en-GB");
  if (isUrdu) {
    const centerX = LEFT_X + USABLE_WIDTH / 2;
    urduPdfHelper.drawTextRTL(doc, "تاریخ اجراء:", centerX + 45, sigY + 36, { font: "UrduFont", fontSize: 10, color: "#64748b" });
    doc.font("Helvetica").fontSize(9).fillColor("#64748b").text(todayStr, centerX - 55, sigY + 38, { width: 50, align: "right" });
  } else {
    drawTextInBox(doc, `Date of Issue: ${todayStr}`, LEFT_X, sigY + 36, USABLE_WIDTH, 14, {
      size: 8.5,
      color: "#64748b",
      align: "center",
      font: "Helvetica",
    });
  }
}

module.exports = {
  drawStudentMarksheet,
  computeExamStats,
};
