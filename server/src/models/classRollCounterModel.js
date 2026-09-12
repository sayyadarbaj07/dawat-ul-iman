const mongoose = require("mongoose");

const classRollCounterSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      unique: true
    },
    lastRollNumber: {
      type: Number,
      required: true,
      default: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClassRollCounter", classRollCounterSchema);
