const mongoose = require('mongoose');
const Backup = require('../server/models/Backup');

/**
 * Sistema de Backup persistente en MongoDB
 * Los backups se almacenan en la coleccion 'backups' para sobrevivir deploys en Heroku
 */

const MAX_BACKUPS = 30;

// Colecciones a respaldar
const COLLECTIONS_TO_BACKUP = [
  'users', 'reservations', 'areas', 'departments',
  'adminsettings', 'attendancereports', 'coworkingsettings',
  'blogposts', 'contactforms', 'messages', 'emaillogs',
  'deletionlogs', 'passwordresets'
];

/**
 * Crea un backup completo de todas las colecciones
 */
async function createFullBackup(trigger = 'manual', userId = 'system') {
  const db = mongoose.connection.db;
  const collections = {};
  let totalRecords = 0;

  for (const name of COLLECTIONS_TO_BACKUP) {
    try {
      const docs = await db.collection(name).find({}).toArray();
      collections[name] = docs;
      totalRecords += docs.length;
    } catch (err) {
      // Coleccion puede no existir, continuar
      console.warn(`⚠️ Backup: coleccion '${name}' no accesible:`, err.message);
    }
  }

  const backup = await Backup.create({
    type: 'full',
    collections,
    metadata: {
      collectionsCount: Object.keys(collections).length,
      totalRecords,
      sizeBytes: JSON.stringify(collections).length,
      trigger,
      userId
    }
  });

  console.log(`✅ Backup completo creado: ${Object.keys(collections).length} colecciones, ${totalRecords} registros`);
  await cleanOldBackups();

  return {
    id: backup._id,
    timestamp: backup.timestamp,
    collections: Object.keys(collections).length,
    totalRecords
  };
}

/**
 * Crea un backup solo de usuarios y reservaciones (mas ligero, para operaciones frecuentes)
 */
async function createLightBackup(trigger = 'periodic', userId = 'system') {
  const db = mongoose.connection.db;
  const collections = {};
  let totalRecords = 0;

  for (const name of ['users', 'reservations']) {
    try {
      const docs = await db.collection(name).find({}).toArray();
      collections[name] = docs;
      totalRecords += docs.length;
    } catch (err) {
      console.warn(`⚠️ Backup ligero: coleccion '${name}' no accesible:`, err.message);
    }
  }

  const backup = await Backup.create({
    type: trigger === 'periodic' ? 'periodic' : 'pre-delete',
    collections,
    metadata: {
      collectionsCount: Object.keys(collections).length,
      totalRecords,
      sizeBytes: JSON.stringify(collections).length,
      trigger,
      userId
    }
  });

  console.log(`✅ Backup ligero creado: ${totalRecords} registros (users + reservations)`);
  return {
    id: backup._id,
    timestamp: backup.timestamp,
    totalRecords
  };
}

/**
 * Lista backups disponibles (sin incluir los datos, solo metadata)
 */
async function listBackups() {
  const backups = await Backup.find({})
    .select('type timestamp metadata')
    .sort({ timestamp: -1 })
    .limit(50)
    .lean();

  return backups.map(b => ({
    id: b._id,
    type: b.type,
    timestamp: b.timestamp,
    collections: b.metadata.collectionsCount,
    totalRecords: b.metadata.totalRecords,
    sizeKB: Math.round(b.metadata.sizeBytes / 1024),
    trigger: b.metadata.trigger,
    userId: b.metadata.userId
  }));
}

/**
 * Restaura datos desde un backup especifico
 */
async function restoreFromBackup(backupId) {
  const backup = await Backup.findById(backupId);
  if (!backup) {
    throw new Error(`Backup ${backupId} no encontrado`);
  }

  // Crear backup de seguridad antes de restaurar
  console.log('🔒 Creando backup de seguridad antes de restaurar...');
  await createFullBackup('pre-restore', 'system');

  const db = mongoose.connection.db;
  let restoredCollections = 0;
  let restoredRecords = 0;

  for (const [name, documents] of Object.entries(backup.collections)) {
    if (!documents || documents.length === 0) continue;
    // No restaurar la coleccion de backups misma
    if (name === 'backups') continue;

    try {
      const collection = db.collection(name);
      await collection.deleteMany({});
      await collection.insertMany(documents);
      restoredCollections++;
      restoredRecords += documents.length;
      console.log(`  ✅ ${name}: ${documents.length} documentos restaurados`);
    } catch (err) {
      console.error(`  ❌ Error restaurando ${name}:`, err.message);
    }
  }

  console.log(`✅ Restauracion completada: ${restoredCollections} colecciones, ${restoredRecords} registros`);

  return {
    backupTimestamp: backup.timestamp,
    collectionsRestored: restoredCollections,
    recordsRestored: restoredRecords
  };
}

/**
 * Elimina backups antiguos, mantiene los ultimos MAX_BACKUPS
 */
async function cleanOldBackups() {
  const count = await Backup.countDocuments();
  if (count <= MAX_BACKUPS) return;

  const toKeep = await Backup.find()
    .sort({ timestamp: -1 })
    .limit(MAX_BACKUPS)
    .select('_id')
    .lean();

  const keepIds = toKeep.map(b => b._id);

  const result = await Backup.deleteMany({ _id: { $nin: keepIds } });
  if (result.deletedCount > 0) {
    console.log(`🗑️ ${result.deletedCount} backups antiguos eliminados`);
  }
}

/**
 * Backup periodico: se ejecuta cada N minutos via middleware
 */
let lastPeriodicBackup = 0;
const PERIODIC_INTERVAL_MS = 60 * 60 * 1000; // 1 hora

async function periodicBackupIfNeeded() {
  const now = Date.now();
  if (now - lastPeriodicBackup < PERIODIC_INTERVAL_MS) return;

  lastPeriodicBackup = now;
  try {
    await createLightBackup('periodic', 'system');
  } catch (err) {
    console.error('❌ Error en backup periodico:', err.message);
  }
}

module.exports = {
  createFullBackup,
  createLightBackup,
  listBackups,
  restoreFromBackup,
  cleanOldBackups,
  periodicBackupIfNeeded
};
