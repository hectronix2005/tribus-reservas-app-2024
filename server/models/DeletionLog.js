const mongoose = require('mongoose');

const deletionLogSchema = new mongoose.Schema({
  reservationId: { type: String, required: true },
  reservationData: {
    area: String,
    date: Date,
    startTime: String,
    endTime: String,
    teamName: String,
    requestedSeats: Number,
    status: String,
    createdBy: String,
    createdAt: Date,
    colaboradores: [String],
    attendees: [String]
  },
  deletedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: String,
    name: String,
    email: String,
    role: String
  },
  deletedAt: { type: Date, default: Date.now, required: true },
  deletionType: { type: String, enum: ['single', 'bulk'], default: 'single' },
  reason: { type: String, default: '' }
});

module.exports = mongoose.model('DeletionLog', deletionLogSchema);
