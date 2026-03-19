// Sistema unificado de manejo de fechas - SOLO FECHAS LOCALES
// Este archivo centraliza todo el manejo de fechas usando ÚNICAMENTE fechas locales
// para evitar problemas de timezone entre UTC y local

import { AdminSettings } from '../types';

/**
 * Crea una fecha local a partir de un string YYYY-MM-DD o ISO string
 * @param dateString - Fecha en formato YYYY-MM-DD o ISO string (ej: 2025-11-06T00:00:00.000Z)
 * @returns Date object en zona horaria local
 */
export const createLocalDate = (dateString: string): Date => {
  // Normalizar la fecha si viene en formato ISO (con 'T')
  const normalizedDate = dateString.includes('T') ? dateString.split('T')[0] : dateString;

  // Validar formato YYYY-MM-DD después de normalizar
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    throw new Error(`Formato de fecha inválido: ${dateString}. Se esperaba YYYY-MM-DD o ISO string`);
  }

  const [year, month, day] = normalizedDate.split('-').map(Number);
  return new Date(year, month - 1, day); // month - 1 porque Date usa 0-indexado
};

/**
 * Convierte una Date object a string YYYY-MM-DD usando fechas locales
 * @param date - Date object
 * @returns String en formato YYYY-MM-DD
 */
export const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Obtiene la fecha actual en zona horaria local
 * @returns Date object de hoy
 */
export const getToday = (): Date => {
  return new Date();
};

/**
 * Obtiene la fecha actual como string YYYY-MM-DD en zona horaria local
 * @returns String de fecha actual
 */
export const getTodayString = (): string => {
  return formatDateToString(getToday());
};

/**
 * Obtiene el día de la semana (0 = Domingo, 1 = Lunes, etc.) usando fechas locales
 * @param date - Date object
 * @returns Número del día de la semana (0-6)
 */
export const getLocalDayOfWeek = (date: Date): number => {
  return date.getDay();
};

/**
 * Obtiene el nombre del día de la semana en español
 * @param date - Date object
 * @param short - Si true, devuelve nombre corto (ej: "lun"), si false, nombre completo (ej: "lunes")
 * @returns Nombre del día de la semana
 */
export const getDayName = (date: Date, short: boolean = false): string => {
  const dayNames = {
    short: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
    long: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  };
  
  const dayIndex = getLocalDayOfWeek(date);
  return dayNames[short ? 'short' : 'long'][dayIndex];
};

/**
 * Verifica si un día específico es un día de oficina usando fechas locales
 * @param date - Date object
 * @param officeDays - Configuración de días de oficina
 * @returns true si es día de oficina, false en caso contrario
 */
export const isOfficeDay = (date: Date, officeDays: AdminSettings['officeDays']): boolean => {
  // Validar que officeDays existe
  if (!officeDays) {
    console.warn('⚠️ officeDays no está definido, usando configuración por defecto');
    return true; // Por defecto, permitir todos los días si no hay configuración
  }
  
  // Validar que la fecha sea válida
  if (!date || isNaN(date.getTime())) {
    console.error('❌ Fecha inválida proporcionada a isOfficeDay:', date);
    return false;
  }
  
  // Determinar el día de la semana usando fechas locales
  const dayOfWeek = getLocalDayOfWeek(date);
  
  const dayMap = {
    0: 'sunday',
    1: 'monday', 
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday'
  };
  
  const dayKey = dayMap[dayOfWeek as keyof typeof dayMap];
  const result = officeDays[dayKey as keyof typeof officeDays];
  
  // Solo mostrar logs en desarrollo para evitar spam
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 isOfficeDay debug (LOCAL):', {
      dateString: formatDateToString(date),
      dayOfWeek,
      dayKey,
      dayName: getDayName(date),
      officeDays,
      result
    });
  }
  
  return result;
};

/**
 * Verifica si una hora específica está dentro del horario de oficina
 * @param time - Hora en formato HH:MM
 * @param officeHours - Configuración de horarios de oficina
 * @returns true si está dentro del horario, false en caso contrario
 */
