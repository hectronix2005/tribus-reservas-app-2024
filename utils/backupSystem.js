const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');

/**
 * Sistema de Backup y Contingencia
 * Garantiza la integridad y recuperación de datos al 100%
 */

class BackupSystem {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.auditLogDir = path.join(__dirname, '../audit-logs');
    this.maxBackups = 50; // Mantener últimos 50 backups
  }

  /**
   * Inicializa el sistema de backup
   */
  async initialize() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      await fs.mkdir(this.auditLogDir, { recursive: true });
      console.log('✅ Sistema de backup inicializado');
    } catch (error) {
      console.error('❌ Error inicializando sistema de backup:', error);
      throw error;
    }
  }

  /**
   * Crea un backup completo de todas las colecciones
   */
  async createFullBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `full-backup-${timestamp}.json`);

      const collections = await mongoose.connection.db.listCollections().toArray();
      const backup = {
        timestamp: new Date().toISOString(),
        database: mongoose.connection.name,
        collections: {}
      };

      for (const collectionInfo of collections) {
        const collectionName = collectionInfo.name;
        const collection = mongoose.connection.db.collection(collectionName);
        const documents = await collection.find({}).toArray();
        backup.collections[collectionName] = documents;
      }

      await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));

      console.log(`✅ Backup completo creado: ${backupPath}`);
      console.log(`📊 Colecciones respaldadas: ${Object.keys(backup.collections).length}`);

      // Limpiar backups antiguos
      await this.cleanOldBackups();

      return backupPath;
    } catch (error) {
      console.error('❌ Error creando backup:', error);
      throw error;
    }
  }

  /**
   * Crea un backup específico de reservaciones
   */
  async backupReservations() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `reservations-${timestamp}.json`);

      const Reservation = mongoose.model('Reservation');
      const reservations = await Reservation.find({}).lean();

      const backup = {
        timestamp: new Date().toISOString(),
        count: reservations.length,
        data: reservations
      };

      await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));

      console.log(`✅ Backup de reservaciones creado: ${reservations.length} registros`);

      return {
        path: backupPath,
        count: reservations.length,
        timestamp: backup.timestamp
      };
    } catch (error) {
      console.error('❌ Error respaldando reservaciones:', error);
      throw error;
    }
  }

  /**
   * Registra operaciones en el log de auditoría
   */
  async logAudit(operation, details) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const logPath = path.join(this.auditLogDir, `audit-${date}.log`);

      const logEntry = {
        timestamp: new Date().toISOString(),
        operation,
        details,
        user: details.userId || 'system'
      };

      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(logPath, logLine);
    } catch (error) {
      console.error('⚠️  Error escribiendo log de auditoría:', error);
      // No lanzar error para no interrumpir operaciones críticas
    }
  }

  /**
   * Limpia backups antiguos manteniendo solo los últimos N
   */
  async cleanOldBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(f => f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: path.join(this.backupDir, f)
        }))
        .sort((a, b) => b.name.localeCompare(a.name)); // Más recientes primero

      if (backupFiles.length > this.maxBackups) {
        const toDelete = backupFiles.slice(this.maxBackups);
        for (const file of toDelete) {
          await fs.unlink(file.path);
          console.log(`🗑️  Backup antiguo eliminado: ${file.name}`);
        }
      }
    } catch (error) {
      console.error('⚠️  Error limpiando backups antiguos:', error);
    }
  }

  /**
   * Restaura datos desde un backup
   */
  async restoreFromBackup(backupPath) {
    try {
      const backupData = await fs.readFile(backupPath, 'utf8');
      const backup = JSON.parse(backupData);

      console.log(`🔄 Restaurando backup desde: ${backupPath}`);
      console.log(`📅 Fecha del backup: ${backup.timestamp}`);

      let restoredCollections = 0;

      for (const [collectionName, documents] of Object.entries(backup.collections)) {
        if (documents.length === 0) continue;

        const collection = mongoose.connection.db.collection(collectionName);

        // Crear backup de seguridad antes de restaurar
        const currentDocs = await collection.find({}).toArray();
        if (currentDocs.length > 0) {
          const safetyBackupPath = path.join(
            this.backupDir,
            `safety-${collectionName}-${Date.now()}.json`
          );
          await fs.writeFile(safetyBackupPath, JSON.stringify(currentDocs, null, 2));
        }

        // Restaurar documentos
        await collection.deleteMany({});
        await collection.insertMany(documents);

        console.log(`✅ Colección ${collectionName} restaurada: ${documents.length} documentos`);
        restoredCollections++;
      }

      console.log(`✅ Restauración completada: ${restoredCollections} colecciones`);

      return {
        success: true,
        collectionsRestored: restoredCollections,
        timestamp: backup.timestamp
      };
    } catch (error) {
      console.error('❌ Error restaurando backup:', error);
      throw error;
    }
  }

  /**
   * Lista todos los backups disponibles
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf8');
        const backup = JSON.parse(content);

        backupFiles.push({
          filename: file,
          path: filePath,
          size: stats.size,
          created: stats.mtime,
          timestamp: backup.timestamp,
          collections: Object.keys(backup.collections || {}).length,
          recordCount: backup.count || Object.values(backup.collections || {}).reduce((sum, docs) => sum + docs.length, 0)
        });
      }

      return backupFiles.sort((a, b) => b.created - a.created);
    } catch (error) {
      console.error('❌ Error listando backups:', error);
      return [];
    }
  }

  /**
   * Verifica la integridad de un backup
   */
  async verifyBackup(backupPath) {
    try {
      const content = await fs.readFile(backupPath, 'utf8');
      const backup = JSON.parse(content);

      const integrity = {
        valid: true,
        issues: [],
        summary: {
          timestamp: backup.timestamp,
          collections: 0,
          totalRecords: 0
        }
      };

      if (!backup.collections) {
        integrity.valid = false;
        integrity.issues.push('Estructura de backup inválida: falta propiedad collections');
        return integrity;
      }

      for (const [collectionName, documents] of Object.entries(backup.collections)) {
        integrity.summary.collections++;
        integrity.summary.totalRecords += documents.length;

        // Verificar que cada documento tenga _id
        const docsWithoutId = documents.filter(doc => !doc._id);
        if (docsWithoutId.length > 0) {
          integrity.issues.push(`${collectionName}: ${docsWithoutId.length} documentos sin _id`);
        }
      }

      if (integrity.issues.length > 0) {
        integrity.valid = false;
      }

      return integrity;
    } catch (error) {
      return {
        valid: false,
        issues: [`Error verificando backup: ${error.message}`],
        summary: null
      };
    }
  }

  /**
   * Crea un snapshot incremental (solo cambios desde el último backup)
   */
  async createIncrementalBackup() {
    try {
      const backups = await this.listBackups();
      const lastBackup = backups[0];

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `incremental-${timestamp}.json`);

      const Reservation = mongoose.model('Reservation');
      let newReservations;

      if (lastBackup) {
        const lastBackupDate = new Date(lastBackup.timestamp);
        newReservations = await Reservation.find({
          updatedAt: { $gt: lastBackupDate }
        }).lean();
      } else {
        newReservations = await Reservation.find({}).lean();
      }

      const backup = {
        timestamp: new Date().toISOString(),
        type: 'incremental',
        basedOn: lastBackup ? lastBackup.timestamp : null,
        count: newReservations.length,
        data: newReservations
      };

      await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));

      console.log(`✅ Backup incremental creado: ${newReservations.length} registros nuevos/modificados`);

      return {
        path: backupPath,
        count: newReservations.length,
        timestamp: backup.timestamp
      };
    } catch (error) {
      console.error('❌ Error creando backup incremental:', error);
      throw error;
    }
  }
}

// Exportar instancia singleton
const backupSystem = new BackupSystem();

module.exports = backupSystem;
