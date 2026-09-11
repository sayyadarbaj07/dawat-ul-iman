const arabicReshaper = require('arabic-reshaper');
const bidi = require('bidi-js')();

/**
 * Processes text (Urdu/English mixed) for PDFKit.
 * Shapes Arabic characters and resolves bidirectional flow.
 */
function processUrduText(text) {
    if (!text) return "";
    
    // Reshape Arabic/Urdu characters to their correct connected forms
    const shapedText = arabicReshaper.convertArabic(text);

    // Apply BiDi processing to reverse RTL segments while preserving LTR (like numbers/English)
    const embeddingLevels = bidi.getEmbeddingLevels(shapedText, 'rtl');
    const bidiResult = bidi.getReorderedString(shapedText, embeddingLevels);
    
    return bidiResult;
}

/**
 * Helper to correctly align RTL text horizontally given right margin.
 * (PDFKit 'align: right' does not always work well with bidi strings when x,y is absolute).
 */
function alignRightX(doc, processedText, rightMarginX, fontName, fontSize) {
    if (fontName) doc.font(fontName);
    if (fontSize) doc.fontSize(fontSize);
    
    let textWidth = 0;
    try {
        textWidth = doc.widthOfString(processedText);
    } catch (e) {
        // Fallback for fonts that crash on specific Urdu characters (e.g., ڑ)
        const size = fontSize || 12;
        textWidth = processedText.length * (size * 0.4);
    }
    
    return rightMarginX - textWidth;
}

/**
 * Draws RTL text anchored to the right margin.
 */
function drawTextRTL(doc, text, rightX, y, options = {}) {
    const processed = processUrduText(text);
    const x = alignRightX(doc, processed, rightX, options.font, options.fontSize);
    
    // Default config
    const textOpts = { lineBreak: false, ...options };
    
    doc.text(processed, x, y, textOpts);
}

module.exports = {
    processUrduText,
    alignRightX,
    drawTextRTL
};
