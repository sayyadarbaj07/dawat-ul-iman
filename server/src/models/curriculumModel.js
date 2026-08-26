const mongoose = require("mongoose");

const curriculumSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      required: true,
      enum: ["diniyat", "arabic", "contemporary"],
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    book: {
      type: String,
      required: true,
      trim: true,
    },
    progress: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      required: true,
      enum: ["On Track", "Delayed", "Almost Complete"],
      default: "On Track",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Curriculum", curriculumSchema);
