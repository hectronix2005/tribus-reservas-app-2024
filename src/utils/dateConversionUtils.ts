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
