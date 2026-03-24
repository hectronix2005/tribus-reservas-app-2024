const mongoose = require('mongoose');

const AttendanceReportSchema = new mongoose.Schema({
  filename:       { type: String, required: true },
  period:         { type: String, required: true },
  uploadedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedByName: { type: String, default: '' },
  uploadedAt:     { type: Date, default: Date.now },
  employeeCount:  { type: Number, default: 0 },
  dateColumns:    [String],
  results:        [mongoose.Schema.Types.Mixed],
  summary:        [mongoose.Schema.Types.Mixed],
});

module.exports = mongoose.model('AttendanceReport', AttendanceReportSchema);
