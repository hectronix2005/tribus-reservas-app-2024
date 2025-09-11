// Utilidades unificadas para el manejo de fechas en UTC
// Este archivo centraliza todo el manejo de fechas para evitar inconsistencias

/**
 * Convierte una fecha local a UTC manteniendo la misma fecha
 * @param localDate - Fecha en formato local (YYYY-MM-DD)
 * @returns Fecha UTC correspondiente
 */
export const localDateToUTC = (localDate: string): Date => {
  const [year, month, day] = localDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

/**
 * Convierte una fecha UTC a string local (YYYY-MM-DD)
 * @param utcDate - Fecha UTC
 * @returns String en formato YYYY-MM-DD
 */
export const utcDateToLocalString = (utcDate: Date): string => {
  const year = utcDate.getUTCFullYear();
  const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Obtiene la fecha actual en UTC
 * @returns Fecha actual en UTC
 */
export const getCurrentUTCDate = (): Date => {
  return new Date();
};

/**
 * Obtiene la fecha actual en formato string UTC (YYYY-MM-DD)
 * @returns String de fecha actual en formato YYYY-MM-DD
 */
export const getCurrentUTCDateString = (): string => {
  return utcDateToLocalString(getCurrentUTCDate());
};

/**
 * Verifica si una fecha es hoy (comparando solo la fecha, no la hora)
 * @param date - Fecha a verificar
 * @returns true si es hoy, false en caso contrario
 */
export const isToday = (date: Date): boolean => {
  const today = getCurrentUTCDate();
  return utcDateToLocalString(date) === utcDateToLocalString(today);
};

/**
 * Verifica si una fecha es mañana (comparando solo la fecha, no la hora)
 * @param date - Fecha a verificar
 * @returns true si es mañana, false en caso contrario
 */
export const isTomorrow = (date: Date): boolean => {
  const tomorrow = new Date(getCurrentUTCDate());
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return utcDateToLocalString(date) === utcDateToLocalString(tomorrow);
};

/**
 * Formatea una fecha para mostrar en la interfaz (usando UTC)
 * @param date - Fecha a formatear
 * @param options - Opciones de formateo
 * @returns String formateado
 */
export const formatDateForDisplay = (date: Date, options?: {
  weekday?: 'short' | 'long';
  year?: 'numeric';
  month?: 'long' | 'short';
  day?: 'numeric';
}): string => {
  const defaultOptions = {
    weekday: 'short' as const,
    year: 'numeric' as const,
    month: 'long' as const,
    day: 'numeric' as const,
    timeZone: 'UTC'
  };
  
  return date.toLocaleDateString('es-ES', { ...defaultOptions, ...options });
};

/**
 * Genera las próximas N días a partir de hoy (usando UTC)
 * @param days - Número de días a generar
 * @returns Array de fechas UTC
 */
export const generateNextDays = (days: number): Date[] => {
  const dates: Date[] = [];
  const today = getCurrentUTCDate();
  
  console.log('🔍 [dateUtils] Generando próximos', days, 'días a partir de hoy:', today.toISOString());
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() + i);
    const dayName = getDayName(date, true);
    const dateString = date.toISOString().split('T')[0];
    console.log('🔍 [dateUtils] Día generado:', {
      index: i,
      dateString,
      dayName,
      dayIndex: date.getUTCDay()
    });
    dates.push(date);
  }
  
  return dates;
};

/**
 * Convierte una hora local a UTC manteniendo la misma hora
 * @param timeString - Hora en formato HH:MM
 * @param date - Fecha base (opcional, por defecto hoy)
 * @returns Fecha UTC con la hora especificada
 */
export const localTimeToUTC = (timeString: string, date?: Date): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const baseDate = date || getCurrentUTCDate();
  
  const utcDate = new Date(baseDate);
  utcDate.setUTCHours(hours, minutes, 0, 0);
  
  return utcDate;
};

/**
 * Convierte una fecha UTC a hora local (HH:MM)
 * @param utcDate - Fecha UTC
 * @returns String de hora en formato HH:MM
 */
export const utcDateToLocalTime = (utcDate: Date): string => {
  const hours = String(utcDate.getUTCHours()).padStart(2, '0');
  const minutes = String(utcDate.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Valida si una fecha es válida
 * @param dateString - String de fecha a validar
 * @returns true si es válida, false en caso contrario
 */
export const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

/**
 * Valida si una hora es válida
 * @param timeString - String de hora a validar (HH:MM)
 * @returns true si es válida, false en caso contrario
 */
export const isValidTime = (timeString: string): boolean => {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
};

/**
 * Compara dos fechas ignorando la hora (solo fecha)
 * @param date1 - Primera fecha
 * @param date2 - Segunda fecha
 * @returns -1 si date1 < date2, 0 si son iguales, 1 si date1 > date2
 */
export const compareDates = (date1: Date, date2: Date): number => {
  const date1String = utcDateToLocalString(date1);
  const date2String = utcDateToLocalString(date2);
  
  if (date1String < date2String) return -1;
  if (date1String > date2String) return 1;
  return 0;
};

/**
 * Obtiene el día de la semana en UTC (0 = Domingo, 1 = Lunes, etc.)
 * @param date - Fecha a evaluar
 * @returns Número del día de la semana (0-6)
 */
export const getUTCDayOfWeek = (date: Date): number => {
  return date.getUTCDay();
};

/**
 * Obtiene el nombre del día de la semana en español
 * @param date - Fecha a evaluar
 * @param short - Si true, devuelve nombre corto (ej: "lun"), si false, nombre completo (ej: "lunes")
 * @returns Nombre del día de la semana
 */
export const getDayName = (date: Date, short: boolean = false): string => {
  const dayNames = {
    short: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
    long: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  };
  
  const dayIndex = getUTCDayOfWeek(date);
  return dayNames[short ? 'short' : 'long'][dayIndex];
};

/**
 * Formatea una fecha en la zona horaria de Bogotá (UTC-5)
 * @param date - Fecha a formatear
 * @param format - Formato deseado (ej: 'dd/MM/yyyy', 'yyyy-MM-dd')
 * @returns String formateado
 */
export const formatDateInBogota = (date: Date | string, format: string = 'dd/MM/yyyy'): string => {
  if (!date) return 'Sin fecha';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return 'Fecha inválida';
  
  // Convertir a zona horaria de Bogotá (UTC-5)
  const bogotaDate = new Date(dateObj.getTime() - (5 * 60 * 60 * 1000));
  
  const day = String(bogotaDate.getUTCDate()).padStart(2, '0');
  const month = String(bogotaDate.getUTCMonth() + 1).padStart(2, '0');
  const year = bogotaDate.getUTCFullYear();
  
  return format
    .replace('dd', day)
    .replace('MM', month)
    .replace('yyyy', year.toString());
};

/**
 * Obtiene la fecha actual en formato string (YYYY-MM-DD)
 * @returns String de fecha actual
 */
export const getCurrentDateString = (): string => {
  return getCurrentUTCDateString();
};