import { AdminSettings } from '../types';

// Función para verificar si un día específico es un día de oficina
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
  
  // Determinar el día de la semana correctamente
  let dayOfWeek: number;
  
  // Verificar si la fecha original es UTC (tiene 'Z' al final)
  const isUTC = date.toISOString().endsWith('Z');
  
  // Para fechas que vienen del formulario (new Date('YYYY-MM-DD')), 
  // JavaScript las interpreta como UTC pero queremos tratarlas como locales
  // Verificamos si la fecha fue creada a partir de un string simple de fecha
  const isSimpleDateString = date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
  
  if (isUTC && !isSimpleDateString) {
    // Si es UTC real (no una fecha simple), convertir a la zona horaria local
    const localTime = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    dayOfWeek = localTime.getUTCDay();
  } else if (isSimpleDateString) {
    // Si es una fecha simple (YYYY-MM-DD), crear una nueva fecha local
    // Extraer los componentes UTC y crear una fecha local
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const localDate = new Date(year, month, day);
    dayOfWeek = localDate.getDay();
  } else {
    // Si es local, usar directamente
    dayOfWeek = date.getDay();
  }
  
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
    console.log('🔍 isOfficeDay debug:', {
      originalDate: date.toISOString(),
      isUTC,
      isSimpleDateString,
      dayOfWeek,
      dayKey,
      officeDays,
      result,
      // Información adicional para debug
      originalDateString: date.toString(),
      timezoneOffset: date.getTimezoneOffset(),
      utcHours: date.getUTCHours(),
      utcMinutes: date.getUTCMinutes(),
      utcSeconds: date.getUTCSeconds(),
      utcYear: date.getUTCFullYear(),
      utcMonth: date.getUTCMonth(),
      utcDate: date.getUTCDate()
    });
  }
  
  return result;
};

// Función auxiliar para crear fechas en la zona horaria local
export const createLocalDate = (dateString: string): Date => {
  // Si la fecha tiene 'Z' al final, es UTC, convertir a local
  if (dateString.endsWith('Z')) {
    const utcDate = new Date(dateString);
    return new Date(utcDate.getTime() - (utcDate.getTimezoneOffset() * 60000));
  }
  
  // Si no tiene 'Z', interpretar como fecha local
  return new Date(dateString);
};

// Función para verificar si una hora específica está dentro del horario de oficina
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

// Función para verificar si una fecha y hora están dentro del horario de oficina
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
    console.log('🏢 isWithinOfficeHours debug:', {
      date: date.toISOString(),
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

// Función para generar horarios disponibles basados en la configuración de oficina
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

// Función para verificar si una fecha está en el futuro y es un día de oficina
export const isValidReservationDate = (
  date: Date, 
  adminSettings: AdminSettings,
  allowSameDay: boolean = true
): boolean => {
  const today = new Date();
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

// Función para obtener el próximo día de oficina
export const getNextOfficeDay = (fromDate: Date, adminSettings: AdminSettings): Date => {
  const nextDate = new Date(fromDate);
  nextDate.setDate(nextDate.getDate() + 1);
  
  while (!isOfficeDay(nextDate, adminSettings.officeDays)) {
    nextDate.setDate(nextDate.getDate() + 1);
  }
  
  return nextDate;
};

// Función para formatear horarios de oficina para mostrar
export const formatOfficeHours = (officeHours: AdminSettings['officeHours']): string => {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };
  
  return `${formatTime(officeHours.start)} - ${formatTime(officeHours.end)}`;
};

// Función para obtener los días de oficina como texto
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
