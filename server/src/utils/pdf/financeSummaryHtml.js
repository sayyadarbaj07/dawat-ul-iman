const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const { toUrduDigits } = require("./digitLocalization");

const LOGO_PATH = path.join(__dirname, "../../../../client/public/logo1.jpeg");
const URDU_FONT_PATH = path.join(__dirname, "../fonts/Jameel Noori Nastaleeq.ttf");

function getBase64Asset(filePath) {
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath).toString("base64");
  }
  return null;
}

function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function generateFinanceSummaryHTML(options) {
  const { transactions, dateStr, academicYear, totalIncome, totalExpense, currentBalance, language, URDU_LABELS } = options;
  const isUrdu = language === "ur";
  
  const logoBase64 = getBase64Asset(LOGO_PATH);
  const jameelFontBase64 = getBase64Asset(URDU_FONT_PATH);
  
  const logoSrc = logoBase64 ? `data:image/jpeg;base64,${logoBase64}` : "";
  const fontFaceCSS = jameelFontBase64 ? `
    @font-face {
      font-family: 'Jameel';
      src: url(data:font/ttf;base64,${jameelFontBase64}) format('truetype');
      font-weight: normal;
      font-style: normal;
    }
  ` : "";

  // Static Labels
  const lblTitle = isUrdu ? URDU_LABELS.financeReport : "Finance Report";
  const lblDateRange = isUrdu ? `${dateStr} :${URDU_LABELS.date}` : `Date Range: ${dateStr}`;
  const lblAcadYear = isUrdu ? (academicYear ? `${academicYear} :${URDU_LABELS.academicYear}` : "") : (academicYear ? `Academic Year: ${academicYear}` : "");
  
  const lblTotalIncome = isUrdu ? `Rs ${toUrduDigits(totalIncome.toString())} :${URDU_LABELS.income}` : `Total Income: Rs ${totalIncome}`;
  const lblTotalExpense = isUrdu ? `Rs ${toUrduDigits(totalExpense.toString())} :${URDU_LABELS.expense}` : `Total Expense: Rs ${totalExpense}`;
  const lblCurrentBalance = isUrdu ? `Rs ${toUrduDigits(currentBalance.toString())} :موجودہ بیلنس` : `Current Balance: Rs ${currentBalance}`;

  const thDate = isUrdu ? URDU_LABELS.date : "Date";
  const thDesc = isUrdu ? URDU_LABELS.description : "Description";
  const thCat = isUrdu ? URDU_LABELS.category : "Category";
  const thMode = isUrdu ? URDU_LABELS.paymentMode || "Mode" : "Mode";
  const thAmt = isUrdu ? URDU_LABELS.amount : "Amount";

  let tableRows = "";
  transactions.forEach(tx => {
    const txDateRaw = new Date(tx.date).toLocaleDateString();
    const txDate = isUrdu ? toUrduDigits(txDateRaw) : txDateRaw;
    const sign = tx.type === "income" ? "+" : "-";
    const amtTextRaw = `${sign} Rs ${tx.amount}`;
    const amtText = isUrdu ? toUrduDigits(amtTextRaw) : amtTextRaw;
    
    const desc = escapeHtml(tx.description || "—");
    const cat = escapeHtml(tx.category || "—");
    const mode = escapeHtml(tx.paymentMode || "Cash");

    tableRows += `
      <tr>
        <td class="text-right">${txDate}</td>
        <td class="${isUrdu ? 'text-right' : 'text-left'}"><span dir="auto">${desc}</span></td>
        <td class="${isUrdu ? 'text-right' : 'text-left'}"><span dir="auto">${cat}</span></td>
        <td class="${isUrdu ? 'text-right' : 'text-left'}">${mode}</td>
        <td class="${isUrdu ? 'text-left' : 'text-right'} font-bold ${tx.type === 'income' ? 'text-green' : 'text-red'}">${amtText}</td>
      </tr>
    `;
  });

  const html = `
    <!DOCTYPE html>
    <html lang="${isUrdu ? 'ur' : 'en'}" dir="${isUrdu ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="UTF-8">
      <style>
        ${fontFaceCSS}
        
        * {
          box-sizing: border-box;
        }

        @page {
          size: A4 portrait;
          margin: 0;
        }

        body {
          margin: 0;
          padding: 30px;
          font-family: 'Helvetica', 'Arial', sans-serif;
          font-size: 10pt;
          background: white;
          color: black;
        }

        /* Container exactly mapping PDFKit margin 30, inner margin 34 */
        .outer-border {
          border: 2px solid #047857;
          width: 100%;
          min-height: calc(100vh - 60px);
          padding: 4px;
        }

        .inner-border {
          border: 1px solid #047857;
          width: 100%;
          min-height: calc(100% - 8px);
          padding: 10px;
        }

        /* Institutional Header */
        .header {
          display: flex;
          justify-content: space-between;
          position: relative;
          margin-bottom: 10px;
        }

        .header-left {
          text-align: left;
        }

        .header-right {
          text-align: right;
          font-family: 'Jameel', sans-serif;
        }

        .logo-container {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          top: 5px;
        }
        
        .logo-container img {
          width: 90px;
          height: auto;
        }

        .jamia-en {
          color: #1e1e9c;
          font-weight: bold;
          font-size: 12pt;
          margin: 0;
        }
        
        .dawat-en {
          color: #c8105e;
          font-weight: bold;
          font-size: 22pt;
          margin: 0;
        }

        .jamia-ur {
          color: #c8105e;
          font-size: 20pt;
          margin: 0;
        }

        .dawat-ur {
          color: #c8105e;
          font-size: 30pt;
          margin: 0;
          line-height: 1;
        }
        
        .header-sub-en {
          font-size: 8pt;
          font-weight: bold;
          margin-top: 10px;
        }
        
        .header-address-en {
          font-size: 8pt;
          margin-top: 2px;
        }

        .header-sub-ur {
          font-size: 10pt;
          margin-top: 15px;
        }
        
        .header-address-ur {
          font-size: 9pt;
          font-family: 'Helvetica', sans-serif;
          margin-top: 2px;
        }

        .meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 10pt;
          margin-top: 20px;
        }

        .divider {
          border-bottom: 1.5px solid #047857;
          margin-top: 15px;
          margin-bottom: 20px;
        }

        /* Report Body */
        .report-title {
          text-align: center;
          font-size: 16pt;
          font-weight: bold;
          margin-bottom: 10px;
          ${isUrdu ? "font-family: 'Jameel', sans-serif;" : ""}
        }

        .report-meta {
          margin-bottom: 20px;
        }
        
        .report-meta p {
          margin: 5px 0;
        }

        .summary-header {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          font-size: 12pt;
          margin-bottom: 5px;
        }

        .balance {
          font-size: 14pt;
          font-weight: bold;
          text-decoration: underline;
          margin-bottom: 20px;
        }

        /* Table */
        table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          font-size: 9pt;
        }

        /* Dynamic Urdu Data */
        span[dir="auto"] {
           font-family: 'Jameel', 'Helvetica', 'Arial', sans-serif;
        }

        th {
          font-weight: bold;
          border-bottom: 1px solid black;
          padding: 8px 4px;
        }

        td {
          padding: 8px 4px;
          vertical-align: top;
          word-wrap: break-word;
        }

        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        
        .font-bold { font-weight: bold; }
        
        /* All below header black */
        .report-body, .report-body table, .report-body th, .report-body td, .report-body span {
           color: black !important;
        }

        /* Override red/green to black per requirement */
        .text-green { color: black !important; }
        .text-red { color: black !important; }

        .col-date { width: 14%; }
        .col-desc { width: 35%; }
        .col-cat { width: 22%; }
        .col-mode { width: 14%; }
        .col-amt { width: 15%; }
        
      </style>
    </head>
    <body>
      <div class="outer-border">
        <div class="inner-border">
          
          <!-- Header -->
          <div class="header">
            <div class="header-left">
              <p class="jamia-en">JAMIA</p>
              <p class="dawat-en">DAWAT-UL-EIMAN</p>
              <div class="header-sub-en">Reg.No.: F-0027800(BED)</div>
              <div class="header-address-en"># 6 Minar Masjid, Roshanpura, Hazrat Balepeer, Beed</div>
              <div class="header-address-en">431122 (MS)</div>
            </div>
            
            ${logoSrc ? `<div class="logo-container"><img src="${logoSrc}" alt="Logo"></div>` : ''}

            <div class="header-right">
              <p class="jamia-ur">جامعہ</p>
              <p class="dawat-ur">دعوت الایمان</p>
              <div class="header-sub-ur">چہ مینار مسجد، روشن پورہ، حضرت بالے پیر بیڑ (مہاراشٹر)</div>
              <div class="header-address-ur">431122 (MS)</div>
            </div>
          </div>

          <div class="meta-row">
            <div>No.: ________________</div>
            <div>Date: ________________</div>
          </div>
          
          <div class="divider"></div>

          <!-- Body -->
          <div class="report-body">
            <div class="report-title">${lblTitle}</div>
            
            <div class="report-meta">
              <p>${lblDateRange}</p>
              ${lblAcadYear ? `<p>${lblAcadYear}</p>` : ''}
            </div>

            <div class="summary-header">
              <span>${lblTotalIncome}</span>
              <span>${lblTotalExpense}</span>
            </div>
            <div class="balance">${lblCurrentBalance}</div>

            <table>
              <thead>
                <tr>
                  <th class="col-date text-right">${thDate}</th>
                  <th class="col-desc ${isUrdu ? 'text-right' : 'text-left'}">${thDesc}</th>
                  <th class="col-cat ${isUrdu ? 'text-right' : 'text-left'}">${thCat}</th>
                  <th class="col-mode ${isUrdu ? 'text-right' : 'text-left'}">${thMode}</th>
                  <th class="col-amt ${isUrdu ? 'text-left' : 'text-right'}">${thAmt}</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  return html;
}

exports.generateFinanceSummaryHTMLPDF = async (res, options) => {
  let browser;
  try {
    const html = await generateFinanceSummaryHTML(options);
    
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Wait for fonts to load
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const isJameelLoaded = await page.evaluate(() => {
      return document.fonts.check('16px "Jameel"');
    });

    if (!isJameelLoaded && fs.existsSync(URDU_FONT_PATH)) {
      throw new Error("Jameel font failed to load in Puppeteer.");
    }

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="finance_summary_${new Date().getTime()}.pdf"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error("Puppeteer PDF Error:", error);
    res.status(500).json({ message: "Error generating Finance PDF", error: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
