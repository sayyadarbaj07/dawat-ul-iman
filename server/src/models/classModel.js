const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      required: true,
      enum: ["diniyat", "hifz", "alimiyat", "qirat", "contemporary", "arabic", "school"],
    },
    name: {
      type: String,
      required: true,
      trim: true,
      set: (v) => v.toLowerCase(),
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    section: {
      type: String,
      trim: true,
      default: "",
      set: (v) => v.toLowerCase(),
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Indexes for integrity and uniqueness
classSchema.index(
  { fullName: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);
classSchema.index({ department: 1, name: 1, section: 1 }, { unique: true });

module.exports = mongoose.model("Class", classSchema);
