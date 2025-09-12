// Script para diagnosticar el problema de días de oficina
console.log('🔍 DIAGNÓSTICO DEL PROBLEMA DE DÍAS DE OFICINA');
console.log('==============================================\n');

// Simular la lógica del frontend
const testDateString = '2025-09-15';

console.log('📅 Fecha de prueba:', testDateString);

// Crear fecha usando el método corregido
const [year, month, day] = testDateString.split('-').map(Number);
const selectedDate = new Date(year, month - 1, day);

console.log('📅 Fecha creada:', selectedDate.toString());
console.log('📅 Día de la semana:', selectedDate.getDay(), '(0=domingo, 1=lunes)');

// Simular configuración de días de oficina
const officeDays = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false
};

console.log('\n🏢 Configuración de días de oficina:');
console.log(officeDays);

// Simular la función isOfficeDay
const dayMap = {
  0: 'sunday',
  1: 'monday', 
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday'
};

const dayOfWeek = selectedDate.getDay();
const dayKey = dayMap[dayOfWeek];
const result = officeDays[dayKey];

console.log('\n🔍 Análisis:');
console.log('============');
console.log(`Día de la semana: ${dayOfWeek}`);
console.log(`Clave del día: ${dayKey}`);
console.log(`Es día de oficina: ${result}`);

if (result) {
  console.log('\n✅ RESULTADO: La fecha DEBERÍA ser válida');
  console.log('❌ PROBLEMA: El error persiste en el frontend');
  console.log('\n💡 POSIBLES CAUSAS:');
  console.log('1. state.adminSettings no se está cargando correctamente');
  console.log('2. La función isOfficeDay está recibiendo datos incorrectos');
  console.log('3. Hay otra validación que está fallando');
} else {
  console.log('\n❌ RESULTADO: La fecha NO es válida');
  console.log('🔍 PROBLEMA: La configuración de días de oficina está mal');
}

console.log('\n🧪 PRUEBA ADICIONAL:');
console.log('====================');

// Probar con diferentes fechas
const testDates = [
  '2025-09-15', // Lunes
  '2025-09-16', // Martes
  '2025-09-17', // Miércoles
  '2025-09-18', // Jueves
  '2025-09-19', // Viernes
  '2025-09-20', // Sábado
  '2025-09-21'  // Domingo
];

testDates.forEach(dateStr => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const testDate = new Date(y, m - 1, d);
  const dayOfWeek = testDate.getDay();
  const dayKey = dayMap[dayOfWeek];
  const isOfficeDay = officeDays[dayKey];
  
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  console.log(`${dateStr} (${dayNames[dayOfWeek]}): ${isOfficeDay ? '✅ Laboral' : '❌ No laboral'}`);
});
