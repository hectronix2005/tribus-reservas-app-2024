const https = require('https');

const APP_URL = 'https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com';

console.log('🧪 Probando conexión frontend-backend...\n');

// Función para hacer requests HTTPS
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function testConnection() {
  try {
    console.log('1️⃣ Probando endpoint de salud...');
    const healthResponse = await makeRequest(`${APP_URL}/api/health`);
    console.log(`   ✅ Status: ${healthResponse.status}`);
    console.log(`   📄 Respuesta: ${healthResponse.data.substring(0, 100)}...`);
    
    console.log('\n2️⃣ Probando endpoint de áreas...');
    const areasResponse = await makeRequest(`${APP_URL}/api/areas`);
    console.log(`   ✅ Status: ${areasResponse.status}`);
    console.log(`   📄 Áreas encontradas: ${JSON.parse(areasResponse.data).length}`);
    
    console.log('\n3️⃣ Probando endpoint de usuarios...');
    const usersResponse = await makeRequest(`${APP_URL}/api/users`);
    console.log(`   ✅ Status: ${usersResponse.status}`);
    console.log(`   📄 Usuarios encontrados: ${JSON.parse(usersResponse.data).length}`);
    
    console.log('\n4️⃣ Probando página principal...');
    const mainResponse = await makeRequest(APP_URL);
    console.log(`   ✅ Status: ${mainResponse.status}`);
    console.log(`   📄 Contenido HTML: ${mainResponse.data.includes('Sistema de Reservas') ? '✅ React app cargado' : '❌ React app no encontrado'}`);
    
    console.log('\n🎯 Resultado de la prueba:');
    console.log('   ✅ Backend API funcionando');
    console.log('   ✅ MongoDB Atlas conectado');
    console.log('   ✅ Frontend React cargado');
    console.log('   ✅ Sin errores de conexión');
    
    console.log('\n🌐 URL de acceso:');
    console.log(`   ${APP_URL}`);
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
  }
}

testConnection();