export const isOfficeHour = (time: string, officeHours: AdminSettings['officeHours']): boolean => {
  const [hours, minutes] = time.split(':').map(Number);
  const timeInMinutes = hours * 60 + minutes;
  
  const [startHours, startMinutes] = officeHours.start.split(':').map(Number);
  const startInMinutes = startHours * 60 + startMinutes;
  
  const [endHours, endMinutes] = officeHours.end.split(':').map(Number);
  const endInMinutes = endHours * 60 + endMinutes;
  
  const result = timeInMinutes >= startInMinutes && timeInMinutes < endInMinutes;
  
  // Solo mostrar logs en desarrollo para evitar spam
  if (process.env.NODE_ENV === 'development') {
    console.log('🕐 isOfficeHour debug:', {
      time,
      timeInMinutes,
      officeHours,
      startInMinutes,
      endInMinutes,
      result,
      isAfterStart: timeInMinutes >= startInMinutes,
      isBeforeEnd: timeInMinutes < endInMinutes
    });
  }
  
  return result;
};

/**
 * Verifica si una fecha y hora están dentro del horario de oficina
 * @param date - Date object
 * @param time - Hora en formato HH:MM
 * @param adminSettings - Configuración completa de administración
 * @returns true si está dentro del horario de oficina, false en caso contrario
 */
export const isWithinOfficeHours = (
  date: Date, 
  time: string, 
  adminSettings: AdminSettings
): boolean => {
  // Verificar si es un día de oficina
  const isOfficeDayResult = isOfficeDay(date, adminSettings.officeDays);
  
  // Verificar si está dentro del horario de oficina
  const isOfficeHourResult = isOfficeHour(time, adminSettings.officeHours);
  
  const result = isOfficeDayResult && isOfficeHourResult;
  
  // Solo mostrar logs en desarrollo para evitar spam
  if (process.env.NODE_ENV === 'development') {
    console.log('🏢 isWithinOfficeHours debug (LOCAL):', {
      dateString: formatDateToString(date),
      dayName: getDayName(date),
      time,
      adminSettings: {
        officeDays: adminSettings.officeDays,
        officeHours: adminSettings.officeHours
      },
      isOfficeDay: isOfficeDayResult,
      isOfficeHour: isOfficeHourResult,
      result
    });
  }
  
  return result;
};

/**
 * Verifica si una fecha está en el futuro y es un día de oficina usando fechas locales
 * @param date - Date object
 * @param adminSettings - Configuración de administración
 * @param allowSameDay - Si permite reservas del mismo día
 * @returns true si es válida para reservación, false en caso contrario
 */
export const isValidReservationDate = (
  date: Date, 
  adminSettings: AdminSettings,
  allowSameDay: boolean = true
): boolean => {
  const today = getToday();
  today.setHours(0, 0, 0, 0);
  
  const reservationDate = new Date(date);
  reservationDate.setHours(0, 0, 0, 0);
  
  // Verificar que la fecha no esté en el pasado (a menos que se permitan reservas del mismo día)
  if (!allowSameDay && reservationDate <= today) {
    return false;
  }
  
  // Verificar que sea un día de oficina
  return isOfficeDay(date, adminSettings.officeDays);
};

/**
 * Obtiene el próximo día de oficina usando fechas locales
 * @param fromDate - Fecha desde la cual buscar
 * @param adminSettings - Configuración de administración
 * @returns Date object del próximo día de oficina
 */
export const getNextOfficeDay = (fromDate: Date, adminSettings: AdminSettings): Date => {
  const nextDate = new Date(fromDate);
  nextDate.setDate(nextDate.getDate() + 1);
  
  while (!isOfficeDay(nextDate, adminSettings.officeDays)) {
    nextDate.setDate(nextDate.getDate() + 1);
  }
  
  return nextDate;
};

/**
 * Compara dos fechas ignorando la hora (solo fecha) usando fechas locales
 * @param date1 - Primera fecha
 * @param date2 - Segunda fecha
 * @returns -1 si date1 < date2, 0 si son iguales, 1 si date1 > date2
 */
export const compareDates = (date1: Date, date2: Date): number => {
  const date1String = formatDateToString(date1);
  const date2String = formatDateToString(date2);
  
  if (date1String < date2String) return -1;
  if (date1String > date2String) return 1;
  return 0;
};

