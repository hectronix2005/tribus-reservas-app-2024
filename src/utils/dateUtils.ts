import { format, addDays, isToday, isTomorrow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Función para obtener la fecha actual
export const getCurrentDateInBogota = (): Date => {
  return new Date();
};

// Función para formatear fecha
export const formatDateInBogota = (date: Date | string, formatString: string = 'yyyy-MM-dd'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatString, { locale: es });
};

// Función para formatear hora
export const formatTimeInBogota = (date: Date | string, formatString: string = 'HH:mm'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatString, { locale: es });
};

// Función para convertir fecha local a UTC
export const localToUTC = (date: Date): Date => {
  return date;
};

// Función para convertir UTC a fecha local
export const utcToLocal = (date: Date): Date => {
  return date;
};

// Función para obtener la fecha actual en formato YYYY-MM-DD en Bogotá
export const getCurrentDateString = (): string => {
  return formatDateInBogota(getCurrentDateInBogota(), 'yyyy-MM-dd');
};

// Función para obtener la hora actual en formato HH:mm en Bogotá
export const getCurrentTimeString = (): string => {
  return formatTimeInBogota(getCurrentDateInBogota(), 'HH:mm');
};

// Función para verificar si una fecha es hoy
export const isTodayInBogota = (date: string): boolean => {
  const today = getCurrentDateString();
  return date === today;
};

// Función para verificar si una fecha es mañana
export const isTomorrowInBogota = (date: string): boolean => {
  const tomorrow = formatDateInBogota(addDays(getCurrentDateInBogota(), 1), 'yyyy-MM-dd');
  return date === tomorrow;
};

// Función para obtener la etiqueta de fecha (Hoy, Mañana, etc.)
export const getDateLabel = (date: string): string => {
  if (isTodayInBogota(date)) return 'Hoy';
  if (isTomorrowInBogota(date)) return 'Mañana';
  return format(parseISO(date), 'EEEE', { locale: es });
};

// Función para obtener la clase CSS de la fecha
export const getDateClass = (date: string): string => {
  if (isTodayInBogota(date)) {
    return 'border-primary-500 bg-primary-50 text-primary-700';
  } else if (isTomorrowInBogota(date)) {
    return 'border-warning-500 bg-warning-50 text-warning-700';
  } else {
    return 'border-gray-300 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50';
  }
};

// Función para validar horarios de oficina (7 AM - 6 PM)
export const isValidBusinessHours = (time: string, duration: number): boolean => {
  const [hours, minutes] = time.split(':').map(Number);
  const startTime = hours * 60 + minutes;
  const endTime = startTime + duration;
  
  // Horario de oficina: 7:00 AM (420 minutos) a 6:00 PM (1080 minutos)
  const officeStart = 7 * 60; // 7:00 AM
  const officeEnd = 18 * 60;  // 6:00 PM
  
  return startTime >= officeStart && endTime <= officeEnd;
};

// Función para obtener la hora de fin basada en la hora de inicio y duración
export const getEndTime = (startTime: string, duration: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + duration;
  
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
};

// Función para generar horarios disponibles
export const generateTimeSlots = (): Array<{time: string, label: string}> => {
  const slots = [];
  const startHour = 7; // 7 AM
  const endHour = 18; // 6 PM
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 30) { // Incrementos de 30 minutos
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push({
        time,
        label: `${time}`
      });
    }
  }
  
  return slots;
};
