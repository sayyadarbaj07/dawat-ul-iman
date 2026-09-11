import { format } from "date-fns";

const urduDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const englishDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Converts English digits in a string to Urdu digits.
 * Leaves other characters (letters, symbols) untouched.
 */
export function toUrduDigits(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\d/g, (d) => urduDigits[d]);
}

/**
 * Converts Urdu digits in a string to English digits.
 * Leaves other characters untouched.
 */
export function toEnglishDigits(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[۰-۹]/g, (d) => englishDigits[urduDigits.indexOf(d)]);
}

/**
 * Formats a number according to the specified language.
 * Preserves grouping and decimals.
 */
export function formatLocalizedNumber(value, language = "ur") {
  if (value === null || value === undefined || isNaN(Number(value))) return value;
  
  // Format with standard grouping (e.g. 50,000.5)
  const formattedString = Number(value).toLocaleString("en-US", { maximumFractionDigits: 10 });
  
  if (language === "ur") {
    return toUrduDigits(formattedString);
  }
  return formattedString;
}

/**
 * Formats a date using date-fns and localizes numerals if language is "ur".
 */
export function formatLocalizedDate(value, language = "ur", formatStr = "dd/MM/yyyy") {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value; // Invalid date fallback
  
  const formatted = format(date, formatStr);
  return language === "ur" ? toUrduDigits(formatted) : formatted;
}

/**
 * Formats a datetime using date-fns and localizes numerals if language is "ur".
 */
export function formatLocalizedDateTime(value, language = "ur", formatStr = "dd/MM/yyyy hh:mm a") {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  
  const formatted = format(date, formatStr);
  return language === "ur" ? toUrduDigits(formatted) : formatted;
}

/**
 * Returns the correct name based on language selection.
 * In Urdu mode, falls back to English name if Urdu name is missing.
 * In English mode, only returns English name.
 */
export function getLocalizedStudentName(student, language = "ur") {
  if (!student) return "";
  
  const englishName = student.fullName || student.name || "";
  if (language === "ur") {
    return student.nameUrdu || englishName;
  }
  return englishName;
}
/**
 * Formats a number as a percentage, using the correct percent sign per locale.
 * Urdu: ۸۵٪  English: 85%
 */
export function formatLocalizedPercent(value, language = "ur") {
  if (value === null || value === undefined || value === "" || isNaN(Number(value))) return "";
  const pctSign = language === "ur" ? "٪" : "%";
  const num = formatLocalizedNumber(Number(value), language);
  return `${num}${pctSign}`;
}
