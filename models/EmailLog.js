const mongoose = require('mongoose');

/**
 * Modelo de auditoría para todos los emails enviados
 * Esto nos permite rastrear exactamente a quién se envían los emails
 */
const emailLogSchema = new mongoose.Schema({
  // Información del email
  emailType: {
    type: String,
    required: true,
    enum: ['reservation_confirmation', 'reservation_cancellation', 'contact_form', 'password_reset', 'other']
  },
  subject: {
    type: String,
    required: true
  },

  // Destinatarios
  to: [{
    type: String,
    required: true
  }],
  bcc: [{
    type: String
  }],

  // Información de la reserva (si aplica)
  reservationId: {
    type: String,
    index: true
  },
  reservationInternalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation'
  },

  // Información del creador
  creatorUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  creatorEmail: {
    type: String
  },

  // Colaboradores que DEBERÍAN recibir el email
  expectedCollaborators: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    email: String,
    name: String
  }],

  // Estado del envío
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'pending'
  },
  messageId: {
    type: String // ID del mensaje de Nodemailer
  },
  error: {
    type: String
  },

  // Metadatos de auditoría
  sentAt: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },

  // Información de validación
  validation: {
    allRecipientsValid: {
      type: Boolean,
      default: true
    },
    invalidEmails: [{
      type: String
    }],
    warnings: [{
      type: String
    }]
  }
}, {
  timestamps: true
});

// Índices para búsquedas rápidas
emailLogSchema.index({ reservationId: 1, sentAt: -1 });
emailLogSchema.index({ creatorEmail: 1, sentAt: -1 });
emailLogSchema.index({ emailType: 1, sentAt: -1 });
emailLogSchema.index({ 'to': 1, sentAt: -1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