/**
 * Verifica si una fecha es hoy usando fechas locales
 * @param date - Fecha a verificar
 * @returns true si es hoy, false en caso contrario
 */
export const isToday = (date: Date): boolean => {
  const today = getToday();
  return formatDateToString(date) === formatDateToString(today);
};

/**
 * Verifica si una fecha es mañana usando fechas locales
 * @param date - Fecha a verificar
 * @returns true si es mañana, false en caso contrario
 */
export const isTomorrow = (date: Date): boolean => {
  const tomorrow = new Date(getToday());
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateToString(date) === formatDateToString(tomorrow);
};

/**
 * Normaliza una fecha UTC string del backend a formato local string
 * Esto resuelve el problema de desfase de timezone entre backend (UTC) y frontend (local)
 * @param utcDateString - Fecha en formato UTC ISO string (ej: "2025-11-04T00:00:00.000Z")
 * @returns String en formato YYYY-MM-DD usando la fecha UTC tal como está (sin conversión de timezone)
 */
export const normalizeUTCDateToLocal = (utcDateString: string): string => {
  // Si la fecha incluye 'T', es una fecha UTC ISO string
  if (utcDateString.includes('T')) {
    // Extraer solo la parte de la fecha (YYYY-MM-DD) sin conversión de timezone
    // Esto mantiene la fecha tal como está almacenada en UTC
    return utcDateString.split('T')[0];
  }
  // Si ya es un string simple, retornarlo tal cual
  return utcDateString;
};

/**
 * Genera las próximas N días a partir de hoy usando fechas locales
 * @param days - Número de días a generar
 * @returns Array de fechas locales
 */
export const generateNextDays = (days: number): Date[] => {
  const dates: Date[] = [];
  const today = getToday();
  
  console.log('🔍 [unifiedDateUtils] Generando próximos', days, 'días a partir de hoy:', formatDateToString(today));
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayName = getDayName(date, true);
    const dateString = formatDateToString(date);
    console.log('🔍 [unifiedDateUtils] Día generado:', {
      index: i,
      dateString,
      dayName,
      dayIndex: getLocalDayOfWeek(date)
    });
    dates.push(date);
  }
  
  return dates;
};

/**
 * Formatea una fecha para mostrar en la interfaz usando fechas locales
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
    day: 'numeric' as const
  };

  return date.toLocaleDateString('es-ES', { ...defaultOptions, ...options });
};

/**
 * Formatea una fecha desde un string YYYY-MM-DD directamente sin crear Date object
 * Esto evita problemas de timezone al mostrar fechas
 * @param dateString - String en formato YYYY-MM-DD
 * @param options - Opciones de formateo
 * @returns String formateado en español
 */
export const formatDateStringForDisplay = (dateString: string, options?: {
  weekday?: 'short' | 'long';
  year?: 'numeric';
  month?: 'long' | 'short';
  day?: 'numeric';
}): string => {
  // Normalizar la fecha primero (por si viene en formato UTC)
  const normalizedDate = normalizeUTCDateToLocal(dateString);

  // Extraer año, mes y día del string YYYY-MM-DD
  const [year, month, day] = normalizedDate.split('-').map(Number);

  // Nombres de días y meses en español
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  // Calcular el día de la semana usando el algoritmo de Zeller (modificado para Gregoriano)
  // Este algoritmo calcula el día de la semana sin crear un Date object
  let m = month;
  let y = year;

  // Ajustar para enero y febrero
  if (m <= 2) {
    m += 12;
    y -= 1;
  }

  const q = day;
  const K = y % 100;
  const J = Math.floor(y / 100);

  const h = (q + Math.floor(13 * (m + 1) / 5) + K + Math.floor(K / 4) + Math.floor(J / 4) - 2 * J) % 7;

  // Convertir el resultado de Zeller (0=sábado) a nuestro formato (0=domingo)
  const dayOfWeek = (h + 6) % 7;

  // Construir el string de salida
  const parts: string[] = [];

  if (options?.weekday) {
    parts.push(dayNames[dayOfWeek]);
  }

  parts.push(day.toString());

  if (options?.month) {
    parts.push('de');
    parts.push(monthNames[month - 1]);
  }

  if (options?.year) {
    parts.push('de');
    parts.push(year.toString());
  }

  return parts.join(' ');
};

