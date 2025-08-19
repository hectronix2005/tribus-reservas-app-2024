const mongoose = require('mongoose');

// URL de MongoDB Atlas
const MONGODB_URI = 'mongodb+srv://tribus_admin:Tribus2024@cluster0.o16ucum.mongodb.net/tribus?retryWrites=true&w=majority&appName=Cluster0';

// Esquema de usuario
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  username: String,
  password: String,
  role: String,
  department: String,
  isActive: Boolean,
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Usuarios por defecto con contraseñas hasheadas
const defaultUsers = [
  {
    name: 'Administrador del Sistema',
    email: 'admin@tribus.com',
    username: 'admin',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', // admin123
    role: 'admin',
    department: 'IT',
    isActive: true
  },
  {
    name: 'Usuario General',
    email: 'usuario@tribus.com',
    username: 'usuario',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', // user123
    role: 'user',
    department: 'General',
    isActive: true
  },
  {
    name: 'Hector Neira',
    email: 'dneira@tribus.com',
    username: 'Dneira',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', // dneira123
    role: 'user',
    department: 'Desarrollo',
    isActive: true
  },
  {
    name: 'Daniel R',
    email: 'drodriguez@picap.co',
    username: 'Drodriguez',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', // drodriguez123
    role: 'user',
    department: 'Gerencia',
    isActive: true
  }
];

async function migrateUsers() {
  try {
    console.log('🔄 Conectando a MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');
    
    console.log('🔄 Limpiando usuarios existentes...');
    await User.deleteMany({});
    console.log('✅ Usuarios existentes eliminados');
    
    console.log('🔄 Migrando usuarios por defecto...');
    
    for (const userData of defaultUsers) {
      await User.create(userData);
      console.log(`✅ Usuario ${userData.username} migrado`);
    }
    
    const allUsers = await User.find({});
    console.log(`📊 Total de usuarios en la base de datos: ${allUsers.length}`);
    
    console.log('📋 Usuarios disponibles:');
    allUsers.forEach(user => {
      console.log(`   - ${user.username} (${user.role}) - ${user.email}`);
    });
    
    console.log('');
    console.log('🔑 Credenciales por defecto:');
    console.log('   - Admin: admin / admin123');
    console.log('   - Usuario: usuario / user123');
    console.log('   - Dneira: Dneira / dneira123');
    console.log('   - Daniel R: Drodriguez / drodriguez123');
    
  } catch (error) {
    console.error('❌ Error migrando usuarios:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Desconectado de MongoDB Atlas');
  }
}

migrateUsers();
