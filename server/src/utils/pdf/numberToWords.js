const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];

const onesUrdu = ["", "ایک", "دو", "تین", "چار", "پانچ", "چھ", "سات", "آٹھ", "نو"];
const tensUrdu = ["", "دس", "بیس", "تیس", "چالیس", "پچاس", "ساٹھ", "ستر", "اسی", "نوے"];
// Urdu counting up to 99 is highly irregular, so for a simple receipt without massive dependencies,
// we map 1-99 directly or use a localized approach. Let's build a simple 1-99 array for Urdu.
const urdu1to99 = [
  "", "ایک", "دو", "تین", "چار", "پانچ", "چھ", "سات", "آٹھ", "نو", "دس",
  "گیارہ", "بارہ", "تیرہ", "چودہ", "پندرہ", "سولہ", "سترہ", "اٹھارہ", "انیس", "بیس",
  "اکیس", "بائیس", "تیئیس", "چوبیس", "پچیس", "چھبیس", "ستائیس", "اٹھائیس", "انتیس", "تیس",
  "اکتیس", "بتیس", "تینتیس", "چونتیس", "پینتیس", "چھتیس", "سینتیس", "اڑھتیس", "انتالیس", "چالیس",
  "اکتالیس", "بیالیس", "تینتالیس", "چوالیس", "پینتالیس", "چھیالیس", "سینتالیس", "اڑتالیس", "انچاس", "پچاس",
  "اکیاون", "باون", "ترپن", "چون", "پچپن", "چھپن", "ستاون", "اٹھاون", "انسٹھ", "ساٹھ",
  "اکسٹھ", "باسٹھ", "تریسٹھ", "چونسٹھ", "پینسٹھ", "چھیاسٹھ", "سڑسٹھ", "اڑسٹھ", "انہتر", "ستر",
  "اکہتر", "بہتر", "تہتر", "چوہتر", "پچہتر", "چھہتر", "ستتر", "اٹھتر", "اناسی", "اسی",
  "اکیاسی", "بیاسی", "تراسی", "چوراسی", "پچاسی", "چھیاسی", "ستاسی", "اٹھاسی", "نواسی", "نوے",
  "اکانوے", "بانوے", "ترانوے", "چورانوے", "پچانوے", "چھیانوے", "ستانوے", "اٹھانوے", "ننانوے"
];

function convertBelowThousand(n, lang) {
  if (lang === "ur") {
    let str = "";
    if (n >= 100) {
      str += urdu1to99[Math.floor(n / 100)] + " سو ";
      n %= 100;
    }
    if (n > 0) {
      if (str !== "") str += "اور ";
      str += urdu1to99[n] + " ";
    }
    return str.trim();
  } else {
    let str = "";
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 10 && n <= 19) {
      str += teens[n - 10] + " ";
    } else if (n >= 20 || n > 0) {
      str += tens[Math.floor(n / 10)] + " ";
      str += ones[n % 10] + " ";
    }
    return str.trim();
  }
}

function numberToWords(num, language = "en") {
  if (num === 0) return language === "ur" ? "صفر" : "Zero";

  const isUrdu = language === "ur";
  const scales = isUrdu ? ["", "ہزار", "لاکھ", "کروڑ"] : ["", "Thousand", "Lakh", "Crore"];

  let words = "";
  // Handle decimals
  let integerPart = Math.floor(num);
  let decimalPart = Math.round((num - integerPart) * 100);

  if (integerPart === 0) {
    words = isUrdu ? "صفر" : "Zero";
  } else {
    let i = 0;
    while (integerPart > 0) {
      let divisor = i === 0 ? 1000 : 100; // First chunk is 1000, subsequent chunks are 100 (for Lakh, Crore system)
      let chunk = integerPart % divisor;
      if (chunk !== 0) {
        let chunkWords = convertBelowThousand(chunk, language);
        words = chunkWords + " " + scales[i] + " " + words;
      }
      integerPart = Math.floor(integerPart / divisor);
      i++;
    }
  }

  words = words.trim();

  if (decimalPart > 0) {
    if (isUrdu) {
      words += " اعشاریہ " + urdu1to99[decimalPart];
    } else {
      words += " and " + convertBelowThousand(decimalPart, "en") + " Paise";
    }
  }

  // Remove multiple spaces
  words = words.replace(/\s+/g, " ");

  if (isUrdu) {
    return words + " روپے صرف";
  } else {
    return words + " Rupees Only";
  }
}

module.exports = numberToWords;
