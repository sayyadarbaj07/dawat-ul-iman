/**
 * transliteration.js
 *
 * Provides bidirectional and phonetically accurate Urdu/Arabic <-> English (Roman)
 * transliteration and localization for students, teachers, classes, and subjects.
 */

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

// Known full phrases or compound names
const COMPOUND_MAP = {
  "عبد الرحمن": "Abdur Rahman",
  "عبدالرحمن": "Abdur Rahman",
  "عبد الرحیم": "Abdur Rahim",
  "عبدالرحیم": "Abdur Rahim",
  "عبد العزیز": "Abdul Aziz",
  "عبدالعزیز": "Abdul Aziz",
  "عبد الجلیل": "Abdul Jalil",
  "عبدالجلیل": "Abdul Jalil",
  "عبد الاحد": "Abdul Ahad",
  "عبدالاحد": "Abdul Ahad",
  "عبد اللہ": "Abdullah",
  "عبداللہ": "Abdullah",
  "عبد الرشید": "Abdur Rasheed",
  "عبدالرشید": "Abdur Rasheed",
  "عبد الکریم": "Abdul Kareem",
  "عبدالکریم": "Abdul Kareem",
  "عبد الماجد": "Abdul Majid",
  "عبدالماجد": "Abdul Majid",
  "عبد الرزاق": "Abdur Razzaq",
  "عبدالرزاق": "Abdur Razzaq",
  "عبد القادر": "Abdul Qadir",
  "عبدالقادر": "Abdul Qadir",
  "غلام معبود": "Ghulam Mabood",
  "غلام رسول": "Ghulam Rasool",
  "غلام مصطفیٰ": "Ghulam Mustafa",
  "سمیع الدین": "Samiuddin",
  "نظام الدین": "Nizamuddin",
  "ضیاء الدین": "Ziauddin",
  "شمس الدین": "Shamsuddin",
  "نور الدین": "Nooruddin",
  "امجدپٹھان": "Amjad Pathan",
  "ابوذر": "Abu Zarr",
  "ابو ذر": "Abu Zarr",
  "ابو القاسم": "Abul Qasim",
  "ابوالقاسم": "Abul Qasim",
  "حافظ سفیان": "Hafiz Sufiyan",
  "حافظ بلال": "Hafiz Bilal",
  "حافظ ضمیر": "Hafiz Zameer",
};

