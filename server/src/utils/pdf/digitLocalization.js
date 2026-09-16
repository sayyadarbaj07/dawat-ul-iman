/**
 * digitLocalization.js
 * Utility to convert Western digits (0-9) to standard Urdu Unicode digits (۰-۹).
 */

const englishToUrduMap = {
  '0': '۰',
  '1': '۱',
  '2': '۲',
  '3': '۳',
  '4': '۴',
  '5': '۵',
  '6': '۶',
  '7': '۷',
  '8': '۸',
  '9': '۹'
};

function toUrduDigits(numberString) {
  if (!numberString) return "";
  return String(numberString).replace(/[0-9]/g, match => englishToUrduMap[match]);
}

module.exports = { toUrduDigits };
