import { AdminSettings } from '../types';

// Función para verificar si un día específico es un día de oficina
export const isOfficeDay = (date: Date, officeDays: AdminSettings['officeDays']): boolean => {
  const dayOfWeek = date.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
  
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
  return officeDays[dayKey as keyof typeof officeDays];
};

// Función para verificar si una hora específica está dentro del horario de oficina
export const isOfficeHour = (time: string, officeHours: AdminSettings['officeHours']): boolean => {
  const [hours, minutes] = time.split(':').map(Number);
  const timeInMinutes = hours * 60 + minutes;
  
  const [startHours, startMinutes] = officeHours.start.split(':').map(Number);
  const startInMinutes = startHours * 60 + startMinutes;
  
  const [endHours, endMinutes] = officeHours.end.split(':').map(Number);
  const endInMinutes = endHours * 60 + endMinutes;
  
  return timeInMinutes >= startInMinutes && timeInMinutes < endInMinutes;
};

// Función para verificar si una fecha y hora están dentro del horario de oficina
export const isWithinOfficeHours = (
  date: Date, 
  time: string, 
  adminSettings: AdminSettings
): boolean => {
  // Verificar si es un día de oficina
  if (!isOfficeDay(date, adminSettings.officeDays)) {
    return false;
  }
  
  // Verificar si está dentro del horario de oficina
  return isOfficeHour(time, adminSettings.officeHours);
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
