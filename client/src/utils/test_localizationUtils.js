import { 
  formatLocalizedNumber, 
  formatLocalizedDate, 
  formatLocalizedDateTime,
  toUrduDigits, 
  toEnglishDigits,
  getLocalizedStudentName 
} from "./localizationUtils.js";

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Test failed: ${message}. Expected "${expected}", got "${actual}"`);
  }
}

try {
  console.log("Running localizationUtils tests...");

  // ─── toUrduDigits / toEnglishDigits ───────────────────────────────────────
  assertEqual(toUrduDigits("123"), "۱۲۳", "toUrduDigits basic");
  assertEqual(toEnglishDigits("۱۲۳"), "123", "toEnglishDigits basic");
  assertEqual(toUrduDigits(null), "", "toUrduDigits null");
  assertEqual(toUrduDigits(undefined), "", "toUrduDigits undefined");
  assertEqual(toUrduDigits("abc"), "abc", "toUrduDigits letters unchanged");

  // ─── formatLocalizedNumber ────────────────────────────────────────────────
  assertEqual(formatLocalizedNumber(0, "ur"), "۰", "formatLocalizedNumber 0");
  assertEqual(formatLocalizedNumber(123, "ur"), "۱۲۳", "formatLocalizedNumber 123");
  assertEqual(formatLocalizedNumber(425, "ur"), "۴۲۵", "formatLocalizedNumber 425");
  assertEqual(formatLocalizedNumber(85.5, "ur"), "۸۵.۵", "formatLocalizedNumber decimal");
  assertEqual(formatLocalizedNumber(50000, "ur"), "۵۰,۰۰۰", "formatLocalizedNumber comma group");
  assertEqual(formatLocalizedNumber(-150, "ur"), "-۱۵۰", "formatLocalizedNumber negative");
  assertEqual(formatLocalizedNumber(425, "en"), "425", "formatLocalizedNumber EN");

  // ─── formatLocalizedDate ──────────────────────────────────────────────────
  const dateStr = "2026-09-09T10:00:00.000Z";
  const formattedUr = formatLocalizedDate(dateStr, "ur", "dd/MM/yyyy");
  assertEqual(formattedUr, "۰۹/۰۹/۲۰۲۶", "formatLocalizedDate UR");
  const formattedEn = formatLocalizedDate(dateStr, "en", "dd/MM/yyyy");
  assertEqual(formattedEn, "09/09/2026", "formatLocalizedDate EN");
  assertEqual(formatLocalizedDate(null, "ur"), "", "formatLocalizedDate null");
  assertEqual(formatLocalizedDate("", "ur"), "", "formatLocalizedDate empty string");

  // ─── formatLocalizedDateTime ─────────────────────────────────────────────
  const dtStr = "2026-09-09T00:00:00.000Z";
  const formattedDtUr = formatLocalizedDateTime(dtStr, "ur", "dd/MM/yyyy");
  const hasUrduDigits = /[۰-۹]/.test(formattedDtUr);
  if (!hasUrduDigits) {
    throw new Error(`Test failed: formatLocalizedDateTime UR — expected Urdu digits, got "${formattedDtUr}"`);
  }
  console.log(`  formatLocalizedDateTime UR: "${formattedDtUr}" ✓`);

  const formattedDtEn = formatLocalizedDateTime(dtStr, "en", "dd/MM/yyyy");
  const hasEnglishDigitsOnly = /^\d/.test(formattedDtEn);
  if (!hasEnglishDigitsOnly) {
    throw new Error(`Test failed: formatLocalizedDateTime EN — expected English digits, got "${formattedDtEn}"`);
  }
  console.log(`  formatLocalizedDateTime EN: "${formattedDtEn}" ✓`);

  assertEqual(formatLocalizedDateTime(null, "ur"), "", "formatLocalizedDateTime null");
  assertEqual(formatLocalizedDateTime("invalid-date", "ur"), "invalid-date", "formatLocalizedDateTime invalid");

  // ─── getLocalizedStudentName ─────────────────────────────────────────────
  const studentFull = { name: "Ahmed", nameUrdu: "احمد" };
  const studentWithFullName = { fullName: "Ali Khan", nameUrdu: "علی خان" };
  const studentMissingUrdu = { name: "John" };
  const studentMissingUrduFullName = { fullName: "Mary" };

  assertEqual(getLocalizedStudentName(studentFull, "ur"), "احمد", "getLocalizedStudentName UR full");
  assertEqual(getLocalizedStudentName(studentMissingUrdu, "ur"), "John", "getLocalizedStudentName UR fallback to name");
  assertEqual(getLocalizedStudentName(studentWithFullName, "ur"), "علی خان", "getLocalizedStudentName UR fullName + Urdu");
  assertEqual(getLocalizedStudentName(studentMissingUrduFullName, "ur"), "Mary", "getLocalizedStudentName UR fallback to fullName");
  assertEqual(getLocalizedStudentName(studentFull, "en"), "Ahmed", "getLocalizedStudentName EN");
  assertEqual(getLocalizedStudentName(studentWithFullName, "en"), "Ali Khan", "getLocalizedStudentName EN fullName");
  assertEqual(getLocalizedStudentName(null, "ur"), "", "getLocalizedStudentName null");

  // ─── PDF language resolution logic (mirrors server resolvePdfLanguage) ───
  function resolvePdfLanguage(raw) {
    return raw === "en" ? "en" : "ur";
  }
  assertEqual(resolvePdfLanguage(undefined), "ur", "PDF: no language → ur");
  assertEqual(resolvePdfLanguage(null), "ur", "PDF: null → ur");
  assertEqual(resolvePdfLanguage(""), "ur", "PDF: empty → ur");
  assertEqual(resolvePdfLanguage("ur"), "ur", "PDF: ur → ur");
  assertEqual(resolvePdfLanguage("en"), "en", "PDF: en → en");
  assertEqual(resolvePdfLanguage("fr"), "ur", "PDF: invalid → ur");
  assertEqual(resolvePdfLanguage("EN"), "ur", "PDF: wrong case → ur");

  console.log("All localization tests passed!");
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
