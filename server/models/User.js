const mongoose = require('mongoose');

const PASSWORD_MAX_AGE_DAYS = 180; // 6 meses

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  cedula: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true, unique: true },
  role: { type: String, enum: ['superadmin', 'admin', 'lider', 'colaborador'], default: 'lider' },
  department: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  passwordChangedAt: { type: Date, default: Date.now },
  mustChangePassword: { type: Boolean, default: false },
  passwordHistory: [{ hash: String, changedAt: Date }],
  createdAt: { type: Date, default: Date.now }
});

// Verifica si la contraseña esta expirada (>6 meses)
userSchema.methods.isPasswordExpired = function () {
  const changedAt = this.passwordChangedAt || this.createdAt;
  const ageMs = Date.now() - new Date(changedAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays > PASSWORD_MAX_AGE_DAYS;
};

// Dias restantes antes de que expire
userSchema.methods.passwordDaysRemaining = function () {
  const changedAt = this.passwordChangedAt || this.createdAt;
  const ageMs = Date.now() - new Date(changedAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(PASSWORD_MAX_AGE_DAYS - ageDays));
};

userSchema.statics.PASSWORD_MAX_AGE_DAYS = PASSWORD_MAX_AGE_DAYS;

module.exports = mongoose.model('User', userSchema);
