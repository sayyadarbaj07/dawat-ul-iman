/**
 * marksheetTemplate.js
 *
 * Renders the student marksheet so that it looks like the printed
 * "Jamia Dawat-ul-Eiman" result card:
 *   - blue bordered page with Urdu / English letterhead
 *   - "Deeni o Asri" result title line
 *   - student name, class, roll number and date on dotted lines
 *   - left sidebar (percentage / total / grade / 1st / 2nd / 3rd / hard work needed)
 *   - PART (A) DEENI EDUCATION table (right-to-left)
 *   - PART (B) ASRI EDUCATION table (left-to-right)
 *   - signature lines and seal area
 */
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { calculateResult } = require("../grading");
const { toUrduDigits } = require("./digitLocalization");
const {
  transliterateUrduToEnglish,
  getLocalizedStudentName,
  getLocalizedFatherName,
  getLocalizedClassName,
} = require("../transliteration");

const FONT_DIR = path.join(__dirname, "../fonts");
const URDU_FONT_PATH = path.join(FONT_DIR, "Jameel Noori Nastaleeq.ttf");
const KODAK_FONT_PATH = path.join(FONT_DIR, "urdu-fonts/AlFars_7_Kodak_Bold.ttf");
const LOGO_TRANSPARENT_PATH = path.join(__dirname, "logo_transparent.png");
const LOGO_JPEG_PATH = path.join(__dirname, "../../../../client/public/logo1.jpeg");

const COLORS = {
  blue: "#0e6bb7",
  navy: "#1d5292",
  lightBand: "#1462a6",
  band: "#1e78be",
  gold: "#fed100",
  magenta: "#d8217a",
  green: "#2f9a3f",
  red: "#c62828",
  line: "#2b2b2b",
  text: "#111111",
};

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

// Subjects that belong to "ASRI" (modern / school) education. Everything else is "DEENI".
const ASRI_KEYWORDS = [
  "marathi", "english", "math", "science", "general knowledge", "gk", "hindi",
  "social", "history", "geography", "civics", "evs", "environment", "computer",
  "sanskrit", "drawing",
  "مراٹھی", "انگریزی", "ریاضی", "سائنس", "ہندی", "عمومی معلومات", "کمپیوٹر", "سماجی",
];

const DEFAULT_ASRI_SUBJECTS = ["Marathi", "English", "Mathematics", "General Knowledge / Science"];

const EXAM_TYPE_URDU = {
  monthly: "ماہانہ",
  "half-yearly": "ششماہی",
  halfyearly: "ششماہی",
  quarterly: "سہ ماہی",
  yearly: "سالانہ",
  annual: "سالانہ",
};

function isAsriSubject(name) {
  const n = String(name || "").toLowerCase();
  return ASRI_KEYWORDS.some((k) => n.includes(k));
}

function hijriYear(date) {
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { year: "numeric" }).formatToParts(date);
    const y = parts.find((p) => p.type === "year");
    return y ? y.value : "";
  } catch (e) {
    return "";
  }
}

