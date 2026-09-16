/**
 * Processes text (Urdu/English mixed) for PDFKit.
 * Removes double-processing and relies on native PDFKit OpenType features.
 */
function processUrduText(text) {
    if (!text) return "";
    return text;
}

/**
 * Draws RTL text with proper width-aware wrapping and native fontkit features.
 * Automatically aligns to the right inside the specified width, ensuring no clipping.
 */
function drawTextRTL(doc, text, x, y, options = {}) {
    if (options.font) doc.font(options.font);
    if (options.fontSize) doc.fontSize(options.fontSize);
    
    // Merge provided features with 'rtla' (Right-To-Left Arabic native shaping)
    const features = options.features ? [...options.features, 'rtla'] : ['rtla'];
    
    // For pure coordinate-based old calls (e.g. `drawTextRTL(doc, text, rightX, y, options)`), 
    // where they passed `rightX` instead of `x` and no width, we have to simulate alignment.
    // However, new width-aware calls will pass `width` and standard `x`.
    
    if (options.width) {
        // Safe, width-aware rendering
        const textOpts = { 
            align: options.align || 'right', 
            features, 
            ...options 
        };
        doc.text(text, x, y, textOpts);
    } else {
        // Backwards compatibility for fixed-coordinate callers that passed rightX
        let textWidth = 0;
        try {
            textWidth = doc.widthOfString(text, { features });
        } catch (e) {
            textWidth = text.length * ((options.fontSize || 12) * 0.4);
        }
        const startX = x - textWidth; // Here `x` was `rightX` in old signature
        
        const textOpts = { 
            lineBreak: false, 
            features, 
            ...options 
        };
        doc.text(text, startX, y, textOpts);
    }
}

module.exports = {
    processUrduText,
    drawTextRTL
};
