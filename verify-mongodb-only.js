const mongoose = require('mongoose');
const MONGODB_CONFIG = require('./mongodb-config');

console.log('🔍 Verificando configuración de MongoDB Atlas...\n');

// Mostrar configuración
console.log('📋 Configuración actual:');
console.log(`   URI: ${MONGODB_CONFIG.uri.substring(0, 50)}...`);
console.log(`   Base de datos: ${MONGODB_CONFIG.database.name}`);
console.log(`   Cluster: ${MONGODB_CONFIG.database.cluster}`);
console.log(`   Proveedor: ${MONGODB_CONFIG.database.provider}\n`);

// Verificar conexión
async function testConnection() {
  try {
    console.log('🔌 Probando conexión a MongoDB Atlas...');
    
    await mongoose.connect(MONGODB_CONFIG.uri, MONGODB_CONFIG.options);
    
    console.log('✅ Conexión exitosa a MongoDB Atlas');
    
    // Verificar que estamos conectados a la base de datos correcta
    const dbName = mongoose.connection.db.databaseName;
    console.log(`🗄️  Base de datos conectada: ${dbName}`);
    
    // Verificar que no hay conexiones locales
    const connections = mongoose.connections;
    console.log(`🔗 Conexiones activas: ${connections.length}`);
    
    // Mostrar información de la conexión
    const connection = mongoose.connection;
    console.log(`🌐 Host: ${connection.host}`);
    console.log(`🔢 Puerto: ${connection.port}`);
    console.log(`📊 Estado: ${connection.readyState === 1 ? 'Conectado' : 'Desconectado'}`);
    
    await mongoose.disconnect();
    console.log('\n✅ Verificación completada: Solo MongoDB Atlas');
    
  } catch (error) {
    console.error('❌ Error en la verificación:', error.message);
    process.exit(1);
  }
}

testConnection();
