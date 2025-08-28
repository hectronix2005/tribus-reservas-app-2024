// Configuración de MongoDB Atlas
const MONGODB_CONFIG = {
  // URI de conexión a MongoDB Atlas
  uri: process.env.MONGODB_URI || 'mongodb+srv://tribus_admin:Tribus2024@cluster0.o16ucum.mongodb.net/tribus?retryWrites=true&w=majority&appName=Cluster0',
  
  // Opciones de conexión
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout de 5 segundos
    socketTimeoutMS: 45000, // Timeout de socket de 45 segundos
    maxPoolSize: 10, // Máximo número de conexiones en el pool
    minPoolSize: 1, // Mínimo número de conexiones en el pool
    maxIdleTimeMS: 30000, // Tiempo máximo de inactividad
    retryWrites: true,
    w: 'majority'
  },
  
  // Información de la base de datos
  database: {
    name: 'tribus',
    cluster: 'Cluster0',
    provider: 'MongoDB Atlas'
  }
};

module.exports = MONGODB_CONFIG;
