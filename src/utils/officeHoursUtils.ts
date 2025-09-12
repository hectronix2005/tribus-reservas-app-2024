// Re-exportar funciones del sistema unificado de fechas
export {
  isOfficeDay,
  isOfficeHour,
  isWithinOfficeHours,
  isValidReservationDate,
  getNextOfficeDay,
  formatOfficeHours,
  getOfficeDaysText,
  generateAvailableTimeSlots
} from './unifiedDateUtils';

// Función auxiliar para crear fechas en la zona horaria local (mantenida para compatibilidad)
export const createLocalDate = (dateString: string): Date => {
  // Si la fecha tiene 'Z' al final, es UTC, convertir a local
  if (dateString.endsWith('Z')) {
    const utcDate = new Date(dateString);
    return new Date(utcDate.getTime() - (utcDate.getTimezoneOffset() * 60000));
  }
  
  // Si no tiene 'Z', interpretar como fecha local
  return new Date(dateString);
};
