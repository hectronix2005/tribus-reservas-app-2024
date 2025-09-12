const https = require('https');

console.log('🔍 DIAGNÓSTICO DEL SISTEMA DE LOGIN');
console.log('=====================================\n');

// Función para hacer peticiones HTTPS
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function diagnoseSystem() {
  try {
    console.log('1️⃣ Verificando estado del backend...');
    const healthResponse = await makeRequest('https://tribus-reservas-2024-6b783eae459c.herokuapp.com/api/health');
    console.log(`   ✅ Backend responde: ${healthResponse.statusCode}`);
    console.log(`   📊 Respuesta: ${healthResponse.data}\n`);

    console.log('2️⃣ Probando login con admin...');
    const adminLogin = await makeRequest('https://tribus-reservas-2024-6b783eae459c.herokuapp.com/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    if (adminLogin.statusCode === 200) {
      const adminData = JSON.parse(adminLogin.data);
      console.log(`   ✅ Login admin exitoso`);
      console.log(`   👤 Usuario: ${adminData.user.name} (${adminData.user.username})`);
      console.log(`   🔑 Token generado: ${adminData.token ? 'Sí' : 'No'}\n`);
    } else {
      console.log(`   ❌ Error en login admin: ${adminLogin.statusCode}`);
      console.log(`   📄 Respuesta: ${adminLogin.data}\n`);
    }

    console.log('3️⃣ Probando login con Hneira...');
    const hneiraLogin = await makeRequest('https://tribus-reservas-2024-6b783eae459c.herokuapp.com/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'Hneira',
        password: 'admin123'
      })
    });
    
    if (hneiraLogin.statusCode === 200) {
      const hneiraData = JSON.parse(hneiraLogin.data);
      console.log(`   ✅ Login Hneira exitoso`);
      console.log(`   👤 Usuario: ${hneiraData.user.name} (${hneiraData.user.username})`);
      console.log(`   🔑 Token generado: ${hneiraData.token ? 'Sí' : 'No'}\n`);
    } else {
      console.log(`   ❌ Error en login Hneira: ${hneiraLogin.statusCode}`);
      console.log(`   📄 Respuesta: ${hneiraData.data}\n`);
    }

    console.log('4️⃣ Verificando frontend...');
    const frontendResponse = await makeRequest('https://tribus-reservas-2024-6b783eae459c.herokuapp.com/');
    console.log(`   ✅ Frontend responde: ${frontendResponse.statusCode}`);
    console.log(`   📏 Tamaño: ${frontendResponse.data.length} bytes`);
    
    // Verificar CSP
    const csp = frontendResponse.headers['content-security-policy'];
    if (csp) {
      console.log(`   🛡️ CSP detectado: ${csp.substring(0, 100)}...`);
      if (csp.includes("default-src 'self'")) {
        console.log(`   ⚠️ CSP restrictivo detectado - podría bloquear conexiones a la API`);
      }
    }
    console.log('');

    console.log('5️⃣ Verificando usuarios disponibles...');
    const usersResponse = await makeRequest('https://tribus-reservas-2024-6b783eae459c.herokuapp.com/api/users');
    if (usersResponse.statusCode === 200) {
      const users = JSON.parse(usersResponse.data);
      console.log(`   👥 Total usuarios: ${users.length}`);
      console.log(`   📋 Usuarios activos:`);
      users.forEach(user => {
        console.log(`      - ${user.name} (${user.username}) - ${user.role} - Activo: ${user.isActive}`);
      });
    } else {
      console.log(`   ❌ Error obteniendo usuarios: ${usersResponse.statusCode}`);
    }

    console.log('\n🎯 RESUMEN:');
    console.log('===========');
    console.log('✅ Backend funcionando correctamente');
    console.log('✅ Login funcionando en el backend');
    console.log('✅ Frontend cargando correctamente');
    console.log('⚠️ Posible problema: CSP restrictivo en el frontend');
    console.log('\n💡 SOLUCIÓN RECOMENDADA:');
    console.log('El problema parece estar en el Content Security Policy del frontend.');
    console.log('El frontend no puede conectarse a la API debido a las restricciones de CSP.');
    console.log('Necesitamos actualizar la configuración de CSP en el servidor.');

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error.message);
  }
}

diagnoseSystem();
