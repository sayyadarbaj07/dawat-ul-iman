const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

exports.puppeteerSmokeTest = async (req, res) => {
  let browser;
  try {
    const URDU_FONT_PATH = path.join(__dirname, "../utils/fonts/Jameel Noori Nastaleeq.ttf");
    let jameelFontBase64 = "";
    if (fs.existsSync(URDU_FONT_PATH)) {
      jameelFontBase64 = fs.readFileSync(URDU_FONT_PATH).toString("base64");
    }

    const fontFaceCSS = jameelFontBase64 ? `
      @font-face {
        font-family: 'Jameel';
        src: url(data:font/ttf;base64,${jameelFontBase64}) format('truetype');
        font-weight: normal;
        font-style: normal;
      }
    ` : "";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          ${fontFaceCSS}
          body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 50px; font-size: 24px; }
          .urdu { font-family: 'Jameel', sans-serif; }
        </style>
      </head>
      <body>
        <h2>Puppeteer Render Smoke Test</h2>
        <div dir="ltr">Arbaj Sayyad</div>
        <div dir="rtl" class="urdu">محمد علی</div>
        <div dir="auto" class="urdu">Arbaj محمد</div>
        
        <script>
          // Expose font check to Puppeteer evaluation
          window.checkFontLoaded = async () => {
            await document.fonts.ready;
            return document.fonts.check('16px "Jameel"');
          };
        </script>
      </body>
      </html>
    `;

    // Typical Render / Docker flags
    const launchArgs = [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process'
    ];

    browser = await puppeteer.launch({
      headless: "new",
      args: launchArgs
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const fontLoaded = await page.evaluate(() => window.checkFontLoaded());

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("X-Puppeteer-Font-Loaded", String(fontLoaded));
    res.setHeader("Content-Disposition", `inline; filename="smoke_test.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error("Smoke Test Error:", error);
    res.status(500).json({ 
      message: "Smoke test failed",
      error: error.toString(),
      stack: error.stack
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
