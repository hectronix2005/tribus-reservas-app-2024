// Script para debuggear específicamente el lunes 15 de septiembre de 2025
console.log('🔍 DEBUG ESPECÍFICO: LUNES 15 DE SEPTIEMBRE DE 2025');
console.log('==================================================\n');

// Simular exactamente lo que hace el frontend
const testDateString = '2025-09-15';

console.log('📅 Fecha de prueba:', testDateString);

// Método 1: new Date() directo (problemático)
const method1 = new Date(testDateString);
console.log('\n❌ Método 1 (new Date directo):');
console.log('   Fecha:', method1.toString());
console.log('   Día de la semana:', method1.getDay(), '(0=domingo, 1=lunes)');
console.log('   ISO:', method1.toISOString());

// Método 2: createLocalDate (sistema unificado)
const createLocalDate = (dateString) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new Error(`Formato de fecha inválido: ${dateString}. Se esperaba YYYY-MM-DD`);
  }
  
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month - 1 porque Date usa 0-indexado
};

const method2 = createLocalDate(testDateString);
console.log('\n✅ Método 2 (createLocalDate):');
console.log('   Fecha:', method2.toString());
console.log('   Día de la semana:', method2.getDay(), '(0=domingo, 1=lunes)');
console.log('   ISO:', method2.toISOString());

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

// Función isOfficeDay del sistema unificado
const isOfficeDay = (date, officeDays) => {
  if (!officeDays) {
    console.warn('⚠️ officeDays no está definido, usando configuración por defecto');
    return true;
  }
  
  if (!date || isNaN(date.getTime())) {
    console.error('❌ Fecha inválida proporcionada a isOfficeDay:', date);
    return false;
  }
  
  const dayOfWeek = date.getDay();
  
  const dayMap = {
    0: 'sunday',
    1: 'monday', 
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday'
  };
  
  const dayKey = dayMap[dayOfWeek];
  const result = officeDays[dayKey];
  
  console.log('🔍 isOfficeDay debug:', {
    dateString: date.toString(),
    dayOfWeek,
    dayKey,
    result
  });
  
  return result;
};

console.log('\n🧪 PRUEBA DE VALIDACIÓN:');
console.log('========================');

console.log('\n❌ Método 1 (problemático):');
const result1 = isOfficeDay(method1, officeDays);
console.log('   Resultado:', result1 ? '✅ ES día de oficina' : '❌ NO es día de oficina');

console.log('\n✅ Método 2 (correcto):');
const result2 = isOfficeDay(method2, officeDays);
console.log('   Resultado:', result2 ? '✅ ES día de oficina' : '❌ NO es día de oficina');

console.log('\n🎯 CONCLUSIÓN:');
console.log('==============');
if (result2) {
  console.log('✅ El lunes 15 de septiembre de 2025 DEBERÍA ser válido');
  console.log('❌ El problema persiste en el frontend');
  console.log('\n💡 POSIBLES CAUSAS:');
  console.log('1. El frontend no está usando createLocalDate correctamente');
  console.log('2. La configuración de adminSettings no se está cargando');
  console.log('3. Hay otra validación que está fallando');
  console.log('4. El problema está en el backend, no en el frontend');
} else {
  console.log('❌ El lunes 15 de septiembre de 2025 NO es válido');
  console.log('🔍 PROBLEMA: La lógica de validación está mal');
}
