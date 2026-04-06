const backupSystem = require('../utils/backupSystem');

/**
 * Middleware que crea backup ligero antes de operaciones DELETE en reservaciones/usuarios
 */
async function backupBeforeDelete(req, res, next) {
  if (req.method === 'DELETE') {
    try {
      await backupSystem.createLightBackup('pre-delete', req.user?.userId || 'anonymous');
    } catch (err) {
      console.error('⚠️ Error creando backup pre-delete:', err.message);
    }
  }
  next();
}

/**
 * Middleware que ejecuta backup periodico cada hora (en background, no bloquea requests)
 */
function periodicBackup(req, res, next) {
  // Ejecutar en background sin bloquear el request
  backupSystem.periodicBackupIfNeeded().catch(err => {
    console.error('⚠️ Error en backup periodico:', err.message);
  });
  next();
}

module.exports = {
  backupBeforeDelete,
  periodicBackup
};
