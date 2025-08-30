// Utilidades para conversión segura de fechas

// Función para convertir DD-MM-YY a Date object de manera segura
export const parseDateFromDDMMYY = (dateString: string): Date => {
  if (/^\d{2}-\d{2}-\d{2}$/.test(dateString)) {
    const [day, month, year] = dateString.split('-').map(Number);
    const fullYear = year < 50 ? 2000 + year : 1900 + year;
    return new Date(fullYear, month - 1, day);
  }
  throw new Error(`Formato de fecha inválido: ${dateString}. Se esperaba DD-MM-YY`);
};

// Función para convertir YYYY-MM-DD a Date object de manera segura
export const parseDateFromYYYYMMDD = (dateString: string): Date => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  throw new Error(`Formato de fecha inválido: ${dateString}. Se esperaba YYYY-MM-DD`);
};

// Función para convertir cualquier formato de fecha a Date object de manera segura
export const parseDateSafely = (dateString: string): Date => {
  // Intentar DD-MM-YY primero
  if (/^\d{2}-\d{2}-\d{2}$/.test(dateString)) {
    return parseDateFromDDMMYY(dateString);
  }
  
  // Intentar YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return parseDateFromYYYYMMDD(dateString);
  }
  
  // Intentar con el constructor de Date
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`No se pudo parsear la fecha: ${dateString}`);
  }
  
  return date;
};

// Función para convertir Date object a DD-MM-YY
export const formatDateToDDMMYY = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
};

// Función para convertir Date object a YYYY-MM-DD
export const formatDateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Función para validar si una fecha es válida
export const isValidDate = (dateString: string): boolean => {
  try {
    parseDateSafely(dateString);
    return true;
  } catch {
    return false;
  }
};

// Función para normalizar fechas a formato YYYY-MM-DD de manera consistente (estándar)
export const normalizeDateConsistent = (date: string | Date): string => {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    // Si ya es formato YYYY-MM-DD, retornarlo tal como está
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // Si es formato DD-MM-YY, convertir a YYYY-MM-DD
    else if (/^\d{2}-\d{2}-\d{2}$/.test(date)) {
      const [day, month, year] = date.split('-').map(Number);
      const fullYear = year < 50 ? 2000 + year : 1900 + year;
      return `${fullYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
    // Si es formato ISO string (2025-08-30T00:00:00.000Z), extraer solo la fecha en UTC
    else if (date.includes('T')) {
      // Para fechas ISO, siempre usar UTC para evitar problemas de zona horaria
      const [year, month, day] = date.split('T')[0].split('-').map(Number);
      // Crear fecha en UTC para evitar conversiones de zona horaria
      dateObj = new Date(Date.UTC(year, month - 1, day));
    } else {
      // Para otros formatos, usar el constructor de Date
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }
  
  // Convertir a formato YYYY-MM-DD usando UTC para evitar problemas de zona horaria
  const year = dateObj.getUTCFullYear();
  const month = (dateObj.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = dateObj.getUTCDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// Función para probar la normalización de fechas
export const testDateNormalization = () => {
  const testCases = [
    '2025-08-30T00:00:00.000Z',
    '2025-08-30',
    '30-08-25',
    new Date('2025-08-30T00:00:00.000Z')
  ];
  
  console.log('🧪 Pruebas de normalización de fechas (formato YYYY-MM-DD):');
  testCases.forEach((testCase, index) => {
    const normalized = normalizeDateConsistent(testCase);
    console.log(`Test ${index + 1}:`, {
      input: testCase,
      normalized,
      type: typeof testCase
    });
  });
  
  // Verificar que todas las fechas se normalizan a YYYY-MM-DD
  const allNormalized = testCases.map(testCase => normalizeDateConsistent(testCase));
  const allEqual = allNormalized.every(date => date === '2025-08-30');
  console.log('✅ Todas las fechas se normalizan igual:', allEqual);
};

// Función específica para debuggear el problema de normalización
export const debugDateNormalization = () => {
  console.log('🔍 DEBUG: Análisis detallado de normalización de fechas');
  
  // Simular el flujo completo: frontend → backend → frontend
  const frontendDate = '2025-08-30'; // Formato estándar YYYY-MM-DD
  console.log('1. Fecha del frontend (YYYY-MM-DD):', frontendDate);
  
  // Simular lo que hace el backend: new Date(frontendDate)
  const backendDate = new Date(frontendDate);
  console.log('2. Fecha en el backend (new Date):', backendDate);
  console.log('2.1. Fecha ISO del backend:', backendDate.toISOString());
  console.log('2.2. Fecha local del backend:', backendDate.toString());
  
  // Simular lo que viene de la base de datos (fecha ISO)
  const dbDate = backendDate.toISOString();
  console.log('3. Fecha de la base de datos (ISO):', dbDate);
  
  // Normalizar la fecha de la BD
  const normalizedFromDB = normalizeDateConsistent(dbDate);
  console.log('4. Fecha normalizada desde BD:', normalizedFromDB);
  
  // Normalizar la fecha original del frontend
  const normalizedFromFrontend = normalizeDateConsistent(frontendDate);
  console.log('5. Fecha normalizada desde frontend:', normalizedFromFrontend);
  
  // Comparar
  console.log('6. ¿Son iguales?:', normalizedFromDB === normalizedFromFrontend);
  
  if (normalizedFromDB !== normalizedFromFrontend) {
    console.error('❌ PROBLEMA DETECTADO: Las fechas no se normalizan igual');
    console.error('   - Desde BD:', normalizedFromDB);
    console.error('   - Desde frontend:', normalizedFromFrontend);
  } else {
    console.log('✅ Las fechas se normalizan correctamente');
  }
  
  return {
    frontendDate,
    backendDate: backendDate.toISOString(),
    normalizedFromDB,
    normalizedFromFrontend,
    areEqual: normalizedFromDB === normalizedFromFrontend
  };
};
