const backupSystem = require('../utils/backupSystem');

/**
 * Middleware para crear backups automáticos antes de operaciones críticas
 */

/**
 * Middleware que crea un backup antes de operaciones DELETE
 */
async function backupBeforeDelete(req, res, next) {
  try {
    console.log('🔒 Creando backup de seguridad antes de DELETE...');

    await backupSystem.backupReservations();

    // Registrar en auditoría
    await backupSystem.logAudit('PRE_DELETE_BACKUP', {
      method: req.method,
      url: req.url,
      userId: req.user?._id || 'anonymous',
      ip: req.ip
    });

    next();
  } catch (error) {
    console.error('❌ Error creando backup de seguridad:', error);
    // Continuar con la operación pero loguear el error
    next();
  }
}

/**
 * Middleware que crea un backup antes de operaciones UPDATE masivas
 */
async function backupBeforeMassUpdate(req, res, next) {
  try {
    // Solo hacer backup si es una actualización masiva
    if (req.body.bulk || req.query.updateMany) {
      console.log('🔒 Creando backup de seguridad antes de UPDATE masivo...');

      await backupSystem.backupReservations();

      await backupSystem.logAudit('PRE_MASS_UPDATE_BACKUP', {
        method: req.method,
        url: req.url,
        userId: req.user?._id || 'anonymous',
        updateCount: req.body.ids?.length || 'unknown'
      });
    }

    next();
  } catch (error) {
    console.error('❌ Error creando backup de seguridad:', error);
    next();
  }
}

/**
 * Middleware para registrar todas las operaciones en auditoría
 */
async function auditLog(req, res, next) {
  // Solo loguear operaciones que modifican datos
  const methodsToLog = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (methodsToLog.includes(req.method)) {
    try {
      await backupSystem.logAudit(`${req.method}_${req.path}`, {
        method: req.method,
        path: req.path,
        userId: req.user?._id || 'anonymous',
        userEmail: req.user?.email,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        body: req.method === 'DELETE' ? undefined : req.body
      });
    } catch (error) {
      console.error('⚠️  Error registrando en auditoría:', error);
    }
  }

  next();
}

/**
 * Middleware para backup automático periódico
 */
function setupPeriodicBackup(intervalMinutes = 30) {
  let lastBackup = Date.now();

  return async (req, res, next) => {
    const now = Date.now();
    const timeSinceLastBackup = (now - lastBackup) / 1000 / 60; // en minutos

    if (timeSinceLastBackup >= intervalMinutes) {
      // Ejecutar backup en background
      backupSystem.backupReservations()
        .then(() => {
          console.log(`✅ Backup periódico completado (cada ${intervalMinutes} min)`);
          lastBackup = now;
        })
        .catch(err => {
          console.error('❌ Error en backup periódico:', err);
        });
    }

    next();
  };
}

module.exports = {
  backupBeforeDelete,
  backupBeforeMassUpdate,
  auditLog,
  setupPeriodicBackup
};
