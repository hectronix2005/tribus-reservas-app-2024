const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const MONGODB_CONFIG = require('./mongodb-config');

// Esquema de Usuario
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  username: String,
  password: String,
  cedula: String,
  employeeId: String,
  role: String,
  department: String,
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
});

const User = mongoose.model('User', userSchema);

async function resetPasswords() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_CONFIG.uri, MONGODB_CONFIG.options);
    console.log('✅ Conectado a MongoDB\n');

    // Lista de usuarios a resetear con sus nuevas contraseñas
    const usersToReset = [
      { username: 'admin', newPassword: 'admin123' },
      { username: 'usuario', newPassword: 'usuario123' },
      { username: 'Hneira', newPassword: 'hneira123' },
      { username: 'Dneira', newPassword: 'dneira123' },
      { username: 'Dcoronado', newPassword: 'dcoronado123' },
      { username: 'prueba', newPassword: 'prueba123' }
    ];

    console.log('🔑 Reseteando contraseñas...\n');

    for (const userData of usersToReset) {
      const user = await User.findOne({ username: userData.username });

      if (user) {
        // Hashear nueva contraseña
        const hashedPassword = await bcrypt.hash(userData.newPassword, 10);

        // Actualizar contraseña
        await User.updateOne(
          { username: userData.username },
          {
            password: hashedPassword,
            updatedAt: new Date()
          }
        );

        console.log(`✅ ${userData.username} → Contraseña: ${userData.newPassword} (${user.role})`);
      } else {
        console.log(`❌ ${userData.username} → Usuario no encontrado`);
      }
    }

    console.log('\n✅ Contraseñas reseteadas exitosamente');
    console.log('\n📝 CREDENCIALES DE ACCESO:');
    console.log('═'.repeat(50));
    console.log('Usuario: admin      | Contraseña: admin123      (Admin)');
    console.log('Usuario: usuario    | Contraseña: usuario123    (User)');
    console.log('Usuario: Hneira     | Contraseña: hneira123     (Admin)');
    console.log('Usuario: Dneira     | Contraseña: dneira123     (Lider)');
    console.log('Usuario: Dcoronado  | Contraseña: dcoronado123  (Admin)');
    console.log('Usuario: prueba     | Contraseña: prueba123     (Lider)');
    console.log('═'.repeat(50));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Desconectado de MongoDB');
    process.exit(0);
  }
}

resetPasswords();