// Word-level mapping for common Islamic / Urdu names and words
const WORD_MAP = {
  // Titles & Honorifics
  "شیخ": "Shaikh",
  "سید": "Syed",
  "قاضی": "Qazi",
  "خان": "Khan",
  "پٹھان": "Pathan",
  "بیگ": "Baig",
  "حافظ": "Hafiz",
  "مولانا": "Maulana",
  "مفتی": "Mufti",
  "صاحب": "Sahab",
  "ابن": "Ibn",
  "بنت": "Binte",
  "ولد": "s/o",
  "مع": "with",
  "علی": "Ali",

  // Given Names
  "محمد": "Mohammad",
  "احمد": "Ahmad",
  "سیف": "Saif",
  "رضاء": "Raza",
  "رضا": "Raza",
  "الیاس": "Ilyas",
  "نعمان": "Noman",
  "یونس": "Yunus",
  "شاہد": "Shahid",
  "فیاض": "Fayyaz",
  "کیف": "Kaif",
  "اکبر": "Akbar",
  "زبیر": "Zubair",
  "ضمیر": "Zameer",
  "ریحان": "Rehan",
  "شکیل": "Shakeel",
  "ارشد": "Arshad",
  "توصیف": "Tauseef",
  "شعیب": "Shoaib",
  "ایاز": "Ayaz",
  "جعفر": "Jafar",
  "سعید": "Saeed",
  "عزیر": "Uzair",
  "اویس": "Owais",
  "عامر": "Aamir",
  "مزمل": "Muzammil",
  "خورشید": "Khurshid",
  "فیصل": "Faisal",
  "فضل": "Fazal",
  "دانش": "Danish",
  "سلیم": "Saleem",
  "عفan": "Affan",
  "عفان": "Affan",
  "ذاکر": "Zakir",
  "اطہر": "Athar",
  "حمزہ": "Hamza",
  "حنظلہ": "Hanzala",
  "عمر": "Umar",
  "وہاج": "Wahhaj",
  "حارث": "Haris",
  "انس": "Anas",
  "رئیس": "Raees",
  "رفیق": "Rafiq",
  "ذیشان": "Zeeshan",
  "جاوید": "Javed",
  "بلال": "Bilal",
  "عقیل": "Aqeel",
  "زید": "Zaid",
  "اظہر": "Azhar",
  "سفیان": "Sufiyan",
  "گلاب": "Gulab",
  "رسول": "Rasool",
  "یاسر": "Yasir",
  "محسن": "Mohsin",
  "زکریا": "Zakariya",
  "کلیم": "Kaleem",
  "بشیر": "Basheer",
  "سعد": "Saad",
  "ایوب": "Ayyub",
  "نظیر": "Nazeer",
  "نذیر": "Nazeer",
  "مستقیم": "Mustaqeem",
  "عثمان": "Usman",
  "عمران": "Imran",
  "فیروز": "Firoz",
  "ریان": "Rayan",
  "فیضان": "Faizan",
  "حذیف": "Huzaif",
  "حذیفہ": "Huzaifa",
  "عابد": "Aabid",
  "اسلم": "Aslam",
  "آصف": "Asif",
  "مجاہد": "Mujahid",
  "عرفات": "Arafat",
  "خلیل": "Khaleel",
  "ارحم": "Arham",
  "سہیل": "Sohail",
  "حسین": "Husain",
  "حسن": "Hasan",
  "امجد": "Amjad",
  "چاند": "Chand",
  "مظہر": "Mazhar",
  "ارمان": "Arman",
  "شفیق": "Shafeeq",
  "توفیق": "Taufiq",
  "جبار": "Jabbar",
  "افسر": "Afsar",
  "یوسف": "Yusuf",
  "شہباز": "Shahbaz",
  "عدنان": "Adnan",
  "عمیر": "Umair",
  "طیب": "Tayyab",
  "طاہر": "Tahir",
  "قاسم": "Qasim",
  "گلجوی": "Guljavi",
  "رحمانی": "Rahmani",
  "ملی": "Milli",
  "مظاہری": "Mazahiri",
  "قریشی": "Qureshi",
  "ندیم": "Nadeem",
  "قاسمی": "Qasmi",
  "منصور": "Mansoor",
  "مسعود": "Masood",
  "تنویر": "Tanveer",
  "انور": "Anwar",
  "اقبال": "Iqbal",
  "اصغر": "Asghar",
  "اعجاز": "Ejaz",
  "الطاف": "Altaf",
  "اشرف": "Ashraf",
  "اکرم": "Akram",
  "مقصود": "Maqsood",
  "محمود": "Mahmood",
  "سراج": "Siraj",
  "مشتاق": "Mushtaq",
  "مشرف": "Musharraf",
  "مبارک": "Mubarak",
  "وسیم": "Waseem",
  "وقار": "Waqar",
  "وحید": "Waheed",
  "شاہد": "Shahid",
  "ساجد": "Sajid",
  "ماجد": "Majid",
  "عارف": "Aarif",
  "عاصم": "Aasim",
  "طارق": "Tariq",
  "زبیر": "Zubair",
  "ظفر": "Zafar",
  "جمال": "Jamal",
  "کمال": "Kamal",
  "جلال": "Jalal",
  "بلال": "Bilal",
  "ہاشم": "Hashim",
  "حامد": "Hamid",
  "حمید": "Hameed",
  "رشید": "Rasheed",
  "بشیر": "Basheer",
  "نذیر": "Nazeer",
  "منیر": "Muneer",
  "نصیر": "Naseer",
  "قدیر": "Qadeer",
  "لطیف": "Lateef",
  "حبیب": "Habeeb",
  "شفیع": "Shafi",
  "رفیع": "Rafi",
  "مطیع": "Muti",
  "وجیہ": "Wajih",
  "شبیہ": "Shabih",
  "فہیم": "Faheem",
  "نعیم": "Naeem",
  "عظیم": "Azeem",
  "علیم": "Aleem",
  "حکیم": "Hakeem",
  "کریم": "Kareem",
  "رحیم": "Raheem",
};

