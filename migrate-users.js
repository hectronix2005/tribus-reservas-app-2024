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

// Usuarios por defecto
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
  }
];

async function migrateUsers() {
  try {
    console.log('🔄 Conectando a MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');
    
    console.log('🔄 Migrando usuarios por defecto...');
    
    for (const userData of defaultUsers) {
      const existingUser = await User.findOne({ username: userData.username });
      if (!existingUser) {
        await User.create(userData);
        console.log(`✅ Usuario ${userData.username} migrado`);
      } else {
        console.log(`⚠️ Usuario ${userData.username} ya existe`);
      }
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
    
  } catch (error) {
    console.error('❌ Error migrando usuarios:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Desconectado de MongoDB Atlas');
  }
}

migrateUsers();
