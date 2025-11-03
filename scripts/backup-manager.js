#!/usr/bin/env node

/**
 * Gestor de Backups CLI
 * Herramienta de línea de comandos para gestionar backups y recuperación
 */

const mongoose = require('mongoose');
const backupSystem = require('../utils/backupSystem');
const MONGODB_CONFIG = require('../mongodb-config');

const commands = {
  async create() {
    console.log('🔄 Creando backup completo...\n');
    const result = await backupSystem.createFullBackup();
    console.log(`\n✅ Backup creado exitosamente`);
  },

  async createReservations() {
    console.log('🔄 Creando backup de reservaciones...\n');
    const result = await backupSystem.backupReservations();
    console.log(`\n✅ ${result.count} reservaciones respaldadas`);
    console.log(`📁 Archivo: ${result.path}`);
  },

  async list() {
    console.log('📋 Listando backups disponibles...\n');
    const backups = await backupSystem.listBackups();

    if (backups.length === 0) {
      console.log('⚠️  No hay backups disponibles');
      return;
    }

    console.log(`Total de backups: ${backups.length}\n`);

    backups.forEach((backup, index) => {
      console.log(`${index + 1}. ${backup.filename}`);
      console.log(`   📅 Creado: ${backup.created.toLocaleString()}`);
      console.log(`   📊 Registros: ${backup.recordCount}`);
      console.log(`   💾 Tamaño: ${(backup.size / 1024).toFixed(2)} KB`);
      console.log('');
    });
  },

  async restore(backupFile) {
    if (!backupFile) {
      console.error('❌ Error: Debes especificar el archivo de backup');
      console.log('Uso: npm run backup:restore <archivo>');
      process.exit(1);
    }

    const backups = await backupSystem.listBackups();
    const backup = backups.find(b => b.filename === backupFile);

    if (!backup) {
      console.error(`❌ Error: Backup "${backupFile}" no encontrado`);
      console.log('\nBackups disponibles:');
      backups.forEach(b => console.log(`  - ${b.filename}`));
      process.exit(1);
    }

    console.log(`⚠️  ADVERTENCIA: Esto sobrescribirá los datos actuales`);
    console.log(`Restaurando desde: ${backup.filename}`);
    console.log(`Fecha del backup: ${backup.created.toLocaleString()}\n`);

    // En un entorno de producción, aquí pedirías confirmación
    const result = await backupSystem.restoreFromBackup(backup.path);

    console.log(`\n✅ Restauración completada`);
    console.log(`📊 Colecciones restauradas: ${result.collectionsRestored}`);
  },

  async verify(backupFile) {
    if (!backupFile) {
      console.error('❌ Error: Debes especificar el archivo de backup');
      process.exit(1);
    }

    const backups = await backupSystem.listBackups();
    const backup = backups.find(b => b.filename === backupFile);

    if (!backup) {
      console.error(`❌ Error: Backup "${backupFile}" no encontrado`);
      process.exit(1);
    }

    console.log(`🔍 Verificando integridad de: ${backup.filename}\n`);

    const integrity = await backupSystem.verifyBackup(backup.path);

    if (integrity.valid) {
      console.log('✅ Backup válido');
      console.log(`📊 Colecciones: ${integrity.summary.collections}`);
      console.log(`📝 Registros totales: ${integrity.summary.totalRecords}`);
    } else {
      console.log('❌ Backup con problemas:');
      integrity.issues.forEach(issue => console.log(`  - ${issue}`));
    }
  },

  async incremental() {
    console.log('🔄 Creando backup incremental...\n');
    const result = await backupSystem.createIncrementalBackup();
    console.log(`\n✅ ${result.count} registros nuevos/modificados respaldados`);
    console.log(`📁 Archivo: ${result.path}`);
  },

  help() {
    console.log(`
📦 Gestor de Backups - Tribus Reservas

COMANDOS DISPONIBLES:

  create              Crear backup completo de todas las colecciones
  create-reservations Crear backup solo de reservaciones
  incremental         Crear backup incremental (solo cambios)
  list                Listar todos los backups disponibles
  restore <archivo>   Restaurar desde un backup específico
  verify <archivo>    Verificar integridad de un backup
  help                Mostrar esta ayuda

EJEMPLOS:

  node scripts/backup-manager.js create
  node scripts/backup-manager.js list
  node scripts/backup-manager.js restore full-backup-2025-01-15.json
  node scripts/backup-manager.js verify full-backup-2025-01-15.json

NOTAS:

  - Los backups se guardan en ./backups/
  - Se mantienen automáticamente los últimos 50 backups
  - Antes de restore se crea un backup de seguridad automáticamente
    `);
  }
};

// Ejecutar comando
async function main() {
  const command = process.argv[2] || 'help';
  const arg = process.argv[3];

  if (!commands[command]) {
    console.error(`❌ Comando desconocido: ${command}`);
    commands.help();
    process.exit(1);
  }

  try {
    // Conectar a MongoDB
    if (command !== 'help') {
      console.log('🔌 Conectando a MongoDB...');
      await mongoose.connect(MONGODB_CONFIG.uri, MONGODB_CONFIG.options);
      console.log('✅ Conectado a MongoDB\n');

      // Inicializar sistema de backup
      await backupSystem.initialize();
    }

    // Ejecutar comando
    await commands[command](arg);

    // Desconectar
    if (command !== 'help') {
      await mongoose.disconnect();
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
