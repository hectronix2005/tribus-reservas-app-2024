const mongoose = require('mongoose');

/**
 * Modelo para tokens de recuperación de contraseña
 * Los tokens expiran después de 30 minutos
 */
const passwordResetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    // Por defecto expira en 30 minutos
    default: () => new Date(Date.now() + 30 * 60 * 1000)
  },
  used: {
    type: Boolean,
    default: false
  },
  usedAt: {
    type: Date
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índices para búsquedas rápidas y limpieza automática
passwordResetSchema.index({ token: 1 });
passwordResetSchema.index({ email: 1, createdAt: -1 });
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete después de expirar

// Método para verificar si el token es válido
passwordResetSchema.methods.isValid = function() {
  return !this.used && this.expiresAt > new Date();
};

// Método para marcar el token como usado
passwordResetSchema.methods.markAsUsed = async function() {
  this.used = true;
  this.usedAt = new Date();
  return await this.save();
};

module.exports = mongoose.model('PasswordReset', passwordResetSchema);
