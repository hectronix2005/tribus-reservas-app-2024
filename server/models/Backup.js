const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['full', 'incremental', 'pre-delete', 'periodic', 'manual'],
    required: true
  },
  timestamp: { type: Date, default: Date.now },
  collections: { type: mongoose.Schema.Types.Mixed, default: {} },
  metadata: {
    collectionsCount: { type: Number, default: 0 },
    totalRecords: { type: Number, default: 0 },
    sizeBytes: { type: Number, default: 0 },
    trigger: { type: String, default: 'manual' }, // manual, periodic, pre-delete, pre-update
    userId: { type: String, default: 'system' }
  }
});

// Indice para buscar por fecha y tipo
backupSchema.index({ timestamp: -1 });
backupSchema.index({ type: 1, timestamp: -1 });

module.exports = mongoose.model('Backup', backupSchema);