// Class mapping between Urdu and English
const CLASS_MAP = {
  "زیرو": { en: "Nursery / Prep", ur: "زیرو" },
  "دینیات اول": { en: "Diniyat 1", ur: "دینیات اول" },
  "دینیات اول ب": { en: "Diniyat 1 (B)", ur: "دینیات اول ب" },
  "دینیات دوم": { en: "Diniyat 2", ur: "دینیات دوم" },
  "دینیات سوم": { en: "Diniyat 3", ur: "دینیات سوم" },
  "دینیات چہارم": { en: "Diniyat 4", ur: "دینیات چہارم" },
  "ابتدائی عربی": { en: "Primary Arabic", ur: "ابتدائی عربی" },
  "عربی اول": { en: "Arabic 1", ur: "عربی اول" },
  "عربی دوم": { en: "Arabic 2", ur: "عربی دوم" },
  "عربی سوم": { en: "Arabic 3", ur: "عربی سوم" },
  "عربی چہارم": { en: "Arabic 4", ur: "عربی چہارم" },
  "عربی پنجم": { en: "Arabic 5", ur: "عربی پنجم" },
  "حفظ": { en: "Hifz", ur: "حفظ" },
  "حفظ القرآن": { en: "Hifz-ul-Quran", ur: "حفظ القرآن" },
  "تجوید": { en: "Tajweed", ur: "تجوید" },
  "قراءت": { en: "Qirat", ur: "قراءت" },
  "عالمیت": { en: "Alimiyat", ur: "عالمیت" },
  "فضیلت": { en: "Fazeelat", ur: "فضیلت" },
  "عصری": { en: "Contemporary", ur: "عصری" },
  "اسکول": { en: "School", ur: "اسکول" },
  "عصری اول": { en: "Contemporary 1", ur: "عصری اول" },
  "عصری دوم": { en: "Contemporary 2", ur: "عصری دوم" },
  "عصری سوم": { en: "Contemporary 3", ur: "عصری سوم" },
  "عصری چہارم": { en: "Contemporary 4", ur: "عصری چہارم" },
  "عصری پنجم": { en: "Contemporary 5", ur: "عصری پنجم" },
  "دسویں": { en: "10th (Matric)", ur: "دسویں" },
  // English names mapping to Urdu
  "arabic 1": { en: "Arabic 1", ur: "عربی اول" },
  "arabic 2": { en: "Arabic 2", ur: "عربی دوم" },
  "arabic 3": { en: "Arabic 3", ur: "عربی سوم" },
  "arabic 4": { en: "Arabic 4", ur: "عربی چہارم" },
  "arabic 5": { en: "Arabic 5", ur: "عربی پنجم" },
  "diniyat 1": { en: "Diniyat 1", ur: "دینیات اول" },
  "diniyat 2": { en: "Diniyat 2", ur: "دینیات دوم" },
  "diniyat 3": { en: "Diniyat 3", ur: "دینیات سوم" },
  "diniyat 4": { en: "Diniyat 4", ur: "دینیات چہارم" },
  "primary arabic": { en: "Primary Arabic", ur: "ابتدائی عربی" },
  "hifz": { en: "Hifz", ur: "حفظ" },
  "alimiyat": { en: "Alimiyat", ur: "عالمیت" },
  "contemporary 1": { en: "Contemporary 1", ur: "عصری اول" },
  "contemporary 2": { en: "Contemporary 2", ur: "عصری دوم" },
  "contemporary 3": { en: "Contemporary 3", ur: "عصری سوم" },
  "10th": { en: "10th (Matric)", ur: "دسویں" },
};

// Character-by-character phonetic transliteration fallback
const CHAR_MAP = {
  "ا": "A", "آ": "Aa", "ب": "b", "پ": "p", "ت": "t", "ٹ": "t", "ث": "s",
  "ج": "j", "چ": "ch", "ح": "h", "خ": "kh", "د": "d", "ڈ": "d", "ذ": "z",
  "ر": "r", "ڑ": "r", "ز": "z", "ژ": "zh", "س": "s", "ش": "sh", "ص": "s",
  "ض": "z", "ط": "t", "ظ": "z", "ع": "a", "غ": "gh", "ف": "f", "ق": "q",
  "ک": "k", "گ": "g", "ل": "l", "م": "m", "ن": "n", "ں": "n", "و": "o",
  "ہ": "h", "ھ": "h", "ء": "'", "ی": "i", "ے": "e", "ۃ": "t", "ۂ": "h",
  "ئ": "y", "ؤ": "o", "لا": "La",
};

/**
 * Transliterates an Urdu string into clean English (Latin) script.
 */
