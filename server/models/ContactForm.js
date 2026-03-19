const mongoose = require('mongoose');

const contactFormSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  countryCode: { type: String, default: '+57' },
  company: { type: String, trim: true },
  message: { type: String, required: true },
  interestedIn: {
    type: String,
    enum: ['hot_desk', 'sala_reunion', 'oficina_privada', 'otro'],
    default: 'otro'
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'in_progress', 'completed', 'archived'],
    default: 'new'
  },
  notes: { type: String },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changeHistory: [{
    changedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      userName: String,
      userEmail: String
    },
    changedAt: { type: Date, default: Date.now },
    changes: {
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed
    },
    action: String
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ContactForm', contactFormSchema);
