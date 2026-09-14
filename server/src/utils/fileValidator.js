/**
 * fileValidator.js
 * Validates the magic bytes of a file buffer to ensure it matches the expected MIME type.
 * Returns the safe file extension if valid, or null if invalid.
 */

const ALLOWED_MIME_TYPES = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

/**
 * Validates magic bytes of a buffer
 * @param {Buffer} buffer - The file buffer
 * @param {string} mimeType - The reported MIME type
 * @returns {string|null} - The safe extension (e.g. '.pdf') or null if invalid
 */
function validateFileSignature(buffer, mimeType) {
  if (!buffer || buffer.length < 8) return null;

  const hex = buffer.toString('hex', 0, 8).toUpperCase();

  switch (mimeType) {
    case "application/pdf":
      // PDF magic number: %PDF (25 50 44 46)
      if (hex.startsWith("25504446")) return ALLOWED_MIME_TYPES[mimeType];
      break;
    case "image/jpeg":
      // JPEG magic number: FF D8 FF
      if (hex.startsWith("FFD8FF")) return ALLOWED_MIME_TYPES[mimeType];
      break;
    case "image/png":
      // PNG magic number: 89 50 4E 47 0D 0A 1A 0A
      if (hex.startsWith("89504E470D0A1A0A")) return ALLOWED_MIME_TYPES[mimeType];
      break;
    case "image/webp":
      // WEBP magic number: RIFF .... WEBP
      // 52 49 46 46 (RIFF), plus 4 bytes, plus 57 45 42 50 (WEBP)
      if (hex.startsWith("52494646")) {
        const webpHex = buffer.toString('hex', 8, 12).toUpperCase();
        if (webpHex === "57454250") return ALLOWED_MIME_TYPES[mimeType];
      }
      break;
    default:
      return null;
  }
  
  return null;
}

module.exports = {
  ALLOWED_MIME_TYPES,
  validateFileSignature
};
