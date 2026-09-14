const path = require("path");
const fs = require("fs");
const urduPdfHelper = require("./urduPdfHelper");

const LOGO_PATH = path.join(__dirname, "../../../../client/public/logo1.jpeg");

function getLogoPath() {
  if (fs.existsSync(LOGO_PATH)) return LOGO_PATH;
  return null;
}

function drawInstitutionalHeader(doc, isUrdu) {
  const margin = 30; // Double border margins
  const innerMargin = 34;

  // 1. Draw border around current page
  doc.rect(margin, margin, doc.page.width - margin * 2, doc.page.height - margin * 2)
     .lineWidth(2)
     .strokeColor("#047857")
     .stroke();

  doc.rect(innerMargin, innerMargin, doc.page.width - innerMargin * 2, doc.page.height - innerMargin * 2)
     .lineWidth(1)
     .strokeColor("#047857")
     .stroke();

  // Draw Header Content
  const logoPath = getLogoPath();
  const centerX = doc.page.width / 2;
  
  // Logo
  if (logoPath) {
    // Top center logo
    doc.image(logoPath, centerX - 45, innerMargin + 5, { width: 90 });
  }

  // Left Side (English Identity)
  doc.font("Helvetica-Bold");
  doc.fillColor("#1e1e9c"); // "JAMIA" blue/purple tone
  doc.fontSize(12).text("JAMIA", innerMargin + 10, innerMargin + 15, { continued: false });
  
  doc.fillColor("#c8105e"); // "DAWAT-UL-EIMAN" pink/magenta tone
  doc.fontSize(22).text("DAWAT-UL-EIMAN", innerMargin + 10, innerMargin + 28, { continued: false });
  
  doc.fillColor("#000000"); // Address in black
  doc.fontSize(8).font("Helvetica-Bold").text("Reg.No.: F-0027800(BED)", innerMargin + 10, innerMargin + 55);
  doc.font("Helvetica").text("# 6 Minar Masjid, Roshanpura, Hazrat Balepeer, Beed", innerMargin + 10, innerMargin + 65);
  doc.text("431122 (MS)", innerMargin + 10, innerMargin + 75);

  // Right Side (Urdu Identity)
  // Ensure Urdu font is registered
  const urduFontPath = path.join(__dirname, "../fonts/Jameel Noori Nastaleeq.ttf");
  if (fs.existsSync(urduFontPath)) {
    doc.registerFont("UrduFont", urduFontPath);
  } else {
    doc.registerFont("UrduFont", "Helvetica"); // Fallback
  }

  // Draw Urdu Text RTL
  doc.fillColor("#c8105e"); // Match magenta tone for Urdu Title
  urduPdfHelper.drawTextRTL(doc, "جامعہ", doc.page.width - innerMargin - 10, innerMargin + 5, { font: "UrduFont", fontSize: 16, align: "right" });
  urduPdfHelper.drawTextRTL(doc, "دعوت الایمان", doc.page.width - innerMargin - 10, innerMargin + 20, { font: "UrduFont", fontSize: 26, align: "right" });

  doc.fillColor("#000000"); // Address black
  urduPdfHelper.drawTextRTL(doc, "چہ مینار مسجد، روشن پورہ، حضرت بالے پیر بیڑ (مہاراشٹر)", doc.page.width - innerMargin - 10, innerMargin + 55, { font: "UrduFont", fontSize: 10, align: "right" });
  urduPdfHelper.drawTextRTL(doc, "431122 (MS)", doc.page.width - innerMargin - 10, innerMargin + 70, { font: "Helvetica", fontSize: 9, align: "right" });

  // No and Date
  const metaY = innerMargin + 95;
  doc.font("Helvetica").fontSize(10);
  doc.text("No.: ________________", innerMargin + 10, metaY);
  doc.text("Date: ________________", doc.page.width - innerMargin - 130, metaY);

  // Separator Line
  const lineY = metaY + 15;
  doc.moveTo(innerMargin, lineY)
     .lineTo(doc.page.width - innerMargin, lineY)
     .lineWidth(1.5)
     .strokeColor("#047857")
     .stroke();

  // Move cursor below header
  doc.y = lineY + 20;
  doc.fillColor("#000000"); // Reset fill
  doc.x = innerMargin + 10;
}

function drawContinuationHeader(doc) {
  const margin = 30; // Double border margins
  const innerMargin = 34;

  // Draw border around current page
  doc.rect(margin, margin, doc.page.width - margin * 2, doc.page.height - margin * 2)
     .lineWidth(2)
     .strokeColor("#047857")
     .stroke();

  doc.rect(innerMargin, innerMargin, doc.page.width - innerMargin * 2, doc.page.height - innerMargin * 2)
     .lineWidth(1)
     .strokeColor("#047857")
     .stroke();

  // Very compact header
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#c8105e").text("JAMIA DAWAT-UL-EIMAN (Continuation)", innerMargin + 10, innerMargin + 10);
  
  // Separator Line
  const lineY = innerMargin + 25;
  doc.moveTo(innerMargin, lineY)
     .lineTo(doc.page.width - innerMargin, lineY)
     .lineWidth(1.5)
     .strokeColor("#047857")
     .stroke();

  doc.y = lineY + 20;
  doc.fillColor("#000000"); // Reset
  doc.x = innerMargin + 10;
}

/**
 * Applies the official institutional template to the provided PDFKit document.
 * This function should be called immediately after doc creation.
 */
function applyInstitutionalTemplate(doc, options = {}) {
  const isUrdu = options.language === 'ur';

  // Draw on the first page
  drawInstitutionalHeader(doc, isUrdu);

  // Automatically draw on any subsequently added pages
  doc.on('pageAdded', () => {
    drawContinuationHeader(doc);
  });
}

module.exports = {
  applyInstitutionalTemplate
};