function transliterateUrduToEnglish(text) {
  if (!text) return "";
  let s = String(text).trim();
  if (!ARABIC_RE.test(s)) return s;

  // Direct class match
  if (CLASS_MAP[s]) return CLASS_MAP[s].en;

  // Check compound map
  for (const [urdu, en] of Object.entries(COMPOUND_MAP)) {
    if (s.includes(urdu)) {
      s = s.split(urdu).join(`__CP_${en}_CP__`);
    }
  }

  // Tokenize by spaces and punctuation
  const tokens = s.split(/\s+/);
  const result = tokens.map((token) => {
    if (token.startsWith("__CP_") && token.endsWith("_CP__")) {
      return token.replace("__CP_", "").replace("_CP__", "");
    }

    // Direct word match
    if (WORD_MAP[token]) {
      return WORD_MAP[token];
    }

    // Check without trailing / leading punctuation
    const cleanWord = token.replace(/[^\u0600-\u06FF]/g, "");
    if (WORD_MAP[cleanWord]) {
      return WORD_MAP[cleanWord];
    }

    // Character fallback
    let out = "";
    for (let i = 0; i < token.length; i++) {
      const ch = token[i];
      if (CHAR_MAP[ch]) {
        out += CHAR_MAP[ch];
      } else {
        out += ch;
      }
    }
    // Capitalize first letter
    return out.charAt(0).toUpperCase() + out.slice(1);
  });

  return result
    .join(" ")
    .replace(/__CP_([^_]+)_CP__/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolves student name based on language ("en" vs "ur").
 */
function getLocalizedStudentName(student, language = "en") {
  if (!student) return "";
  const isUrdu = language === "ur";

  if (isUrdu) {
    if (student.nameUrdu && ARABIC_RE.test(student.nameUrdu)) {
      return student.nameUrdu;
    }
    if (student.name && ARABIC_RE.test(student.name)) {
      return student.name;
    }
    if (student.fullName && ARABIC_RE.test(student.fullName)) {
      return student.fullName;
    }
    // Fallback to whatever name exists
    return student.nameUrdu || student.name || student.fullName || "";
  }

  // English mode
  // If student has an English name (does not contain Arabic chars), use it
  if (student.name && !ARABIC_RE.test(student.name)) {
    return student.name;
  }
  if (student.fullName && !ARABIC_RE.test(student.fullName)) {
    return student.fullName;
  }
  // Otherwise, transliterate the Urdu name
  const urduSource = student.nameUrdu || student.name || student.fullName || "";
  return transliterateUrduToEnglish(urduSource);
}

/**
 * Resolves father name based on language ("en" vs "ur").
 */
function getLocalizedFatherName(student, language = "en") {
  if (!student) return "";
  const isUrdu = language === "ur";

  if (isUrdu) {
    if (student.fatherNameUrdu && ARABIC_RE.test(student.fatherNameUrdu)) {
      return student.fatherNameUrdu;
    }
    return student.fatherName || "";
  }

  // English mode
  if (student.fatherName && !ARABIC_RE.test(student.fatherName)) {
    return student.fatherName;
  }
  return transliterateUrduToEnglish(student.fatherName || student.fatherNameUrdu || "");
}

/**
 * Resolves class name based on language ("en" vs "ur").
 */
function getLocalizedClassName(classObjOrStr, language = "en") {
  if (!classObjOrStr) return "";
  const isUrdu = language === "ur";

  let raw = "";
  if (typeof classObjOrStr === "string") {
    raw = classObjOrStr;
  } else if (classObjOrStr && typeof classObjOrStr === "object") {
    raw = classObjOrStr.fullName || classObjOrStr.name || classObjOrStr.studentClass || classObjOrStr.className || "";
  }

  raw = String(raw).trim();
  if (CLASS_MAP[raw]) {
    return isUrdu ? CLASS_MAP[raw].ur : CLASS_MAP[raw].en;
  }

  // Case-insensitive lookup in CLASS_MAP
  const lower = raw.toLowerCase();
  for (const [k, v] of Object.entries(CLASS_MAP)) {
    if (k.toLowerCase() === lower) {
      return isUrdu ? v.ur : v.en;
    }
  }

  // If already English and language is English, keep it
  if (!isUrdu && !ARABIC_RE.test(raw)) {
    // capitalize
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  // If in Urdu and we need English, transliterate
  if (!isUrdu && ARABIC_RE.test(raw)) {
    return transliterateUrduToEnglish(raw);
  }

  return raw;
}

/**
 * Resolves teacher name based on language ("en" vs "ur").
 */
function getLocalizedTeacherName(teacher, language = "en") {
  if (!teacher) return "";
  const isUrdu = language === "ur";

  if (isUrdu) {
    if (teacher.nameUrdu && ARABIC_RE.test(teacher.nameUrdu)) return teacher.nameUrdu;
    if (teacher.name && ARABIC_RE.test(teacher.name)) return teacher.name;
    return teacher.nameUrdu || teacher.name || "";
  }

  if (teacher.name && !ARABIC_RE.test(teacher.name)) return teacher.name;
  return transliterateUrduToEnglish(teacher.nameUrdu || teacher.name || "");
}

module.exports = {
  transliterateUrduToEnglish,
  getLocalizedStudentName,
  getLocalizedFatherName,
  getLocalizedClassName,
  getLocalizedTeacherName,
  CLASS_MAP,
  ARABIC_RE,
};
