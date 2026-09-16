const mongoose = require('mongoose');

const admissionCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // 'global'
  lastAdmissionNumber: { type: Number, default: 0 }
});

module.exports = mongoose.model('AdmissionCounter', admissionCounterSchema);
