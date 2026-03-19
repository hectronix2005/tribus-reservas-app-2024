const mongoose = require('mongoose');

const areaSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  capacity: { type: Number, required: true },
  description: { type: String },
  color: { type: String, required: true },
  category: {
    type: String,
    enum: ['SALA', 'HOT_DESK'],
    required: true
  },
  minReservationTime: { type: Number, default: 30 },
  maxReservationTime: { type: Number, default: 480 },
  officeHours: {
    start: { type: String, default: '08:00' },
    end: { type: String, default: '18:00' }
  },
  isMeetingRoom: { type: Boolean, default: false },
  isFullDayReservation: { type: Boolean, default: false }
});

module.exports = mongoose.model('Area', areaSchema);
