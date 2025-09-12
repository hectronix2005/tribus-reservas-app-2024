// Verificar la fecha del lunes 15 de septiembre de 2025
console.log('🔍 DEBUGGING FECHA 15 DE SEPTIEMBRE 2025');
console.log('========================================\n');

// Crear la fecha de diferentes maneras
const date1 = new Date('2025-09-15');
const date2 = new Date(2025, 8, 15); // Mes 8 = septiembre (0-indexado)
const date3 = new Date('September 15, 2025');

console.log('📅 Fecha 1 (string):', date1.toString());
console.log('📅 Fecha 1 (ISO):', date1.toISOString());
console.log('📅 Fecha 1 (día):', date1.getDay(), '(0=domingo, 1=lunes, etc.)');
console.log('');

console.log('📅 Fecha 2 (constructor):', date2.toString());
console.log('📅 Fecha 2 (ISO):', date2.toISOString());
console.log('📅 Fecha 2 (día):', date2.getDay(), '(0=domingo, 1=lunes, etc.)');
console.log('');

console.log('📅 Fecha 3 (string completo):', date3.toString());
console.log('📅 Fecha 3 (ISO):', date3.toISOString());
console.log('📅 Fecha 3 (día):', date3.getDay(), '(0=domingo, 1=lunes, etc.)');
console.log('');

// Verificar qué día de la semana es realmente el 15 de septiembre de 2025
const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
console.log('🎯 RESULTADO:');
console.log('=============');
console.log(`El 15 de septiembre de 2025 es un: ${dayNames[date1.getDay()]}`);
console.log('');

// Verificar si el usuario se refiere a 2024 en lugar de 2025
console.log('🔍 VERIFICANDO 2024:');
console.log('====================');
const date2024 = new Date('2024-09-15');
console.log(`El 15 de septiembre de 2024 es un: ${dayNames[date2024.getDay()]}`);
console.log('');

// Verificar el lunes más cercano al 15 de septiembre de 2025
console.log('🔍 BUSCANDO LUNES CERCA DEL 15 DE SEPTIEMBRE 2025:');
console.log('==================================================');
for (let i = 10; i <= 20; i++) {
  const testDate = new Date(2025, 8, i);
  const dayName = dayNames[testDate.getDay()];
  console.log(`📅 ${i} de septiembre de 2025: ${dayName}`);
}