/**
 * Formatea una fecha en formato DD/MM/YYYY - Día de la semana
 * Sin usar Date objects para evitar problemas de timezone
 * @param dateString - String en formato YYYY-MM-DD o ISO
 * @returns String formateado como "04/11/2025 - martes"
 */
export const formatDateWithDayName = (dateString: string): string => {
  // Normalizar la fecha primero
  const normalizedDate = normalizeUTCDateToLocal(dateString);

  // Extraer año, mes y día
  const [year, month, day] = normalizedDate.split('-').map(Number);

  // Nombres de días en español
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  // Calcular día de la semana usando algoritmo de Zeller
  let m = month;
  let y = year;

  if (m <= 2) {
    m += 12;
    y -= 1;
  }

  const q = day;
  const K = y % 100;
  const J = Math.floor(y / 100);
  const h = (q + Math.floor(13 * (m + 1) / 5) + K + Math.floor(K / 4) + Math.floor(J / 4) - 2 * J) % 7;
  const dayOfWeek = (h + 6) % 7;

  // Formatear DD/MM/YYYY
  const formattedDate = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;

  // Retornar con día de la semana
  return `${formattedDate} - ${dayNames[dayOfWeek]}`;
};

/**
 * Valida si una fecha es válida
 * @param dateString - String de fecha a validar
 * @returns true si es válida, false en caso contrario
 */
export const isValidDate = (dateString: string): boolean => {
  try {
    const date = createLocalDate(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
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
 * Genera horarios disponibles basados en la configuración de oficina
 * @param adminSettings - Configuración de administración
 * @param startTime - Hora de inicio (opcional)
 * @param endTime - Hora de fin (opcional)
 * @returns Array de horarios disponibles
 */
export const generateAvailableTimeSlots = (
  adminSettings: AdminSettings,
  startTime?: string,
  endTime?: string
): string[] => {
  const slots: string[] = [];
  
  // Usar horarios de oficina por defecto si no se especifican
  const officeStart = startTime || adminSettings.officeHours.start;
  const officeEnd = endTime || adminSettings.officeHours.end;
  
  const [startHours, startMinutes] = officeStart.split(':').map(Number);
  const [endHours, endMinutes] = officeEnd.split(':').map(Number);
  
  const startInMinutes = startHours * 60 + startMinutes;
  const endInMinutes = endHours * 60 + endMinutes;
  
  // Generar slots cada 60 minutos
  for (let minutes = startInMinutes; minutes < endInMinutes; minutes += 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    slots.push(timeString);
  }
  
  return slots;
};

/**
 * Formatea horarios de oficina para mostrar
 * @param officeHours - Configuración de horarios de oficina
 * @returns String formateado
 */
export const formatOfficeHours = (officeHours: AdminSettings['officeHours']): string => {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };
  
  return `${formatTime(officeHours.start)} - ${formatTime(officeHours.end)}`;
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
 * Obtiene la fecha actual en formato string (YYYY-MM-DD) — alias de getTodayString
 * @returns String de fecha actual
 */
export const getCurrentDateString = (): string => {
  return getTodayString();
};

/**
 * Obtiene los días de oficina como texto
 * @param officeDays - Configuración de días de oficina
 * @returns String descriptivo
 */
export const getOfficeDaysText = (officeDays: AdminSettings['officeDays']): string => {
  const dayNames = {
    monday: 'Lunes',
    tuesday: 'Martes', 
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };
  
  const activeDays = Object.entries(officeDays)
    .filter(([_, isActive]) => isActive)
    .map(([day, _]) => dayNames[day as keyof typeof dayNames]);
  
  if (activeDays.length === 0) return 'No hay días configurados';
  if (activeDays.length === 7) return 'Todos los días';
  if (activeDays.length === 5 && !officeDays.saturday && !officeDays.sunday) return 'Lunes a Viernes';
  
  return activeDays.join(', ');
};