function formatDate(d) {
  const date = d ? new Date(d) : new Date();
  if (isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}

/**
 * Builds the numbers shown on the marksheet.
 * Calculation rules are the same as the previous marksheet implementation.
 */
function computeMarksheet(exam, results) {
  const subjects = exam.subjects || [];
  const marksBySubject = {};
  subjects.forEach((s) => { marksBySubject[s] = null; });

  (results || []).forEach((r) => {
    if (subjects.includes(r.subject)) {
      marksBySubject[r.subject] = r.marks === -1 ? "ABSENT" : r.marks;
    }
  });

  let obtained = 0;
  let incomplete = false;
  subjects.forEach((s) => {
    const m = marksBySubject[s];
    if (m === null || m === "ABSENT") incomplete = true;
    else obtained += m;
  });

  const total = subjects.length * exam.maxMarks;
  const percentage = total > 0 ? (obtained / total) * 100 : 0;
  const calc = calculateResult({
    marks: obtained,
    maxMarks: total,
    passingMarks: incomplete ? total + 1 : exam.passingMarks * subjects.length,
  });

  const rows = subjects.map((name) => {
    const m = marksBySubject[name];
    let remark = "";
    if (m === "ABSENT") remark = "غیر حاضر";
    else if (typeof m === "number") remark = m < exam.passingMarks ? "فیل" : "پاس";
    return { name, max: exam.maxMarks, marks: m, remark };
  });

  return {
    deeni: rows.filter((r) => !isAsriSubject(r.name)),
    asri: rows.filter((r) => isAsriSubject(r.name)),
    obtained,
    total,
    percentage,
    grade: incomplete ? "F" : calc.grade,
    passed: incomplete ? false : calc.passed,
  };
}

function registerFonts(doc) {
  doc.registerFont("UrduFont", fs.existsSync(URDU_FONT_PATH) ? URDU_FONT_PATH : "Helvetica");
  doc.registerFont(
    "KodakBold",
    fs.existsSync(KODAK_FONT_PATH) ? KODAK_FONT_PATH : (fs.existsSync(URDU_FONT_PATH) ? URDU_FONT_PATH : "Helvetica")
  );
}

/** Draws text inside a box, vertically centered. Urdu text is auto-detected and shaped RTL. */
function boxText(doc, text, x, y, w, h, o = {}) {
  if (text === undefined || text === null || text === "") return;
  text = String(text);
  const rtl = ARABIC_RE.test(text);
  const font = o.font || (rtl ? "UrduFont" : "Helvetica");
  const pad = o.pad === undefined ? 3 : o.pad;
  doc.font(font).fontSize(o.size || 11).fillColor(o.color || COLORS.text);
  const opts = { width: Math.max(1, w - pad * 2), align: o.align || "center" };
  if (rtl) opts.features = ["rtla"];
  const th = doc.heightOfString(text, opts);
  const ty = y + (o.valign === "top" ? 0 : (h - th) / 2);
  doc.text(text, x + pad, ty, opts);
}

function cell(doc, x, y, w, h, o = {}) {
  doc.lineWidth(o.lineWidth || 0.8).strokeColor(o.stroke || COLORS.line);
  if (o.fill) doc.rect(x, y, w, h).fillAndStroke(o.fill, o.stroke || COLORS.line);
  else doc.rect(x, y, w, h).stroke();
}

function dottedLine(doc, x1, x2, y) {
  doc.save().lineWidth(0.8).strokeColor("#444").dash(1, { space: 2 }).moveTo(x1, y).lineTo(x2, y).stroke().undash().restore();
}

/**
 * English (left-to-right) version of the marksheet.
 * Same card structure and calculations as the Urdu version, but every label,
 * heading, column order and alignment is English / LTR.
 */
function drawPageEnglish(doc, { student, exam, results }, data) {
  const W = doc.page.width;
  const H = doc.page.height;
  const M = 18;
  const L = M + 8;
  const R = W - M - 8;
  const lang = "en";
  const toEn = (v) => (ARABIC_RE.test(String(v || "")) ? transliterateUrduToEnglish(String(v)) : String(v || ""));

  // Remarks in English
  const enRows = (rows) => rows.map((r) => {
    let remark = "";
    if (r.marks === "ABSENT") remark = "Absent";
    else if (typeof r.marks === "number") remark = r.marks < exam.passingMarks ? "Fail" : "Pass";
    return { ...r, name: toEn(r.name), remark };
  });
  const deeniRows = enRows(data.deeni);
  const asriRowsData = enRows(data.asri);

  // ---- Page border -------------------------------------------------------
  doc.lineWidth(3.5).strokeColor(COLORS.blue).rect(M, M, W - M * 2, H - M * 2).stroke();

  // ---- Header Box --------------------------------------------------------
  const headerX = L;
  const headerY = M + 6;
  const headerW = R - L;
  const topBoxH = 126;
  doc.rect(headerX, headerY, headerW, topBoxH).fill("#c8e2f5");

  const logoW = 90;
  const logoH = 90;
  const logoX = headerX + 12;
  const logoY = headerY + 12;
  const logoFile = fs.existsSync(LOGO_TRANSPARENT_PATH) ? LOGO_TRANSPARENT_PATH : (fs.existsSync(LOGO_JPEG_PATH) ? LOGO_JPEG_PATH : null);
  if (logoFile) {
    try { doc.image(logoFile, logoX, logoY, { width: logoW, height: logoH }); } catch (e) { }
  }

  const textX = logoX + logoW + 8;
  const textW = headerX + headerW - textX - 10;
  doc.font("Helvetica-Bold").fontSize(22).fillColor("#1c5292");
  doc.text("JAMIA", textX, headerY + 14, { width: textW, align: "center", characterSpacing: 6 });
  doc.font("Helvetica-Bold").fontSize(37).fillColor("#1c5292");
  doc.text("DAWAT-UL-EMAN", textX, headerY + 40, { width: textW, align: "center" });
  doc.font("Helvetica-Bold").fontSize(11.5).fillColor("#112233");
  doc.text("Chah Minar Masjid, Roshan Pura, Hazrat Balepeer, Beed (Maharashtra)", textX, headerY + 94, { width: textW, align: "center" });

  // ---- English banner ------------------------------------------------------
  const bannerY = headerY + topBoxH;
  const bannerH = 36;
  const leftW = 265;
  const rightW = headerW - leftW;
  doc.rect(headerX, bannerY, leftW, bannerH).fill("#1462a6");
  doc.font("Helvetica-Bold").fontSize(16.5).fillColor("#fed100");
  doc.text("STUDENT MARKSHEET", headerX + 5, bannerY + 10, { width: leftW - 10, align: "center" });
  doc.rect(headerX + leftW, bannerY, rightW, bannerH).fill("#1e78be");
  doc.font("Helvetica-Oblique").fontSize(9.5).fillColor("#ffffff");
  doc.text("6 Minar Masjid,Roashan Pura,\nHazrat Balepeer,Beed.(Maharashtra)", headerX + leftW + 4, bannerY + 6.5, {
    width: rightW - 8,
    align: "center",
    lineGap: 1.5,
  });
  doc.lineWidth(1.2).strokeColor(COLORS.blue).rect(headerX, headerY, headerW, topBoxH + bannerH).stroke();
  doc.moveTo(headerX, bannerY).lineTo(headerX + headerW, bannerY).lineWidth(1.2).strokeColor(COLORS.blue).stroke();
  doc.moveTo(headerX + leftW, bannerY).lineTo(headerX + leftW, bannerY + bannerH).lineWidth(1.2).strokeColor(COLORS.blue).stroke();

  // ---- Result title line ---------------------------------------------------
  const titleY = bannerY + bannerH + 9;
  const examDate = exam.date ? new Date(exam.date) : new Date();
  const typeKey = String(exam.examType || "").trim();
  const typeEn = typeKey ? typeKey.charAt(0).toUpperCase() + typeKey.slice(1) : "";
  const gYear = String(exam.academicYear || examDate.getFullYear());
  const hYear = hijriYear(examDate);
  const titleLine = `DEENI & ASRI RESULT - ${typeEn.toUpperCase()} EXAMINATION ${gYear}${hYear ? ` (${hYear} AH)` : ""}`;
  boxText(doc, titleLine, L, titleY, R - L, 28, { size: 15, color: COLORS.red, align: "center", font: "Helvetica-Bold" });

  // ---- Student details -----------------------------------------------------
  const name = getLocalizedStudentName(student, lang);
  const father = getLocalizedFatherName(student, lang);
  const fullName = father ? `${name} s/o ${father}` : name;
  const className = getLocalizedClassName(exam.class || student.studentClass || student.className || student.classId, lang);

  const rowH = 24;
  const r1 = titleY + 29;
  const r2 = r1 + rowH + 2;
  const r3 = r2 + rowH + 2;
  const labFont = "Helvetica-Bold";

  const lab1 = 150;
  boxText(doc, "Student Name (with Father):", L, r1, lab1, rowH, { size: 11, align: "left", pad: 0, font: labFont });
  dottedLine(doc, L + lab1 + 2, R, r1 + rowH - 4);
  boxText(doc, fullName, L + lab1 + 4, r1, R - L - lab1 - 4, rowH, { size: 13, font: "Helvetica-Bold" });

  const lab2 = 42;
  boxText(doc, "Class:", L, r2, lab2, rowH, { size: 11, align: "left", pad: 0, font: labFont });
  dottedLine(doc, L + lab2 + 2, R, r2 + rowH - 4);
  boxText(doc, className, L + lab2 + 4, r2, R - L - lab2 - 4, rowH, { size: 12, font: "Helvetica-Bold" });

  const lab3 = 60;
  const rollStartX = L + lab3 + 2;
  const rollEndX = L + 250;
  boxText(doc, "Roll No.:", L, r3, lab3, rowH, { size: 11, align: "left", pad: 0, font: labFont });
  dottedLine(doc, rollStartX, rollEndX, r3 + rowH - 4);
  boxText(doc, student.rollNumber || "", rollStartX, r3, rollEndX - rollStartX, rowH, { size: 13, font: "Helvetica-Bold" });

  const dateLabW = 36;
  const dateLabX = rollEndX + 14;
  boxText(doc, "Date:", dateLabX, r3, dateLabW, rowH, { size: 11, align: "left", pad: 0, font: labFont });
  dottedLine(doc, dateLabX + dateLabW + 2, R, r3 + rowH - 4);
  boxText(doc, formatDate(exam.date), dateLabX + dateLabW + 2, r3, R - dateLabX - dateLabW - 2, rowH, { size: 12, font: "Helvetica" });

  // ---- Layout of the two tables -------------------------------------------
  const top = r3 + rowH + 12;
  const sideW = 104;
  const tx = L + sideW + 12;
  const tw = R - tx;

  const buildCols = () => {
    const cols = [
      { key: "sno", w: 40, label: "S.No" },
      { key: "subject", w: 0, label: "Subject" },
      { key: "max", w: 70, label: "Max Marks" },
      { key: "marks", w: 96, label: "Marks Obtained" },
      { key: "remark", w: 66, label: "Remarks" },
    ];
    cols.find((c) => c.key === "subject").w = tw - cols.reduce((s, c) => s + c.w, 0);
    let x = tx;
    cols.forEach((c) => { c.x = x; x += c.w; });
    return cols;
  };

  const marksValue = (row) => (row.marks === null ? "" : (row.marks === "ABSENT" ? "Absent" : row.marks));

  const drawTable = ({ title, color, rows, headY, headH, minRows, bodyH, totH, totalLabel }) => {
    boxText(doc, title, tx, headY - 16, tw, 14, { font: "Helvetica-Bold", size: 10.5, pad: 0, align: "left" });
    const cols = buildCols();
    cols.forEach((c) => {
      cell(doc, c.x, headY, c.w, headH, { fill: color, stroke: "#ffffff" });
      boxText(doc, c.label, c.x, headY, c.w, headH, { font: "Helvetica-Bold", size: 10.5, color: "#ffffff" });
    });
    const nRows = Math.max(minRows, rows.length);
    const rowHt = Math.min(28, bodyH / nRows);
    const bodyY = headY + headH;
    for (let i = 0; i < nRows; i++) {
      const y = bodyY + i * rowHt;
      const row = rows[i];
      cols.forEach((c) => {
        cell(doc, c.x, y, c.w, rowHt);
        let v = "";
        let align = "center";
        if (c.key === "sno") v = String(i + 1);
        else if (row) {
          if (c.key === "subject") { v = row.name; align = "left"; }
          else if (c.key === "max") v = row.max;
          else if (c.key === "marks") v = marksValue(row);
          else if (c.key === "remark") v = row.remark;
        }
        boxText(doc, v, c.x, y, c.w, rowHt, { size: 12, font: "Helvetica", align, pad: align === "left" ? 8 : 3 });
      });
    }
    const totY = bodyY + nRows * rowHt;
    const sno = cols.find((c) => c.key === "sno");
    const subj = cols.find((c) => c.key === "subject");
    cell(doc, sno.x, totY, sno.w + subj.w, totH);
    boxText(doc, totalLabel, sno.x, totY, sno.w + subj.w, totH, { font: "Helvetica-Bold", size: 12 });
    const hasMarks = rows.some((r) => typeof r.marks === "number");
    const sumMax = rows.reduce((s, r) => s + r.max, 0);
    const sumObt = rows.reduce((s, r) => s + (typeof r.marks === "number" ? r.marks : 0), 0);
    ["max", "marks", "remark"].forEach((k) => {
      const c = cols.find((x) => x.key === k);
      cell(doc, c.x, totY, c.w, totH);
      let v = "";
      if (k === "max" && rows.length) v = sumMax;
      if (k === "marks" && hasMarks) v = sumObt;
      boxText(doc, v, c.x, totY, c.w, totH, { font: "Helvetica-Bold", size: 12 });
    });
    return { totY, bodyY, rowHt };
  };

  // ---- PART (A) : DEENI ----------------------------------------------------
  const aHeadY = top + 16;
  const aHeadH = 26;
  const partA = drawTable({
    title: "PART (A) DEENI EDUCATION",
    color: COLORS.magenta,
    rows: deeniRows,
    headY: aHeadY,
    headH: aHeadH,
    minRows: 8,
    bodyH: 224,
    totH: 28,
    totalLabel: "TOTAL",
  });
  const aTotY = partA.totY;
  const aTotH = 28;

  // ---- Sidebar -------------------------------------------------------------
  const sideX = L + 2;
  const sideBoxW = sideW - 4;
  const sideItems = [
    { label: "Percentage", value: `${data.percentage.toFixed(2)}%` },
    { label: "Total Marks", value: `${data.obtained} / ${data.total}` },
    { label: "Grade", value: data.grade },
    { label: "1st", value: "" },
    { label: "2nd", value: "" },
    { label: "3rd", value: "" },
    { label: "Needs Hard Work", value: "" },
  ];
  const sideTop = aHeadY;
  const sidePitch = (aTotY + aTotH - sideTop) / sideItems.length;
  sideItems.forEach((it, i) => {
    const y = sideTop + i * sidePitch;
    boxText(doc, it.label, sideX, y, sideBoxW, 18, { size: 11, pad: 0, font: "Helvetica-Bold" });
    const by = y + 19;
    const bh = Math.min(22, sidePitch - 22);
    cell(doc, sideX, by, sideBoxW, bh, { lineWidth: 1 });
    boxText(doc, it.value, sideX, by, sideBoxW, bh, { font: "Helvetica-Bold", size: 11 });
  });

  // ---- PART (B) : ASRI -----------------------------------------------------
  const bTitleY = aTotY + aTotH + 18;
  const bHeadY = bTitleY + 16;
  const bHeadH = 24;
  const asriRows = asriRowsData.length
    ? asriRowsData
    : DEFAULT_ASRI_SUBJECTS.map((n) => ({ name: n, max: 100, marks: null, remark: "" }));
  const partB = drawTable({
    title: "PART (B) ASRI EDUCATION",
    color: COLORS.green,
    rows: asriRows,
    headY: bHeadY,
    headH: bHeadH,
    minRows: 4,
    bodyH: 112,
    totH: 28,
    totalLabel: "TOTAL",
  });
  const bTotY = partB.totY;

  // ---- Signatures / seal ---------------------------------------------------
  const sigX1 = L + 4;
  const sigX2 = L + sideW - 4;
  const sigRows = [
    { label: "Class Teacher's Signature", y: bHeadY + 58 },
    { label: "Principal's Signature", y: bHeadY + 108 },
  ];
  sigRows.forEach((s) => {
    doc.lineWidth(0.8).strokeColor(COLORS.line).moveTo(sigX1, s.y).lineTo(sigX2, s.y).stroke();
    boxText(doc, s.label, sigX1, s.y + 2, sigX2 - sigX1, 22, { size: 9, pad: 0, font: "Helvetica-Bold" });
  });
  boxText(doc, "Institute Seal", sigX1, bTotY + 4, sigX2 - sigX1, 24, { size: 10, pad: 0, align: "left", font: "Helvetica-Bold" });
}

function drawPage(doc, { student, exam, results, language }, options = {}) {
  const W = doc.page.width;
  const H = doc.page.height;
  const M = 18;
  const L = M + 8;
  const R = W - M - 8;
  const lang = language || options.language || "ur";
  const isUrdu = lang === "ur";
  const data = computeMarksheet(exam, results);

  if (!isUrdu) {
    return drawPageEnglish(doc, { student, exam, results }, data);
  }

  // ---- Page border -------------------------------------------------------
  doc.lineWidth(3.5).strokeColor(COLORS.blue).rect(M, M, W - M * 2, H - M * 2).stroke();

  // ---- Header Box --------------------------------------------------------
  const headerX = L;
  const headerY = M + 6;
  const headerW = R - L;
  const topBoxH = 126;

  // 1. Light sky-blue background for upper header box
  doc.rect(headerX, headerY, headerW, topBoxH).fill("#c8e2f5");

  // 2. Logo in Top-Right (transparent)
  const logoW = 90;
  const logoH = 90;
  const logoX = headerX + headerW - logoW - 10;
  const logoY = headerY + 8;
  const logoFile = fs.existsSync(LOGO_TRANSPARENT_PATH) ? LOGO_TRANSPARENT_PATH : (fs.existsSync(LOGO_JPEG_PATH) ? LOGO_JPEG_PATH : null);
  if (logoFile) {
    try { doc.image(logoFile, logoX, logoY, { width: logoW, height: logoH }); } catch (e) { }
  }

  // 3. Main Heading: "جامعہ" above "دعوۃ", and "دعوة الایمان"
  const leftPad = 10;
  const contentW = logoX - headerX - leftPad;

  // "دعوة الایمان" (moved up to give clear separation from subheading)
  doc.font("KodakBold").fontSize(82).fillColor("#1c5292");
  const headW = doc.widthOfString("دعوة الایمان", { features: ["rtla"] });
  doc.text("دعوة الایمان", headerX + leftPad, headerY + 15, { width: contentW, align: "center", features: ["rtla"] });

  // "جامعہ" directly above "دعوۃ"
  const headStartX = headerX + leftPad + (contentW - headW) / 2;
  const headRightX = headStartX + headW;
  const jamiaW = 85;
  const jamiaX = headRightX - 108;
  doc.font("KodakBold").fontSize(27).fillColor("#1c5292");
  doc.text("جامعہ", jamiaX, headerY + 2, { width: jamiaW, align: "center", features: ["rtla"] });

  // 4. Subheading: Address spanning across the card width
  const subAddress = "چہ مینار مسجد،    روشن پورہ،    حضرت بالے پیر بیڑ    )مہاراشٹر(";
  doc.font("KodakBold").fontSize(22).fillColor("#112233");
  doc.text(subAddress, headerX + 10, headerY + 98, { width: headerW - 20, align: "center", features: ["rtla"] });

  // 5. English Banner
  const bannerY = headerY + topBoxH;
  const bannerH = 36;
  const leftW = 265;
  const rightW = headerW - leftW;

  // Left banner: dark royal blue with bold yellow text
  doc.rect(headerX, bannerY, leftW, bannerH).fill("#1462a6");
  doc.font("Helvetica-Bold").fontSize(16.5).fillColor("#fed100");
  doc.text("JAMIA DAWAT-UL-EMAN", headerX + 5, bannerY + 10, { width: leftW - 10, align: "center" });

  // Right banner: medium blue with white address text
  doc.rect(headerX + leftW, bannerY, rightW, bannerH).fill("#1e78be");
  doc.font("Helvetica-Oblique").fontSize(9.5).fillColor("#ffffff");
  doc.text("6 Minar Masjid,Roashan Pura,\nHazrat Balepeer,Beed.(Maharashtra)", headerX + leftW + 4, bannerY + 6.5, {
    width: rightW - 8,
    align: "center",
    lineGap: 1.5,
  });

  // Borders for header box and banner
  doc.lineWidth(1.2).strokeColor(COLORS.blue).rect(headerX, headerY, headerW, topBoxH + bannerH).stroke();
  doc.moveTo(headerX, bannerY).lineTo(headerX + headerW, bannerY).lineWidth(1.2).strokeColor(COLORS.blue).stroke();
  doc.moveTo(headerX + leftW, bannerY).lineTo(headerX + leftW, bannerY + bannerH).lineWidth(1.2).strokeColor(COLORS.blue).stroke();

  // ---- Result title line ---------------------------------------------------
  const titleY = bannerY + bannerH + 9;
  const examDate = exam.date ? new Date(exam.date) : new Date();
  const typeKey = String(exam.examType || "").toLowerCase().trim();
  const typeUrdu = EXAM_TYPE_URDU[typeKey] || exam.examType || "";
  const reverseDigits = (s) => String(s).replace(/[۰-۹]+/g, (run) => run.split("").reverse().join(""));
  const gYear = toUrduDigits(String(exam.academicYear || examDate.getFullYear()));
  const hYear = toUrduDigits(hijriYear(examDate));
  const titleLine = reverseDigits(`دینی و عصری نتیجہ امتحان ${typeUrdu} ${gYear}ء${hYear ? ` - ${hYear}ھ` : ""}`);
  boxText(doc, titleLine, L, titleY, R - L, 28, { size: 16.5, color: COLORS.red, align: "center" });

  // ---- Student details -----------------------------------------------------
  const name = getLocalizedStudentName(student, lang);
  const father = getLocalizedFatherName(student, lang);
  let fullName = name;
  if (father) {
    fullName = isUrdu ? `${name} ولد ${father}` : `${name} s/o ${father}`;
  }
  const className = getLocalizedClassName(exam.class || student.studentClass || student.className || student.classId, lang);

  const rowH = 24;
  const r1 = titleY + 29;
  const r2 = r1 + rowH + 2;
  const r3 = r2 + rowH + 2;

  // row 1 : name
  const lab1 = 124;
  boxText(doc, "نام طالب علم مع ولدیت:", R - lab1, r1, lab1, rowH, { size: 13, align: "right", pad: 0 });
  dottedLine(doc, L, R - lab1 - 2, r1 + rowH - 4);
  const isNameUrdu = ARABIC_RE.test(fullName);
  boxText(doc, fullName, L, r1, R - lab1 - L - 4, rowH, { size: isNameUrdu ? 15 : 13, font: isNameUrdu ? "UrduFont" : "Helvetica-Bold" });

  // row 2 : class
  const lab2 = 48;
  boxText(doc, "جماعت:", R - lab2, r2, lab2, rowH, { size: 13, align: "right", pad: 0 });
  dottedLine(doc, L, R - lab2 - 2, r2 + rowH - 4);
  const isClassUrdu = ARABIC_RE.test(className);
  boxText(doc, className, L, r2, R - lab2 - L - 4, rowH, { size: isClassUrdu ? 14 : 12, font: isClassUrdu ? "UrduFont" : "Helvetica-Bold" });

  // row 3 : roll number (right) + date (left)
  const lab3 = 56;
  const rollEndX = R - lab3 - 2;
  const rollStartX = R - 250;
  boxText(doc, "رول نمبر:", R - lab3, r3, lab3, rowH, { size: 13, align: "right", pad: 0 });
  dottedLine(doc, rollStartX, rollEndX, r3 + rowH - 4);
  boxText(doc, student.rollNumber || "", rollStartX, r3, rollEndX - rollStartX, rowH, { size: 13, font: "Helvetica-Bold" });

  const dateLabW = 40;
  const dateRight = rollStartX - 14;
  boxText(doc, "تاریخ:", dateRight - dateLabW, r3, dateLabW, rowH, { size: 13, align: "right", pad: 0 });
  dottedLine(doc, L, dateRight - dateLabW - 2, r3 + rowH - 4);
  boxText(doc, formatDate(exam.date), L, r3, dateRight - dateLabW - 2 - L, rowH, { size: 12, font: "Helvetica" });

  // ---- Layout of the two tables -------------------------------------------
  const top = r3 + rowH + 12;
  const sideW = 104;
  const tx = L + sideW + 12; // table left x
  const tw = R - tx;         // table width

  // ---- PART (A) : DEENI ----------------------------------------------------
  boxText(doc, "PART (A) DEENI EDUCATION", tx, top, tw, 14, { font: "Helvetica", size: 10.5, pad: 0 });
  const aHeadY = top + 16;
  const aHeadH = 26;
  const aCols = [ // visual left -> right
    { key: "remark", w: 86, label: "تبصرہ" },
    { key: "marks", w: 86, label: "حاصل شدہ نمبر" },
    { key: "max", w: 52, label: "کل نمبر" },
    { key: "subject", w: 0, label: "مضمون" },
    { key: "sno", w: 34, label: "شمار" },
  ];
  const fixedA = aCols.reduce((s, c) => s + c.w, 0);
  aCols.find((c) => c.key === "subject").w = tw - fixedA;

  let cx = tx;
  aCols.forEach((c) => {
    c.x = cx;
    cell(doc, cx, aHeadY, c.w, aHeadH, { fill: COLORS.magenta, stroke: "#ffffff" });
    boxText(doc, c.label, cx, aHeadY, c.w, aHeadH, { size: 12, color: "#ffffff" });
    cx += c.w;
  });

  const aRows = Math.max(8, data.deeni.length);
  const aRowH = Math.min(28, 224 / aRows);
  const aBodyY = aHeadY + aHeadH;
  for (let i = 0; i < aRows; i++) {
    const y = aBodyY + i * aRowH;
    const row = data.deeni[i];
    aCols.forEach((c) => {
      cell(doc, c.x, y, c.w, aRowH);
      let v = "";
      if (c.key === "sno") v = String(i + 1);
      else if (row) {
        if (c.key === "subject") v = row.name;
        else if (c.key === "max") v = row.max;
        else if (c.key === "marks") v = row.marks === null ? "" : (row.marks === "ABSENT" ? "غیر حاضر" : row.marks);
        else if (c.key === "remark") v = row.remark;
      }
      boxText(doc, v, c.x, y, c.w, aRowH, {
        size: c.key === "sno" ? 14 : 12,
        font: c.key === "sno" ? "Times-Roman" : undefined,
      });
    });
  }

  // total row of part A
  const aTotY = aBodyY + aRows * aRowH;
  const aTotH = 28;
  const colByKey = (k) => aCols.find((c) => c.key === k);
  const subj = colByKey("subject");
  const sno = colByKey("sno");
  const mergedX = subj.x;
  const mergedW = subj.w + sno.w;
  cell(doc, mergedX, aTotY, mergedW, aTotH);
  boxText(doc, "TOTAL", mergedX, aTotY, mergedW / 2, aTotH, { font: "Helvetica-Bold", size: 12, align: "right", pad: 4 });
  boxText(doc, "جملہ نمبرات", mergedX + mergedW / 2, aTotY, mergedW / 2, aTotH, { size: 12, align: "left", pad: 4 });
  const hasDeeniMarks = data.deeni.some((r) => typeof r.marks === "number");
  const deeniMax = data.deeni.reduce((s, r) => s + r.max, 0);
  const deeniObt = data.deeni.reduce((s, r) => s + (typeof r.marks === "number" ? r.marks : 0), 0);
  ["max", "marks", "remark"].forEach((k) => {
    const c = colByKey(k);
    cell(doc, c.x, aTotY, c.w, aTotH);
    let v = "";
    if (k === "max" && data.deeni.length) v = deeniMax;
    if (k === "marks" && hasDeeniMarks) v = deeniObt;
    boxText(doc, v, c.x, aTotY, c.w, aTotH, { font: "Helvetica-Bold", size: 12 });
  });

  // ---- Sidebar (percentage / total / grade / ranks) ------------------------
  const sideX = L + 2;
  const sideBoxW = sideW - 4;
  const sideItems = [
    { label: "کل فیصد", value: `${data.percentage.toFixed(2)}%` },
    { label: "کل حاصل شدہ نمبرات", value: `${data.obtained} / ${data.total}` },
    { label: "درجہ امتیاز", value: data.grade },
    { label: "اول", value: "" },
    { label: "دوم", value: "" },
    { label: "سوم", value: "" },
    { label: "محنت درکار", value: "" },
  ];
  const sideTop = aHeadY;
  const sidePitch = (aTotY + aTotH - sideTop) / sideItems.length;
  sideItems.forEach((it, i) => {
    const y = sideTop + i * sidePitch;
    boxText(doc, it.label, sideX, y, sideBoxW, 18, { size: 12, pad: 0 });
    const by = y + 19;
    const bh = Math.min(22, sidePitch - 22);
    cell(doc, sideX, by, sideBoxW, bh, { lineWidth: 1 });
    boxText(doc, it.value, sideX, by, sideBoxW, bh, { font: "Helvetica-Bold", size: 11 });
  });

  // ---- PART (B) : ASRI -----------------------------------------------------
  const bTitleY = aTotY + aTotH + 18;
  boxText(doc, "PART (B) ASRI EDUCATION", tx, bTitleY, tw, 14, { font: "Helvetica", size: 10.5, pad: 0 });
  const bHeadY = bTitleY + 16;
  const bHeadH = 24;
  const bCols = [ // visual left -> right
    { key: "sno", w: 40, label: "S.No" },
    { key: "subject", w: 0, label: "Subject" },
    { key: "max", w: 70, label: "Max Marks" },
    { key: "marks", w: 96, label: "Marks Obtained" },
    { key: "remark", w: 66, label: "Remarks" },
  ];
  bCols.find((c) => c.key === "subject").w = tw - bCols.reduce((s, c) => s + c.w, 0);
  cx = tx;
  bCols.forEach((c) => {
    c.x = cx;
    cell(doc, cx, bHeadY, c.w, bHeadH, { fill: COLORS.green, stroke: "#ffffff" });
    boxText(doc, c.label, cx, bHeadY, c.w, bHeadH, { font: "Helvetica", size: 10, color: "#ffffff" });
    cx += c.w;
  });

  // When the exam has no modern subjects keep the printed default list (blank marks).
  const asriRows = data.asri.length
    ? data.asri
    : DEFAULT_ASRI_SUBJECTS.map((n) => ({ name: n, max: 100, marks: null, remark: "" }));
  const bRows = Math.max(4, asriRows.length);
  const bRowH = Math.min(28, 112 / bRows);
  const bBodyY = bHeadY + bHeadH;
  asriRows.concat(new Array(bRows - asriRows.length).fill(null)).forEach((row, i) => {
    const y = bBodyY + i * bRowH;
    bCols.forEach((c) => {
      cell(doc, c.x, y, c.w, bRowH);
      let v = "";
      let font;
      let size = 12;
      if (c.key === "sno") { v = String(i + 1); font = "Times-Roman"; size = 14; }
      else if (row) {
        if (c.key === "subject") { v = row.name; font = ARABIC_RE.test(v) ? undefined : "Times-Roman"; }
        else if (c.key === "max") { v = row.max; font = "Times-Roman"; size = 14; }
        else if (c.key === "marks") { v = row.marks === null ? "" : (row.marks === "ABSENT" ? "غیر حاضر" : row.marks); font = "Times-Roman"; size = 13; }
        else if (c.key === "remark") v = row.remark;
      }
      boxText(doc, v, c.x, y, c.w, bRowH, { size, font });
    });
  });

  const bTotY = bBodyY + bRows * bRowH;
  const bTotH = 28;
  const bSubj = bCols.find((c) => c.key === "subject");
  const bSno = bCols[0];
  cell(doc, bSno.x, bTotY, bSno.w + bSubj.w, bTotH);
  boxText(doc, "TOTAL", bSno.x, bTotY, bSno.w + bSubj.w, bTotH, { font: "Times-Bold", size: 14 });
  const asriMax = asriRows.reduce((s, r) => s + r.max, 0);
  const hasAsriMarks = data.asri.some((r) => typeof r.marks === "number");
  const asriObt = data.asri.reduce((s, r) => s + (typeof r.marks === "number" ? r.marks : 0), 0);
  ["max", "marks", "remark"].forEach((k) => {
    const c = bCols.find((x) => x.key === k);
    cell(doc, c.x, bTotY, c.w, bTotH);
    let v = "";
    if (k === "max") v = asriMax;
    if (k === "marks" && hasAsriMarks) v = asriObt;
    boxText(doc, v, c.x, bTotY, c.w, bTotH, { font: "Times-Bold", size: 14 });
  });

  // ---- Signatures / seal ---------------------------------------------------
  const sigX1 = L + 4;
  const sigX2 = L + sideW - 4;
  const sigRows = [
    { label: "کلاس ٹیچر دستخط", y: bHeadY + 58 },
    { label: "مہتمم جامعہ دستخط", y: bHeadY + 108 },
  ];
  sigRows.forEach((s) => {
    doc.lineWidth(0.8).strokeColor(COLORS.line).moveTo(sigX1, s.y).lineTo(sigX2, s.y).stroke();
    boxText(doc, s.label, sigX1, s.y + 2, sigX2 - sigX1, 22, { size: 12, pad: 0 });
  });
  boxText(doc, "مہر جامعہ", sigX1, bTotY + 4, sigX2 - sigX1, 24, { size: 12, pad: 0, align: "left" });
}

/**
 * Streams a PDF containing one marksheet page per entry in `entries`.
 * entries: [{ student, exam, results }]
 */
function renderMarksheetPDF(res, filename, entries, options = {}) {
  const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: false });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${String(filename).replace(/\s+/g, "_")}.pdf"`);
  doc.pipe(res);
  registerFonts(doc);

  entries.forEach((entry) => {
    doc.addPage({ size: "A4", margin: 0 });
    drawPage(doc, entry, options);
  });

  doc.end();
}

module.exports = { renderMarksheetPDF, computeMarksheet, drawPage };
