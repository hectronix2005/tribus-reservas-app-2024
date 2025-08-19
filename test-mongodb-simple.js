const { exec } = require('child_process');

// URL de prueba
const testUrl = 'mongodb+srv://tribus_admin:Tribus2024@cluster0.o16ucum.mongodb.net/tribus?retryWrites=true&w=majority&appName=Cluster0';

console.log('🔍 Probando conexión de MongoDB...');
console.log('🔗 URL:', testUrl);
console.log('');

// Verificar si mongosh está disponible
exec('mongosh --version', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ mongosh no está disponible');
    console.log('💡 Instala MongoDB CLI: brew install mongodb/brew/mongodb-database-tools');
    return;
  }
  
  console.log('✅ mongosh disponible:', stdout.trim());
  console.log('');
  
  // Probar conexión con mongosh
  console.log('⏳ Probando conexión...');
  
  const command = `mongosh '${testUrl}' --eval 'db.runCommand({ping: 1})' --quiet`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.log('❌ Error de conexión:');
      console.log('   Mensaje:', error.message);
      
      if (error.message.includes('ENOTFOUND')) {
        console.log('');
        console.log('💡 El problema es que la URL no es válida.');
        console.log('   - cluster0.mongodb.net no es un dominio real');
        console.log('   - Necesitas crear un cluster real en MongoDB Atlas');
        console.log('');
        console.log('🔗 Ve a: https://www.mongodb.com/atlas');
        console.log('📋 Crea un cluster y obtén la URL real');
        console.log('');
        console.log('📋 Pasos para crear MongoDB Atlas:');
        console.log('1. Ve a https://www.mongodb.com/atlas');
        console.log('2. Crea una cuenta gratuita');
        console.log('3. Crea un cluster M0 (gratuito)');
        console.log('4. Configura usuario: tribus_admin / Tribus2024!');
        console.log('5. Configura red: Allow Access from Anywhere');
        console.log('6. Obtén la URL de conexión real');
      }
    } else {
      console.log('✅ ¡Conexión exitosa!');
      console.log('📊 Respuesta:', stdout.trim());
    }
  });
});
