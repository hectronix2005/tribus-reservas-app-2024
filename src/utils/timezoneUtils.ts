// Configuración de zona horaria para Colombia
export const COLOMBIA_TIMEZONE = 'America/Bogota';

// Opciones de localización para Colombia
export const COLOMBIA_LOCALE = 'es-ES';

// Función para obtener opciones de fecha con zona horaria de Colombia
export const getColombiaDateOptions = (options: Intl.DateTimeFormatOptions = {}) => ({
  ...options,
  timeZone: COLOMBIA_TIMEZONE
});

// Función para formatear fecha en zona horaria de Colombia
export const formatDateInColombia = (
  date: Date | string, 
  options: Intl.DateTimeFormatOptions = {}
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(COLOMBIA_LOCALE, getColombiaDateOptions(options));
};

// Función para obtener la fecha actual en zona horaria de Colombia
export const getCurrentDateInColombia = (): Date => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: COLOMBIA_TIMEZONE }));
};

// Función para convertir fecha ISO a zona horaria de Colombia
export const convertISOToColombiaTime = (isoString: string): Date => {
  return new Date(new Date(isoString).toLocaleString('en-US', { timeZone: COLOMBIA_TIMEZONE }));
};

// Función para obtener el día de la semana en español con zona horaria de Colombia
export const getDayOfWeekInColombia = (date: Date | string): string => {
  return formatDateInColombia(date, { weekday: 'long' });
};

// Función para obtener fecha corta en zona horaria de Colombia
export const getShortDateInColombia = (date: Date | string): string => {
  return formatDateInColombia(date, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Función para obtener fecha completa en zona horaria de Colombia
export const getFullDateInColombia = (date: Date | string): string => {
  return formatDateInColombia(date, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};
