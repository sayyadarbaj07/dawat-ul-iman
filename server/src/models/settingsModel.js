const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    instituteName: {
      type: String,
      required: true,
      trim: true,
      default: "Dawat ul Iman",
    },
    instituteNameUrdu: {
      type: String,
      trim: true,
      default: "جامعہ دعوۃ الایمان",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    contactPhone: {
      type: String,
      trim: true,
      default: "",
    },
    contactEmail: {
      type: String,
      trim: true,
      default: "",
    },
    logoUrl: {
      type: String,
      trim: true,
      default: "/logo1.jpeg",
    },
    academicYear: {
      type: String,
      trim: true,
      default: "2026-2027",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
