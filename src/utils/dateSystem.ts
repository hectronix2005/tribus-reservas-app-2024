/**
 * Sistema Unificado de Manejo de Fechas - UTC
 * Todas las fechas se manejan en UTC para evitar problemas de zona horaria
 */

export interface DateSystemConfig {
  timezone: string; // 'America/Bogota' para Colombia
  businessHours: {
    start: string; // '08:00'
    end: string;   // '18:00'
  };
}

// Configuración por defecto
const DEFAULT_CONFIG: DateSystemConfig = {
  timezone: 'America/Bogota',
  businessHours: {
    start: '08:00',
    end: '18:00'
  }
};

/**
 * Convierte una fecha local a UTC manteniendo la fecha visual
 * @param localDate - Fecha en formato YYYY-MM-DD
 * @returns Fecha UTC que representa el inicio del día en la zona local
 */
export function localDateToUTC(localDate: string): Date {
  if (!localDate || typeof localDate !== 'string') {
    throw new Error('Fecha local inválida');
  }

  // Parsear la fecha local (YYYY-MM-DD)
  const [year, month, day] = localDate.split('-').map(Number);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error('Formato de fecha inválido. Use YYYY-MM-DD');
  }

  // Crear fecha UTC que representa el inicio del día en la zona local
  // Para Colombia (UTC-5), el inicio del día local 00:00 se convierte a 05:00 UTC
  const utcDate = new Date(Date.UTC(year, month - 1, day, 5, 0, 0, 0));
  
  return utcDate;
}

/**
 * Convierte una fecha UTC a fecha local (YYYY-MM-DD)
 * @param utcDate - Fecha UTC
 * @returns Fecha en formato YYYY-MM-DD
 */
export function utcDateToLocal(utcDate: Date): string {
  if (!utcDate || !(utcDate instanceof Date)) {
    throw new Error('Fecha UTC inválida');
  }

  // Para fechas UTC, simplemente extraer la parte de la fecha sin conversión de zona horaria
  // Esto evita problemas de descontar días
  const year = utcDate.getUTCFullYear();
  const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utcDate.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Crea una fecha UTC para Hot Desk (día completo)
 * @param localDate - Fecha en formato YYYY-MM-DD
 * @returns Fecha UTC que representa el inicio del día
 */
export function createHotDeskDate(localDate: string): Date {
  return localDateToUTC(localDate);
}

/**
 * Crea una fecha UTC para Salas (con hora específica)
 * @param localDate - Fecha en formato YYYY-MM-DD
 * @param localTime - Hora en formato HH:MM
 * @returns Fecha UTC que representa la fecha y hora local
 */
export function createSalaDate(localDate: string, localTime: string): Date {
  if (!localTime || typeof localTime !== 'string') {
    throw new Error('Hora local inválida');
  }

  const [year, month, day] = localDate.split('-').map(Number);
  const [hours, minutes] = localTime.split(':').map(Number);
  
  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
    throw new Error('Formato de fecha/hora inválido');
  }

  // Crear fecha UTC que representa la fecha y hora local
  // Para Colombia (UTC-5), sumamos 5 horas para convertir a UTC
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours + 5, minutes, 0, 0));
  
  return utcDate;
}

/**
 * Normaliza una fecha para comparación (siempre retorna YYYY-MM-DD)
 * @param date - Fecha en cualquier formato
 * @returns Fecha normalizada en formato YYYY-MM-DD
 */
export function normalizeDateForComparison(date: string | Date): string {
  if (!date) {
    throw new Error('Fecha no proporcionada');
  }

  let dateObj: Date;
  
  if (typeof date === 'string') {
    if (date.includes('T')) {
      // Fecha ISO (2025-09-09T05:00:00.000Z)
      dateObj = new Date(date);
    } else if (date.includes('-')) {
      // Fecha local (2025-09-09)
      return date; // Ya está en el formato correcto
    } else {
      throw new Error('Formato de fecha no reconocido');
    }
  } else {
    dateObj = date;
  }

  // Convertir a fecha local para comparación
  return utcDateToLocal(dateObj);
}

/**
 * Verifica si una fecha está en el pasado
 * @param localDate - Fecha en formato YYYY-MM-DD
 * @param localTime - Hora en formato HH:MM (opcional, para salas)
 * @returns true si la fecha está en el pasado
 */
export function isDateInPast(localDate: string, localTime?: string): boolean {
  const now = new Date();
  let targetDate: Date;

  if (localTime) {
    // Para salas, usar fecha y hora específica
    targetDate = createSalaDate(localDate, localTime);
  } else {
    // Para Hot Desk, usar inicio del día
    targetDate = createHotDeskDate(localDate);
  }

  return targetDate < now;
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 * @returns Fecha actual en formato YYYY-MM-DD
 */
export function getCurrentLocalDate(): string {
  const now = new Date();
  return utcDateToLocal(now);
}

/**
 * Formatea una fecha UTC para mostrar al usuario
 * @param utcDate - Fecha UTC
 * @returns Fecha formateada para mostrar
 */
export function formatDateForDisplay(utcDate: Date): string {
  const localDate = utcDateToLocal(utcDate);
  const [year, month, day] = localDate.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Valida que una fecha esté en formato YYYY-MM-DD
 * @param date - Fecha a validar
 * @returns true si el formato es válido
 */
export function isValidDateFormat(date: string): boolean {
  if (!date || typeof date !== 'string') return false;
  
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) return false;
  
  const [year, month, day] = date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  
  return dateObj.getFullYear() === year && 
         dateObj.getMonth() === month - 1 && 
         dateObj.getDate() === day;
}

/**
 * Valida que una hora esté en formato HH:MM
 * @param time - Hora a validar
 * @returns true si el formato es válido
 */
export function isValidTimeFormat(time: string): boolean {
  if (!time || typeof time !== 'string') return false;
  
  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(time);
}

// Exportar configuración por defecto
export { DEFAULT_CONFIG };
