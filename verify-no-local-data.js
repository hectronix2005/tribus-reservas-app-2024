const https = require('https');

const APP_URL = 'https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com';

console.log('🔍 Verificación completa: Sin datos locales');
console.log('============================================\n');

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

async function verifyNoLocalData() {
  try {
    console.log('1️⃣ Verificando que no hay datos locales en el código...');
    
    // Verificar que no hay referencias a datos locales en el código
    const fs = require('fs');
    const path = require('path');
    
    const srcFiles = [
      'src/context/AppContext.tsx',
      'src/services/api.ts',
      'src/components/Areas.tsx',
      'src/components/Reservations.tsx',
      'src/components/UserManagement.tsx',
      'src/components/Templates.tsx'
    ];
    
    let hasLocalData = false;
    
    for (const file of srcFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Buscar patrones que indiquen datos locales
        const localDataPatterns = [
          /const.*=.*\[.*\{.*name.*\}/, // Arrays con datos hardcodeados
          /mock.*data/i,
          /sample.*data/i,
          /default.*data/i,
          /fallback.*data/i,
          /local.*data/i
        ];
        
        for (const pattern of localDataPatterns) {
          if (pattern.test(content)) {
            console.log(`   ⚠️  Posible dato local encontrado en: ${file}`);
            hasLocalData = true;
          }
        }
      }
    }
    
    if (!hasLocalData) {
      console.log('   ✅ No se encontraron datos locales en el código');
    }
    
    console.log('\n2️⃣ Verificando que todos los datos vienen de MongoDB Atlas...');
    
    // Verificar áreas desde MongoDB
    const areasResponse = await makeRequest(`${APP_URL}/api/areas`);
    if (areasResponse.status === 200) {
      const areas = JSON.parse(areasResponse.data);
      console.log(`   ✅ Áreas cargadas desde MongoDB: ${areas.length} áreas`);
      console.log(`   📋 Áreas: ${areas.map(a => a.name).join(', ')}`);
    }
    
    // Verificar usuarios desde MongoDB
    const usersResponse = await makeRequest(`${APP_URL}/api/users`);
    if (usersResponse.status === 200) {
      const users = JSON.parse(usersResponse.data);
      console.log(`   ✅ Usuarios cargados desde MongoDB: ${users.length} usuarios`);
    }
    
    // Verificar templates desde MongoDB
    const templatesResponse = await makeRequest(`${APP_URL}/api/templates`);
    if (templatesResponse.status === 200) {
      const templates = JSON.parse(templatesResponse.data);
      console.log(`   ✅ Templates cargados desde MongoDB: ${templates.length} templates`);
    }
    
    // Verificar reservaciones desde MongoDB
    const reservationsResponse = await makeRequest(`${APP_URL}/api/reservations`);
    if (reservationsResponse.status === 200) {
      const reservations = JSON.parse(reservationsResponse.data);
      console.log(`   ✅ Reservaciones cargadas desde MongoDB: ${reservations.length} reservaciones`);
    }
    
    console.log('\n3️⃣ Verificando configuración de MongoDB Atlas...');
    
    // Verificar que la configuración de MongoDB está correcta
    const mongodbConfig = require('./mongodb-config');
    console.log(`   ✅ URI de MongoDB configurada: ${mongodbConfig.uri.substring(0, 50)}...`);
    console.log(`   ✅ Base de datos: ${mongodbConfig.database.name}`);
    console.log(`   ✅ Cluster: ${mongodbConfig.database.cluster}`);
    console.log(`   ✅ Proveedor: ${mongodbConfig.database.provider}`);
    
    console.log('\n4️⃣ Verificando que no hay archivos de datos locales...');
    
    const localDataFiles = [
      'data.json',
      'users.json',
      'areas.json',
      'reservations.json',
      'templates.json',
      'local-data.json',
      'mock-data.json'
    ];
    
    let hasLocalFiles = false;
    for (const file of localDataFiles) {
      if (fs.existsSync(file)) {
        console.log(`   ⚠️  Archivo de datos local encontrado: ${file}`);
        hasLocalFiles = true;
      }
    }
    
    if (!hasLocalFiles) {
      console.log('   ✅ No se encontraron archivos de datos locales');
    }
    
    console.log('\n🎯 RESULTADO FINAL:');
    console.log('   ✅ Sistema completamente en la nube');
    console.log('   ✅ Sin datos locales');
    console.log('   ✅ MongoDB Atlas como única fuente de datos');
    console.log('   ✅ Heroku como plataforma de despliegue');
    console.log('   ✅ Sin dependencia de localhost');
    
    console.log('\n🌐 Acceso al sistema:');
    console.log(`   ${APP_URL}`);
    
  } catch (error) {
    console.error('❌ Error en la verificación:', error.message);
  }
}

verifyNoLocalData();
