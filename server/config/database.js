const mongoose = require('mongoose');
const MONGODB_CONFIG = require('../../mongodb-config');
const emailService = require('../../services/emailService-improved');

const connectDatabase = async () => {
  mongoose.set('debug', process.env.NODE_ENV !== 'production');

  await mongoose.connect(MONGODB_CONFIG.uri, MONGODB_CONFIG.options)
    .then(async () => {
      console.log('✅ Conectado exitosamente a MongoDB Atlas');
      console.log(`🗄️  Base de datos: ${MONGODB_CONFIG.database.name}`);
      console.log(`🌐 Cluster: ${MONGODB_CONFIG.database.cluster}`);
      await emailService.initialize();
    })
    .catch(err => {
      console.error('❌ Error conectando a MongoDB Atlas:', err.message);
      console.error('🔍 Verificar:');
      console.error('   - Conexión a internet');
      console.error('   - Credenciales de MongoDB Atlas');
      console.error('   - Configuración de red');
      process.exit(1);
    });
};

module.exports = connectDatabase;
