const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

/**
 * Mirrors bracket pairs for RTL rendering when text contains Arabic/Urdu characters.
 * OpenType 'rtla' shaping in fontkit swaps the glyph visual placement, so input '('
 * needs to be paired with ')' to appear correctly oriented on page.
 */
function mirrorBrackets(text) {
    if (!text) return "";
    const str = String(text);
    if (!ARABIC_RE.test(str)) return str;
    return str.replace(/[()\[\]{}«»‹›]/g, (ch) => {
        switch (ch) {
            case '(': return ')';
            case ')': return '(';
            case '[': return ']';
            case ']': return '[';
            case '{': return '}';
            case '}': return '{';
            case '«': return '»';
            case '»': return '«';
            case '‹': return '›';
            case '›': return '‹';
            default: return ch;
        }
    });
}

/**
 * Processes text (Urdu/English mixed) for PDFKit.
 * Handles bracket mirroring for Arabic/Urdu text.
 */
function processUrduText(text) {
    if (!text) return "";
    return mirrorBrackets(text);
}

/**
 * Draws RTL text with proper width-aware wrapping and native fontkit features.
 * Automatically aligns to the right inside the specified width, ensuring no clipping.
 */
function drawTextRTL(doc, text, x, y, options = {}) {
    if (text === undefined || text === null) return;
    const raw = String(text);
    if (!raw && raw !== "0") return;

    const str = mirrorBrackets(raw);
    const hasArabic = ARABIC_RE.test(str);

    if (options.font) {
        doc.font(options.font);
    } else if (hasArabic && doc._font && doc._font.name !== "UrduFont" && doc._registeredFonts && doc._registeredFonts["UrduFont"]) {
        doc.font("UrduFont");
    }
    if (options.fontSize) doc.fontSize(options.fontSize);
    if (options.color) doc.fillColor(options.color);
    
    // Only apply 'rtla' if the text has Arabic characters or explicitly requested
    const features = options.features 
        ? (hasArabic && !options.features.includes('rtla') ? [...options.features, 'rtla'] : options.features)
        : (hasArabic ? ['rtla'] : []);
    
    if (options.width) {
        // Safe, width-aware rendering
        const textOpts = { 
            align: options.align || 'right', 
            features, 
            ...options 
        };
        doc.text(str, x, y, textOpts);
    } else {
        // Backwards compatibility for fixed-coordinate callers that passed rightX
        let textWidth = 0;
        try {
            textWidth = doc.widthOfString(str, { features });
        } catch (e) {
            textWidth = str.length * ((options.fontSize || 12) * 0.4);
        }
        const startX = x - textWidth; // Here `x` was `rightX` in old signature
        
        const textOpts = { 
            lineBreak: false, 
            features, 
            ...options 
        };
        delete textOpts.align; // Avoid double-alignment offset when startX is already right-calculated
        doc.text(str, startX, y, textOpts);
    }
}

module.exports = {
    processUrduText,
    drawTextRTL,
    mirrorBrackets
};
