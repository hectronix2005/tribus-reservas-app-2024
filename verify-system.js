#!/usr/bin/env node

/**
 * Script de Verificación del Sistema TRIBUS
 * Verifica que todos los componentes principales estén funcionando correctamente
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('🔍 TRIBUS - Verificación del Sistema');
console.log('=====================================\n');

// Configuración
const SERVER_URL = 'http://localhost:3000';
const TIMEOUT = 5000;

// Colores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      timeout: TIMEOUT
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function checkServer() {
  log('1. Verificando servidor...', 'blue');
  try {
    const response = await makeRequest('/');
    if (response.statusCode === 200) {
      log('   ✅ Servidor funcionando correctamente', 'green');
      return true;
    } else {
      log(`   ❌ Servidor respondió con código: ${response.statusCode}`, 'red');
      return false;
    }
  } catch (error) {
    log(`   ❌ Error conectando al servidor: ${error.message}`, 'red');
    return false;
  }
}

async function checkAPIEndpoints() {
  log('\n2. Verificando endpoints de API...', 'blue');
  
  const endpoints = [
    { path: '/api/areas', name: 'Áreas' },
    { path: '/api/departments', name: 'Departamentos' },
    { path: '/api/templates', name: 'Plantillas' }
  ];

  let allWorking = true;

  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(endpoint.path);
      if (response.statusCode === 200 || response.statusCode === 304) {
        log(`   ✅ ${endpoint.name}: OK`, 'green');
      } else {
        log(`   ❌ ${endpoint.name}: Código ${response.statusCode}`, 'red');
        allWorking = false;
      }
    } catch (error) {
      log(`   ❌ ${endpoint.name}: Error - ${error.message}`, 'red');
      allWorking = false;
    }
  }

  return allWorking;
}

function checkFiles() {
  log('\n3. Verificando archivos del sistema...', 'blue');
  
  const criticalFiles = [
    'server.js',
    'package.json',
    'src/App.tsx',
    'src/components/Reservations.tsx',
    'src/components/Header.tsx',
    'src/components/Availability.tsx',
    'src/context/AppContext.tsx',
    'src/services/api.ts',
    'build/static/js/main.c14475c7.js'
  ];

  let allExist = true;

  for (const file of criticalFiles) {
    if (fs.existsSync(file)) {
      log(`   ✅ ${file}`, 'green');
    } else {
      log(`   ❌ ${file} - NO ENCONTRADO`, 'red');
      allExist = false;
    }
  }

  return allExist;
}

function checkBuild() {
  log('\n4. Verificando build del frontend...', 'blue');
  
  const buildDir = 'build';
  const staticDir = path.join(buildDir, 'static');
  const jsDir = path.join(staticDir, 'js');
  const cssDir = path.join(staticDir, 'css');

  if (!fs.existsSync(buildDir)) {
    log('   ❌ Directorio build no existe', 'red');
    return false;
  }

  if (!fs.existsSync(staticDir)) {
    log('   ❌ Directorio static no existe', 'red');
    return false;
  }

  // Verificar archivos JS
  const jsFiles = fs.readdirSync(jsDir).filter(file => file.endsWith('.js'));
  if (jsFiles.length === 0) {
    log('   ❌ No se encontraron archivos JavaScript', 'red');
    return false;
  }

  // Verificar archivos CSS
  const cssFiles = fs.readdirSync(cssDir).filter(file => file.endsWith('.css'));
  if (cssFiles.length === 0) {
    log('   ❌ No se encontraron archivos CSS', 'red');
    return false;
  }

  log(`   ✅ Build completo - ${jsFiles.length} archivos JS, ${cssFiles.length} archivos CSS`, 'green');
  return true;
}

function checkConfiguration() {
  log('\n5. Verificando configuración...', 'blue');
  
  // Verificar package.json
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (packageJson.scripts && packageJson.scripts.start) {
      log('   ✅ Script de inicio configurado', 'green');
    } else {
      log('   ❌ Script de inicio no encontrado', 'red');
      return false;
    }

    if (packageJson.dependencies && packageJson.dependencies.express) {
      log('   ✅ Dependencias del servidor instaladas', 'green');
    } else {
      log('   ❌ Dependencias del servidor faltantes', 'red');
      return false;
    }

  } catch (error) {
    log(`   ❌ Error leyendo package.json: ${error.message}`, 'red');
    return false;
  }

  return true;
}

async function main() {
  log('Iniciando verificación del sistema...\n', 'bold');
  
  const results = {
    server: await checkServer(),
    api: await checkAPIEndpoints(),
    files: checkFiles(),
    build: checkBuild(),
    config: checkConfiguration()
  };

  log('\n📊 RESUMEN DE VERIFICACIÓN', 'bold');
  log('============================', 'bold');
  
  const totalChecks = Object.keys(results).length;
  const passedChecks = Object.values(results).filter(Boolean).length;
  
  log(`\nTotal de verificaciones: ${totalChecks}`, 'blue');
  log(`Verificaciones exitosas: ${passedChecks}`, 'green');
  log(`Verificaciones fallidas: ${totalChecks - passedChecks}`, 'red');
  
  if (passedChecks === totalChecks) {
    log('\n🎉 ¡SISTEMA COMPLETAMENTE FUNCIONAL!', 'green');
    log('El sistema TRIBUS está listo para uso en producción.', 'green');
  } else {
    log('\n⚠️  SISTEMA CON PROBLEMAS', 'yellow');
    log('Algunas verificaciones fallaron. Revisar los errores arriba.', 'yellow');
  }

  log('\n📋 DETALLES POR COMPONENTE:', 'bold');
  log(`Servidor: ${results.server ? '✅' : '❌'}`, results.server ? 'green' : 'red');
  log(`API Endpoints: ${results.api ? '✅' : '❌'}`, results.api ? 'green' : 'red');
  log(`Archivos del sistema: ${results.files ? '✅' : '❌'}`, results.files ? 'green' : 'red');
  log(`Build del frontend: ${results.build ? '✅' : '❌'}`, results.build ? 'green' : 'red');
  log(`Configuración: ${results.config ? '✅' : '❌'}`, results.config ? 'green' : 'red');

  log('\n🔗 ACCESO AL SISTEMA:', 'bold');
  log('URL: http://localhost:3000', 'blue');
  log('Usuario Admin: admin@tribus.com / admin123', 'blue');
  log('Usuario Líder: lider@tribus.com / lider123', 'blue');

  process.exit(passedChecks === totalChecks ? 0 : 1);
}

// Ejecutar verificación
main().catch(error => {
  log(`\n❌ Error durante la verificación: ${error.message}`, 'red');
  process.exit(1);
});
