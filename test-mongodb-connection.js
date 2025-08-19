const mongoose = require('mongoose');

// URL de prueba
const testUrl = 'mongodb+srv://tribus_admin:Tribus2024!@cluster0.mongodb.net/tribus?retryWrites=true&w=majority';

console.log('🔍 Probando conexión de MongoDB...');
console.log('🔗 URL:', testUrl);
console.log('');

async function testConnection() {
  try {
    console.log('⏳ Intentando conectar...');
    
    // Configurar timeout
    const options = {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };
    
    await mongoose.connect(testUrl, options);
    
    console.log('✅ ¡Conexión exitosa!');
    console.log('📊 Base de datos:', mongoose.connection.db.databaseName);
    console.log('🔗 Host:', mongoose.connection.host);
    console.log('🚪 Puerto:', mongoose.connection.port);
    
    // Probar operación básica
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Colecciones disponibles:', collections.length);
    
    await mongoose.disconnect();
    console.log('✅ Desconectado correctamente');
    
  } catch (error) {
    console.log('❌ Error de conexión:');
    console.log('   Tipo:', error.name);
    console.log('   Mensaje:', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('');
      console.log('💡 El problema es que la URL no es válida.');
      console.log('   - cluster0.mongodb.net no es un dominio real');
      console.log('   - Necesitas crear un cluster real en MongoDB Atlas');
      console.log('');
      console.log('🔗 Ve a: https://www.mongodb.com/atlas');
      console.log('📋 Crea un cluster y obtén la URL real');
    }
  }
}

testConnection();
