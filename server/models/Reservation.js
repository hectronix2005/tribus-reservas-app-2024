const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  reservationId: { type: String, unique: true, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  createdBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    userRole: {
      type: String,
      enum: ['superadmin', 'admin', 'lider', 'colaborador'],
      required: true
    }
  },
  area: { type: String, required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  teamName: { type: String, required: true },
  requestedSeats: { type: Number, required: true, default: 1 },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'],
    default: 'confirmed'
  },
  notes: { type: String, default: '' },
  colaboradores: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  attendees: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  debug: { type: mongoose.Schema.Types.Mixed, default: null }
});

// Middleware para actualizar automáticamente el estado de las reservaciones
reservationSchema.pre('save', function(next) {
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

  const reservationDate = this.date.toISOString().split('T')[0];
  const reservationStartTime = this.startTime;
  const reservationEndTime = this.endTime;

  if (reservationDate === today) {
    if (currentTime >= reservationStartTime && currentTime <= reservationEndTime) {
      this.status = 'active';
    } else if (currentTime > reservationEndTime) {
      this.status = 'completed';
    } else {
      this.status = 'confirmed';
    }
  } else if (reservationDate < today) {
    this.status = 'completed';
  } else {
    this.status = 'confirmed';
  }

  this.updatedAt = now;
  next();
});

module.exports = mongoose.model('Reservation', reservationSchema);
