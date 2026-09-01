export const CLASS_TREE = {
  "Shob-e-Deeniyat": ["Awwal", "Duwwam", "Ibtedai", "Other"],
  "Shob-e-Hifz": ["Alif", "Ba", "Other"],
  "Shob-e-Alimiyat": [
    "Awwal",
    "Doem",
    "Soem",
    "Chaharum",
    "Panjum",
    "Shashum",
    "Haftum",
    "Hashtum",
    "Nohum",
    "Dahum",
    "Dowrah"
  ]
};

// Helper to get flat list of all valid class strings (e.g., "Shob-e-Deeniyat - Awwal")
export const getAllClassesFlat = () => {
  const flat = [];
  Object.keys(CLASS_TREE).forEach(dept => {
    CLASS_TREE[dept].forEach(cls => {
      flat.push(`${dept} - ${cls}`);
    });
  });
  return flat;
};
