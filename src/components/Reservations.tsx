import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, Edit, Calendar, Clock, MapPin, User, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { reservationService, departmentService } from '../services/api';
import { isWithinOfficeHours, isValidReservationDate, isOfficeDay, isOfficeHour } from '../utils/officeHoursUtils';
import { normalizeDateConsistent, testDateNormalization, debugDateNormalization } from '../utils/dateConversionUtils';
import { ReservationFilters } from './ReservationFilters';
import { Department } from '../types';

interface Reservation {
  _id: string;
  userId: string | { _id: string; name: string; username: string };
  userName: string;
  area: string;
  date: string;
  startTime: string;
  endTime: string;
  contactPerson: string;
  teamName: string;
  contactEmail: string;
  contactPhone: string;
  templateId?: string | null;
  requestedSeats: number;
  status: 'active' | 'cancelled' | 'completed';
  notes: string;
  createdAt: string;
  updatedAt: string;
  // Información del usuario que creó la reserva (auditoría)
  createdBy?: {
    userId: string;
    userName: string;
    userEmail: string;
    userRole: 'admin' | 'user' | 'colaborador';
  };
  // Colaboradores incluidos en la reserva
  colaboradores?: Array<{
    _id: string;
    name: string;
    username: string;
    email: string;
  }>;
  // Nombres de asistentes
  attendees?: string[];
}

interface ReservationFormData {
  area: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  contactPerson: string;
  teamName: string;
  contactEmail: string;
  contactPhone: string;
  templateId: string;
  requestedSeats: number;
  notes: string;
  colaboradores: string[]; // Array de IDs de colaboradores
  attendees: string[]; // Array de nombres de asistentes
  // Campos para reservaciones recurrentes (solo para admins)
  isRecurring: boolean;
  recurrenceType: 'daily' | 'weekly' | 'monthly' | 'custom';
  recurrenceInterval: number; // Cada X días/semanas/meses
  recurrenceEndDate: string; // Fecha de fin de la recurrencia
  recurrenceDays: string[]; // Para recurrencia semanal: ['monday', 'tuesday', etc.]
}

export function Reservations() {
  const { state, getDailyCapacity } = useApp();
  const currentUser = state.auth.currentUser;

  // Función para calcular la capacidad disponible de un área en una fecha específica
  const getAvailableCapacity = useCallback((areaId: string, date: string): number => {
    const dailyCapacity = getDailyCapacity(date);
    const areaCapacity = dailyCapacity.find(capacity => capacity.areaId === areaId);
    return areaCapacity ? areaCapacity.availableSeats : 0;
  }, [getDailyCapacity]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDefaultFilterApplied, setIsDefaultFilterApplied] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [formData, setFormData] = useState<ReservationFormData>({
    area: '',
    date: (() => {
      // Inicializar con la fecha actual en formato YYYY-MM-DD (estándar)
      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    })(),
    startTime: '09:00',
    endTime: '10:00',
    duration: '60',
    contactPerson: currentUser?.name || '',
    teamName: '',
    contactEmail: currentUser?.email || '',
    contactPhone: '',
    templateId: '',
    requestedSeats: 1,
    notes: '',
    colaboradores: [],
    attendees: [],
    // Campos para reservaciones recurrentes (solo para admins)
    isRecurring: false,
    recurrenceType: 'weekly',
    recurrenceInterval: 1,
    recurrenceEndDate: '',
    recurrenceDays: ['monday']
  });

  // Función para manejar el cambio de área
  const handleAreaChange = (areaName: string) => {
    const selectedArea = areas.find(area => area.name === areaName);
    const isFullDay = selectedArea?.isFullDayReservation || false;
    
    // Obtener horario de oficina del administrador
    const officeHours = state.adminSettings?.officeHours || { start: '08:00', end: '18:00' };
    
    setFormData(prev => ({
      ...prev,
      area: areaName,
      // Si es reserva por día completo (HOT DESK), usar horario de oficina
      startTime: isFullDay ? officeHours.start : '09:00',
      endTime: isFullDay ? officeHours.end : '10:00',
      duration: '60', // Duración por defecto de 1 hora
      // Si es una sala de reunión, establecer la capacidad completa
      requestedSeats: selectedArea?.isMeetingRoom ? selectedArea.capacity : 1
    }));

    // Limpiar error cuando cambie el área
    setError(null);
  };

  // Función para manejar la selección de plantilla
  const handleTemplateChange = (templateId: string) => {
    if (!templateId) {
      // Si no se selecciona plantilla, mantener los datos actuales
      return;
    }

    const selectedTemplate = state.templates.find(template => template.id === templateId);
    if (selectedTemplate) {
      setFormData(prev => ({
        ...prev,
        templateId: templateId,
        contactPerson: selectedTemplate.contactPerson,
        teamName: selectedTemplate.groupName,
        contactEmail: selectedTemplate.contactEmail,
        contactPhone: selectedTemplate.contactPhone,
        notes: selectedTemplate.notes || prev.notes
      }));
    }
  };

  // Obtener áreas del contexto
  const areas = state.areas;
  
  // Obtener usuarios colaboradores disponibles
  const colaboradoresDisponibles = state.users.filter(user => 
    user.role === 'colaborador' && user.isActive
  );

  // Cargar departamentos disponibles al montar el componente
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const depts = await departmentService.getDepartments();
        setDepartments(depts);
      } catch (error) {
        console.error('Error cargando departamentos:', error);
      }
    };

    loadDepartments();

    // Escuchar cambios en departamentos desde el panel de administración
    const handleDepartmentsUpdate = () => {
      loadDepartments();
    };

    window.addEventListener('departmentsUpdated', handleDepartmentsUpdate);

    return () => {
      window.removeEventListener('departmentsUpdated', handleDepartmentsUpdate);
    };
  }, []);
  
  // Verificar si el área seleccionada requiere reserva por día completo
  const selectedArea = areas.find(area => area.name === formData.area);
  const isFullDayReservation = selectedArea?.isFullDayReservation || false;

  // Función para generar opciones de duración basada en el rol del usuario
  const getDurationOptions = useCallback(() => {
    const baseOptions = [
      { value: '30', label: '30 minutos' },
      { value: '60', label: '1 hora' },
      { value: '90', label: '1.5 horas' },
      { value: '120', label: '2 horas' },
      { value: '180', label: '3 horas' },
      { value: '240', label: '4 horas' },
      { value: '300', label: '5 horas' },
      { value: '360', label: '6 horas' },
      { value: '420', label: '7 horas' },
      { value: '480', label: '8 horas' }
    ];

    // Si el usuario es admin, mostrar todas las opciones
    if (currentUser?.role === 'admin') {
      return baseOptions;
    }

    // Si el usuario es user, limitar a máximo 3 horas (180 minutos)
    return baseOptions.filter(option => parseInt(option.value) <= 180);
  }, [currentUser?.role]);

  // Validar y ajustar duración para usuarios con rol "user"
  useEffect(() => {
    if (currentUser?.role === 'user' && !isFullDayReservation) {
      const currentDuration = parseInt(formData.duration || '60');
      if (currentDuration > 180) {
        // Ajustar a 3 horas máximo
        const newEndTime = addMinutesToTime(formData.startTime, 180);
        setFormData(prev => ({
          ...prev,
          duration: '180',
          endTime: newEndTime
        }));
        
        // Mostrar mensaje informativo
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ Duración ajustada para usuario con rol "user":', {
            originalDuration: currentDuration,
            newDuration: 180,
            originalEndTime: formData.endTime,
            newEndTime: newEndTime
          });
        }
      }
    }
  }, [currentUser?.role, formData.duration, formData.startTime, isFullDayReservation]);

  // Asegurar que HOT DESK use el horario de oficina completo
  useEffect(() => {
    if (isFullDayReservation && formData.area) {
      const officeHours = state.adminSettings?.officeHours || { start: '08:00', end: '18:00' };
      
      // Si el horario actual no coincide con el horario de oficina, actualizarlo
      if (formData.startTime !== officeHours.start || formData.endTime !== officeHours.end) {
        setFormData(prev => ({
          ...prev,
          startTime: officeHours.start,
          endTime: officeHours.end
        }));
      }
    }
  }, [isFullDayReservation, formData.area, state.adminSettings?.officeHours]);



  // Función para normalizar fechas a formato YYYY-MM-DD (para comparaciones internas)
  const normalizeDate = useCallback((date: string | Date): string => {
    const normalizedDate = normalizeDateConsistent(date);
    
    // Solo mostrar logs en desarrollo para evitar spam
    if (process.env.NODE_ENV === 'development') {
      console.log('📅 Normalización de fecha:', {
        original: date,
        normalized: normalizedDate,
        type: typeof date,
        isISO: typeof date === 'string' && date.includes('T'),
        isYYYYMMDD: typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date),
        isDDMMYY: typeof date === 'string' && /^\d{2}-\d{2}-\d{2}$/.test(date)
      });
    }
    
    return normalizedDate;
  }, []);

  // Función para formatear fecha para visualización (Día, Mes y Año)
  const formatDateForDisplay = (date: string | Date): string => {
    let dateObj: Date;
    
    if (typeof date === 'string') {
      // Si es formato DD-MM-YY, convertir a Date
      if (/^\d{2}-\d{2}-\d{2}$/.test(date)) {
        const [day, month, year] = date.split('-').map(Number);
        // Asumir que el año es 20XX si es menor a 50, sino 19XX
        const fullYear = year < 50 ? 2000 + year : 1900 + year;
        dateObj = new Date(fullYear, month - 1, day); // month - 1 porque Date usa 0-indexed months
      }
      // Si es formato YYYY-MM-DD, parsear directamente
      else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-').map(Number);
        dateObj = new Date(year, month - 1, day); // month - 1 porque Date usa 0-indexed months
      }
      // Si es un string ISO, crear la fecha correctamente
      else if (date.includes('T')) {
        // Para fechas ISO, usar UTC para evitar problemas de zona horaria
        const [year, month, day] = date.split('T')[0].split('-').map(Number);
        dateObj = new Date(year, month - 1, day); // month - 1 porque Date usa 0-indexed months
      } else {
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }
    
    // Formato: "Viernes, 30 de agosto de 2025" - Zona horaria Colombia
    return dateObj.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Bogota'
    });
  };



  // Función para formatear fecha con día de la semana (DD/MM/YYYY - Día)
  const formatDateWithDay = (date: string | Date): string => {
    let dateObj: Date;
    
    if (typeof date === 'string') {
      // Si es formato DD-MM-YY, convertir a Date
      if (/^\d{2}-\d{2}-\d{2}$/.test(date)) {
        const [day, month, year] = date.split('-').map(Number);
        // Asumir que el año es 20XX si es menor a 50, sino 19XX
        const fullYear = year < 50 ? 2000 + year : 1900 + year;
        dateObj = new Date(fullYear, month - 1, day); // month - 1 porque Date usa 0-indexed months
      }
      // Si es formato YYYY-MM-DD, parsear directamente
      else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-').map(Number);
        dateObj = new Date(year, month - 1, day); // month - 1 porque Date usa 0-indexed months
      }
      // Si es un string ISO, crear la fecha correctamente
      else if (date.includes('T')) {
        // Para fechas ISO, usar UTC para evitar problemas de zona horaria
        const [year, month, day] = date.split('T')[0].split('-').map(Number);
        dateObj = new Date(year, month - 1, day); // month - 1 porque Date usa 0-indexed months
      } else {
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }
    
    // Formato: "30/08/2025 - Viernes" - Zona horaria Colombia
    const shortDate = dateObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Bogota'
    });
    const dayName = dateObj.toLocaleDateString('es-ES', {
      weekday: 'long',
      timeZone: 'America/Bogota'
    });
    
    return `${shortDate} - ${dayName}`;
  };

  // Función para verificar conflictos de horarios
  const getConflictingReservations = useCallback((area: string, date: string, startTime: string, endTime: string, excludeId?: string) => {
    const normalizedDate = normalizeDate(date);
    
    console.log('🔍 Buscando conflictos para:', {
      area,
      originalDate: date,
      normalizedDate,
      displayDate: formatDateForDisplay(date),
      startTime,
      endTime
    });
    
    const conflicts = reservations.filter(reservation => {
      // Excluir la reservación que se está editando
      if (excludeId && reservation._id === excludeId) return false;
      
      // Verificar que sea la misma área y fecha (normalizada)
      const reservationDate = normalizeDate(reservation.date);
      
      console.log('🔍 Comparando reservación:', {
        reservationArea: reservation.area,
        reservationDate: reservation.date,
        reservationDateNormalized: reservationDate,
        reservationDateDisplay: formatDateForDisplay(reservation.date),
        areaMatch: reservation.area === area,
        dateMatch: reservationDate === normalizedDate,
        isMatch: reservation.area === area && reservationDate === normalizedDate
      });
      
      if (reservation.area !== area || reservationDate !== normalizedDate) return false;
      
      // Verificar que la reservación esté activa
      if (reservation.status !== 'active') return false;
      
      // Verificar conflicto de horarios
      const reservationStart = reservation.startTime;
      const reservationEnd = reservation.endTime;
      
      // Hay conflicto si los horarios se solapan
      const hasConflict = (
        (startTime < reservationEnd && endTime > reservationStart) ||
        (reservationStart < endTime && reservationEnd > startTime)
      );
      
      // Debug: Log conflictos encontrados
      if (hasConflict) {
        console.log('🔴 Conflicto detectado:', {
          area,
          date,
          requestedTime: `${startTime}-${endTime}`,
          existingReservation: `${reservationStart}-${reservationEnd}`,
          reservationId: reservation._id
        });
      }
      
      return hasConflict;
    });
    
    return conflicts;
  }, [reservations, normalizeDate]);

  // Función para verificar si una fecha está completamente ocupada para un área
  const isDateFullyBooked = useCallback((area: string, date: string) => {
    const normalizedDate = normalizeDate(date);
    
    console.log('📅 Verificando fecha completamente ocupada:', {
      area,
      originalDate: date,
      normalizedDate,
      displayDate: formatDateForDisplay(date),
      totalReservations: reservations.length
    });
    
    const areaReservations = reservations.filter(reservation => {
      const reservationDate = normalizeDate(reservation.date);
      
      console.log('📅 Comparando reservación para fecha ocupada:', {
        reservationArea: reservation.area,
        reservationDate: reservation.date,
        reservationDateNormalized: reservationDate,
        reservationDateDisplay: formatDateForDisplay(reservation.date),
        areaMatch: reservation.area === area,
        dateMatch: reservationDate === normalizedDate,
        statusMatch: reservation.status === 'active',
        isMatch: reservation.area === area && reservationDate === normalizedDate && reservation.status === 'active'
      });
      
      return reservation.area === area && 
             reservationDate === normalizedDate && 
             reservation.status === 'active';
    });

    if (areaReservations.length === 0) return false;

    // Obtener información del área
    const areaInfo = areas.find(a => a.name === area);
    const isFullDayReservation = areaInfo?.isFullDayReservation || false;

    // Para HOT DESK (reservas de día completo), verificar capacidad total
    if (isFullDayReservation) {
      const totalCapacity = areaInfo?.capacity || 0;
      const totalReservedSeats = areaReservations.reduce((sum, reservation) => {
        return sum + (reservation.requestedSeats || 1);
      }, 0);
      
      const isFullyBooked = totalReservedSeats >= totalCapacity;
      
      console.log('📅 Verificación HOT DESK (capacidad):', {
        area,
        date,
        totalCapacity,
        totalReservedSeats,
        availableSeats: totalCapacity - totalReservedSeats,
        isFullyBooked
      });
      
      return isFullyBooked;
    }

    // Para salas de reunión, verificar si las reservaciones cubren todo el horario laboral (8:00-18:00)
    const businessHours = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        businessHours.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }

    // Verificar si cada hora del horario laboral está ocupada
    const occupiedHours = new Set();
    areaReservations.forEach(reservation => {
      const start = reservation.startTime;
      const end = reservation.endTime;
      
      // Agregar todas las horas entre start y end
      let currentTime = start;
      while (currentTime < end) {
        occupiedHours.add(currentTime);
        // Avanzar 30 minutos
        const [hours, minutes] = currentTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + 30;
        const newHours = Math.floor(totalMinutes / 60);
        const newMinutes = totalMinutes % 60;
        currentTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
      }
    });

    // Verificar si todas las horas del horario laboral están ocupadas
    const allHoursOccupied = businessHours.every(hour => occupiedHours.has(hour));
    
    console.log('📅 Verificación SALA (horarios):', {
      area,
      date,
      totalReservations: areaReservations.length,
      businessHours: businessHours.length,
      occupiedHours: occupiedHours.size,
      isFullyBooked: allHoursOccupied
    });

    return allHoursOccupied;
  }, [reservations, normalizeDate, areas]);

  // Función para agregar minutos a una hora
  const addMinutesToTime = (time: string, minutes: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  };

  // Función para verificar si una fecha y hora están en el pasado o fuera de horarios de oficina
  const isDateAndTimeInPast = useCallback((date: string, startTime: string): boolean => {
    if (!date || !startTime) return false;
    
    // Crear fecha actual
    const now = new Date();
    
    // Crear fecha de la reservación
    let reservationDate: Date;
    
    if (/^\d{2}-\d{2}-\d{2}$/.test(date)) {
      // Formato DD-MM-YY
      const [day, month, year] = date.split('-').map(Number);
      const fullYear = year < 50 ? 2000 + year : 1900 + year;
      reservationDate = new Date(fullYear, month - 1, day);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // Formato YYYY-MM-DD
      const [year, month, day] = date.split('-').map(Number);
      reservationDate = new Date(year, month - 1, day);
    } else {
      reservationDate = new Date(date);
    }
    
    // Agregar la hora de inicio a la fecha
    const [hours, minutes] = startTime.split(':').map(Number);
    reservationDate.setHours(hours, minutes, 0, 0);
    
    // Verificar si está en el pasado
    const isInPast = reservationDate < now;
    
    // Verificar si está dentro de horarios de oficina
    const isWithinOfficeHoursCheck = isWithinOfficeHours(reservationDate, startTime, state.adminSettings);
    
    console.log('🔍 Validación fecha/hora:', {
      now: now.toISOString(),
      reservationDateTime: reservationDate.toISOString(),
      isInPast,
      isWithinOfficeHours: isWithinOfficeHoursCheck,
      date,
      startTime
    });
    
    return isInPast || !isWithinOfficeHoursCheck;
  }, [state.adminSettings]);

  // Función para verificar si solo una fecha está en el pasado (sin hora)
  const isDateInPast = useCallback((date: string): boolean => {
    if (!date) return false;
    
    // Crear fecha actual local (solo fecha, sin hora)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Crear fecha de la reservación local
    let reservationDate: Date;
    
    if (/^\d{2}-\d{2}-\d{2}$/.test(date)) {
      // Formato DD-MM-YY
      const [day, month, year] = date.split('-').map(Number);
      const fullYear = year < 50 ? 2000 + year : 1900 + year;
      reservationDate = new Date(fullYear, month - 1, day);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // Formato YYYY-MM-DD
      const [year, month, day] = date.split('-').map(Number);
      reservationDate = new Date(year, month - 1, day);
    } else {
      reservationDate = new Date(date);
      // Solo considerar la fecha, no la hora, en local
      reservationDate = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate());
    }
    
    console.log('📅 Validación fecha pasada (LOCAL):', {
      inputDate: date,
      today: today.toISOString(),
      reservationDate: reservationDate.toISOString(),
      todayLocal: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
      reservationDateLocal: new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate()).toISOString(),
      isInPast: reservationDate < today,
      todayDate: today.getDate(),
      todayMonth: today.getMonth(),
      todayYear: today.getFullYear(),
      reservationDate: reservationDate.getDate(),
      reservationMonth: reservationDate.getMonth(),
      reservationYear: reservationDate.getFullYear(),
      comparison: `${reservationDate.toISOString()} < ${today.toISOString()} = ${reservationDate < today}`
    });
    
    return reservationDate < today;
  }, []);

  // Función para obtener la fecha mínima permitida (próximo día de oficina) en formato YYYY-MM-DD
  const getMinDate = useCallback((): string => {
    const today = new Date();
    let currentDate = new Date(today);
    
    // Si hoy es un día de oficina y no es muy tarde, permitir hoy
    if (isOfficeDay(currentDate, state.adminSettings.officeDays)) {
      const now = new Date();
      const currentHour = now.getHours();
      const [officeStartHour] = state.adminSettings.officeHours.start.split(':').map(Number);
      
      // Si es antes del horario de oficina, permitir hoy
      if (currentHour < officeStartHour) {
        const year = currentDate.getFullYear();
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const day = currentDate.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    
    // Buscar el próximo día de oficina
    currentDate.setDate(currentDate.getDate() + 1);
    while (!isOfficeDay(currentDate, state.adminSettings.officeDays)) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [state.adminSettings.officeDays, state.adminSettings.officeHours.start]);

  // Función para obtener horas de inicio disponibles (memoizada)
  const availableStartTimes = useMemo(() => {
    if (!formData.area || !formData.date || !formData.duration) return [];
    
    console.log('🔄 Calculando horarios disponibles para:', {
      area: formData.area,
      date: formData.date,
      displayDate: formatDateForDisplay(formData.date),
      duration: formData.duration,
      durationMinutes: parseInt(formData.duration || '60'),
      totalReservations: reservations.length
    });
    
    const availableTimes = [];
    
    // Usar horarios de oficina configurados
    const [startHour] = state.adminSettings.officeHours.start.split(':').map(Number);
    const [endHour] = state.adminSettings.officeHours.end.split(':').map(Number);
    const interval = 30; // 30 minutos
    const duration = parseInt(formData.duration || '60');
    
    // Solo mostrar logs en desarrollo para evitar spam
    if (process.env.NODE_ENV === 'development') {
      console.log('🕐 Configuración de horarios de oficina para generación:', {
        officeHours: state.adminSettings.officeHours,
        startHour,
        endHour,
        interval,
        duration,
        formData: {
          area: formData.area,
          date: formData.date,
          duration: formData.duration
        }
      });
    }
    
    // Verificar que la fecha seleccionada sea un día de oficina
    const selectedDate = new Date(formData.date);
    if (!isOfficeDay(selectedDate, state.adminSettings.officeDays)) {
      console.log('❌ Fecha seleccionada no es un día de oficina:', {
        date: formData.date,
        selectedDate: selectedDate.toISOString(),
        officeDays: state.adminSettings.officeDays,
        isOfficeDayResult: isOfficeDay(selectedDate, state.adminSettings.officeDays)
      });
      return [];
    }
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const endTime = addMinutesToTime(startTime, duration);
        
        // Verificar si este horario está dentro del horario de oficina
        if (!isOfficeHour(startTime, state.adminSettings.officeHours)) {
          console.log('🏢 Horario fuera del horario de oficina:', startTime);
          continue;
        }
        
        // Verificar si este horario está disponible
        const conflicts = getConflictingReservations(formData.area, formData.date, startTime, endTime, editingReservation?._id);
        
        // Verificar si el horario está en el pasado
        const isInPast = isDateAndTimeInPast(formData.date, startTime);
        
        if (conflicts.length === 0 && !isInPast) {
          availableTimes.push(startTime);
          console.log('✅ Horario disponible:', startTime, 'hasta', endTime, `(${duration} min)`);
        } else if (isInPast) {
          console.log('⏰ Horario en el pasado:', startTime, 'hasta', endTime, `(${duration} min)`);
        } else {
          console.log('❌ Horario no disponible:', startTime, 'hasta', endTime, `(${duration} min)`, 'conflictos:', conflicts.length);
        }
      }
    }
    
    console.log('✅ Horarios disponibles calculados para', duration, 'minutos:', availableTimes);
    return availableTimes;
  }, [formData.area, formData.date, formData.duration, reservations, editingReservation?._id, getConflictingReservations, isDateAndTimeInPast, state.adminSettings.officeDays, state.adminSettings.officeHours]);

  // Verificar si la fecha seleccionada está completamente ocupada
  const isSelectedDateFullyBooked = useMemo(() => {
    if (!formData.area || !formData.date) return false;
    return isDateFullyBooked(formData.area, formData.date);
  }, [formData.area, formData.date, isDateFullyBooked]);



  // Cargar reservaciones al montar el componente
  useEffect(() => {
    loadReservations();
  }, []);

  // Función para obtener las fechas de los próximos 5 días
  const getNext5Days = useCallback(() => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]); // Formato YYYY-MM-DD
    }
    
    return dates;
  }, []);

  // Función para filtrar reservas por los próximos 5 días
  const filterReservationsByNext5Days = useCallback((reservationsList: Reservation[]) => {
    const next5Days = getNext5Days();
    
    return reservationsList.filter(reservation => {
      const reservationDate = normalizeDate(reservation.date);
      return next5Days.includes(reservationDate);
    });
  }, [getNext5Days, normalizeDate]);

  // Actualizar reservaciones filtradas cuando cambien las reservaciones
  useEffect(() => {
    // Por defecto, mostrar solo las reservas de los próximos 5 días
    const filtered = filterReservationsByNext5Days(reservations);
    setFilteredReservations(filtered);
  }, [reservations, filterReservationsByNext5Days]);

  // Función para manejar el cambio de filtros
  const handleFilterChange = (filtered: Reservation[]) => {
    setFilteredReservations(filtered);
    // Si se está usando filtro manual, marcar que no se está aplicando el filtro por defecto
    setIsDefaultFilterApplied(false);
  };

  // useEffect temporal para probar la normalización de fechas
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🧪 Ejecutando pruebas de normalización de fechas...');
      testDateNormalization();
      
      // Pruebas específicas para verificar consistencia
      const testDate = '2025-08-30T00:00:00.000Z';
      const normalized1 = normalizeDateConsistent(testDate);
      const normalized2 = normalizeDateConsistent('2025-08-30');
      const normalized3 = normalizeDateConsistent('30-08-25');
      
      console.log('🔍 Pruebas de consistencia (YYYY-MM-DD):', {
        testDate,
        normalized1,
        normalized2,
        normalized3,
        allEqual: normalized1 === normalized2 && normalized2 === normalized3,
        expectedFormat: '2025-08-30'
      });
      
      // Debug específico del problema
      console.log('🔍 DEBUG: Análisis del problema de normalización...');
      debugDateNormalization();
    }
  }, []);

  // Escuchar evento de clic en horario desde la vista de disponibilidad
  useEffect(() => {
    const handleAvailabilityHourClick = (event: any) => {
      console.log('🎯 Evento recibido:', event);
      
      if (event.detail) {
        const { area, date, hour } = event.detail;
        
        console.log('🎯 Evento de disponibilidad recibido:', { area, date, hour });
        
        // Usar setTimeout para asegurar que el estado se actualice correctamente
        setTimeout(() => {
          // Pre-llenar el formulario con los datos seleccionados
          setFormData(prevData => {
            const newData = {
              ...prevData,
              area: area.name,
              date: date,
              startTime: hour,
              endTime: addMinutesToTime(hour, parseInt(prevData.duration || '60')),
              contactPerson: state.auth.currentUser?.name || '',
              contactEmail: state.auth.currentUser?.email || '',
              teamName: '',
              contactPhone: '',
              templateId: '',
              requestedSeats: area.category === 'SALA' ? area.capacity : 1,
              notes: ''
            };
            
            console.log('📝 Nuevos datos del formulario:', newData);
            return newData;
          });
          
          // Abrir el formulario
          setShowForm(true);
          setEditingReservation(null);
          
          // Limpiar cualquier error previo
          setError(null);
          
          console.log('✅ Formulario pre-llenado y abierto');
        }, 100);
      }
    };

    // Función para manejar el clic en "Nueva Reserva" desde disponibilidad
    const handleNewReservationClick = () => {
      console.log('📡 Evento newReservationClick recibido en Reservations');
      setShowForm(true);
    };

    // Agregar event listeners
    window.addEventListener('availabilityHourClick', handleAvailabilityHourClick);
    window.addEventListener('newReservationClick', handleNewReservationClick);

    // Cleanup
    return () => {
      window.removeEventListener('availabilityHourClick', handleAvailabilityHourClick);
      window.removeEventListener('newReservationClick', handleNewReservationClick);
    };
  }, [state.auth.currentUser, state.areas]);

  // Recargar reservaciones cuando cambie el área, fecha o duración para actualizar horarios disponibles
  useEffect(() => {
    if (formData.area && formData.date) {
      loadReservations();
    }
  }, [formData.area, formData.date, formData.duration]);

  // Limpiar hora de inicio cuando cambien la fecha o duración (solo si no viene de disponibilidad)
  useEffect(() => {
    // Solo limpiar si no hay una hora de inicio ya establecida
    if ((formData.date || formData.duration) && !formData.startTime) {
      setFormData(prev => ({
        ...prev,
        startTime: '',
        endTime: ''
      }));
    }
  }, [formData.date, formData.duration, formData.startTime]);



  const loadReservations = async () => {
    try {
      setIsLoading(true);
      const data = await reservationService.getAllReservations();
      setReservations(data);
      setError(null);
    } catch (error) {
      console.error('Error cargando reservaciones:', error);
      setError('Error al cargar las reservaciones');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('Debe iniciar sesión para crear una reservación');
      return;
    }

    // Verificar si la fecha y hora están en el pasado
    if (!isFullDayReservation && formData.startTime) {
      if (isDateAndTimeInPast(formData.date, formData.startTime)) {
        setError('No se pueden hacer reservaciones en fechas y horarios pasados. Por favor, seleccione una fecha y hora futura.');
        return;
      }
    } else if (isFullDayReservation) {
      // Para reservas de día completo, verificar solo la fecha
      if (isDateInPast(formData.date)) {
        setError('No se pueden hacer reservaciones en fechas pasadas. Por favor, seleccione una fecha futura.');
        return;
      }
    }

    // Verificar que la fecha sea un día de oficina
    if (formData.date) {
      const selectedDate = new Date(formData.date);
      const officeDays = ensureAdminSettings();
      
      console.log('🔍 Validando día de oficina:', {
        selectedDate: selectedDate.toISOString(),
        dayOfWeek: selectedDate.getDay(),
        dayName: selectedDate.toLocaleDateString('en-US', { 
          weekday: 'long',
          timeZone: 'America/Bogota'
        }),
        officeDays: officeDays,
        adminSettings: state.adminSettings,
        isOfficeDay: isOfficeDay(selectedDate, officeDays)
      });
      
      if (!isOfficeDay(selectedDate, officeDays)) {
        console.error('❌ Error: La fecha seleccionada no es un día de oficina');
        setError('La fecha seleccionada no es un día de oficina. Por favor, seleccione un día laboral.');
        return;
      }
    }

    // Verificar que la hora esté dentro del horario de oficina
    if (!isFullDayReservation && formData.startTime) {
      const officeHours = state.adminSettings?.officeHours || { start: '08:00', end: '18:00' };
      
      // Solo mostrar logs en desarrollo para evitar spam
      if (process.env.NODE_ENV === 'development') {
        console.log('🕐 Validación de horario de oficina en submit:', {
          startTime: formData.startTime,
          officeHours,
          isFullDayReservation,
          adminSettings: state.adminSettings,
          isOfficeHourResult: isOfficeHour(formData.startTime, officeHours)
        });
      }
      
      if (!isOfficeHour(formData.startTime, officeHours)) {
        console.warn('⚠️ Hora fuera del horario de oficina:', {
          startTime: formData.startTime,
          officeHours,
          isOfficeHourResult: isOfficeHour(formData.startTime, officeHours)
        });
        setError('La hora seleccionada está fuera del horario de oficina. Por favor, seleccione una hora dentro del horario laboral.');
        return;
      }
    }

    // Verificar límite de duración para usuarios con rol "user"
    if (!isFullDayReservation && currentUser?.role === 'user') {
      const durationMinutes = parseInt(formData.duration || '60');
      if (durationMinutes > 180) {
        setError('Los usuarios con rol "User" solo pueden reservar hasta 3 horas (180 minutos) máximo.');
        return;
      }
    }

    // Verificar si la fecha está completamente ocupada
    if (isSelectedDateFullyBooked) {
      setError('Esta fecha está completamente ocupada. Por favor, seleccione otra fecha.');
      return;
    }

    // Verificar conflictos de horarios antes de enviar
    if (!isFullDayReservation) {
      const conflicts = getConflictingReservations(
        formData.area, 
        formData.date, 
        formData.startTime, 
        formData.endTime, 
        editingReservation?._id
      );
      
      if (conflicts.length > 0) {
        setError('El horario seleccionado ya está reservado. Por favor, seleccione otro horario.');
        return;
      }
    } else {
      // Para reservas por día completo, verificar que no haya ninguna reservación activa
      const existingReservations = reservations.filter(r => 
        r.area === formData.area && 
        r.date === formData.date && 
        r.status === 'active' &&
        r._id !== editingReservation?._id
      );
      
      if (existingReservations.length > 0) {
        setError('Esta área ya está reservada para el día completo seleccionado.');
        return;
      }
    }

    try {
      setIsLoading(true);
      setError(null);

      // Verificar si es una reservación recurrente (solo para admins)
      if (formData.isRecurring && currentUser?.role === 'admin') {
        if (!formData.recurrenceEndDate) {
          setError('Para reservaciones recurrentes, debe especificar una fecha de fin.');
          return;
        }

        // Generar fechas recurrentes
        const recurringDates = generateRecurringDates(
          formData.date,
          formData.recurrenceType,
          formData.recurrenceInterval,
          formData.recurrenceEndDate,
          formData.recurrenceDays
        );

        console.log('📅 Fechas recurrentes generadas:', recurringDates);

        // Crear múltiples reservaciones
        for (const date of recurringDates) {
      const reservationData = {
        userId: currentUser.id,
        userName: currentUser.name,
        ...formData,
          date: date,
          requestedSeats: formData.requestedSeats,
          attendees: formData.attendees
        };

          console.log(`🔍 Creando reservación recurrente para ${date}:`, reservationData);
          await reservationService.createReservation(reservationData);
        }

        console.log(`✅ Se crearon ${recurringDates.length} reservaciones recurrentes`);
      } else {
        // Reservación única
        const reservationData = {
          userId: currentUser.id,
          userName: currentUser.name,
          ...formData,
          requestedSeats: formData.requestedSeats,
          attendees: formData.attendees
        };

        console.log('🔍 Datos de reservación a enviar:', reservationData);

      if (editingReservation) {
        // Actualizar reservación existente
        await reservationService.updateReservation(editingReservation._id, reservationData);
      } else {
        // Crear nueva reservación
        await reservationService.createReservation(reservationData);
        }
      }

      // Recargar reservaciones
      await loadReservations();
      
      // Limpiar formulario
      setFormData({
        area: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        duration: '60',
        contactPerson: currentUser?.name || '',
        teamName: '',
        contactEmail: currentUser?.email || '',
        contactPhone: '',
        templateId: '',
        requestedSeats: 1,
        notes: '',
        colaboradores: [],
        attendees: [],
        // Campos para reservaciones recurrentes (solo para admins)
        isRecurring: false,
        recurrenceType: 'weekly',
        recurrenceInterval: 1,
        recurrenceEndDate: '',
        recurrenceDays: ['monday']
      });
      setShowForm(false);
      setEditingReservation(null);

    } catch (error: any) {
      console.error('Error guardando reservación:', error);
      setError(error.message || 'Error al guardar la reservación');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (reservation: Reservation) => {
    if (!currentUser) {
      setError('Debe iniciar sesión para eliminar una reservación');
      return;
    }

    // Verificar permisos: solo el creador o admin puede eliminar
    const reservationUserId = typeof reservation.userId === 'object' ? reservation.userId._id : reservation.userId;
    const canDelete = currentUser.id === reservationUserId || currentUser.role === 'admin';
    
    if (!canDelete) {
      setError('Solo el creador de la reservación o un administrador puede eliminarla');
      return;
    }

    if (!window.confirm('¿Está seguro de que desea eliminar esta reservación?')) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await reservationService.deleteReservation(reservation._id, currentUser.id);
      await loadReservations();

    } catch (error: any) {
      console.error('Error eliminando reservación:', error);
      setError(error.message || 'Error al eliminar la reservación');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (reservation: Reservation) => {
    setEditingReservation(reservation);
    // Calcular duración basada en startTime y endTime
    const startMinutes = parseInt(reservation.startTime.split(':')[0]) * 60 + parseInt(reservation.startTime.split(':')[1]);
    const endMinutes = parseInt(reservation.endTime.split(':')[0]) * 60 + parseInt(reservation.endTime.split(':')[1]);
    const duration = (endMinutes - startMinutes).toString();
    
    setFormData({
      area: reservation.area,
      date: new Date(reservation.date).toISOString().split('T')[0],
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      duration: duration,
      contactPerson: reservation.contactPerson,
      teamName: reservation.teamName,
      contactEmail: reservation.contactEmail,
      contactPhone: reservation.contactPhone,
      templateId: reservation.templateId || '',
      requestedSeats: reservation.requestedSeats || 1,
      notes: reservation.notes,
      colaboradores: reservation.colaboradores?.map(c => c._id) || [],
      attendees: reservation.attendees || [],
      // Campos para reservaciones recurrentes (solo para admins)
      isRecurring: false,
      recurrenceType: 'weekly',
      recurrenceInterval: 1,
      recurrenceEndDate: '',
      recurrenceDays: ['monday']
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingReservation(null);
    setFormData({
      area: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:00',
      duration: '60',
      contactPerson: currentUser?.name || '',
      teamName: '',
      contactEmail: currentUser?.email || '',
      contactPhone: '',
      templateId: '',
      requestedSeats: 1,
      notes: '',
      colaboradores: [],
      attendees: [],
      // Campos para reservaciones recurrentes (solo para admins)
      isRecurring: false,
      recurrenceType: 'weekly',
      recurrenceInterval: 1,
      recurrenceEndDate: '',
      recurrenceDays: ['monday']
    });
    setError(null);
  };

  const canEditReservation = (reservation: Reservation) => {
    if (!currentUser) return false;
    // Verificar si userId es un objeto (con _id) o un string
    const reservationUserId = typeof reservation.userId === 'object' ? reservation.userId._id : reservation.userId;
    return currentUser.id === reservationUserId || currentUser.role === 'admin';
  };

  const canDeleteReservation = (reservation: Reservation) => {
    if (!currentUser) return false;
    // Verificar si userId es un objeto (con _id) o un string
    const reservationUserId = typeof reservation.userId === 'object' ? reservation.userId._id : reservation.userId;
    return currentUser.id === reservationUserId || currentUser.role === 'admin';
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activa';
      case 'cancelled': return 'Cancelada';
      case 'completed': return 'Completada';
      default: return 'Desconocido';
    }
  };

  // Función para verificar y cargar configuración de admin
  const ensureAdminSettings = () => {
    if (!state.adminSettings || !state.adminSettings.officeDays) {
      console.warn('⚠️ Configuración de admin no encontrada, usando configuración por defecto');
      // Configuración por defecto
      const defaultOfficeDays = {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false
      };
      return defaultOfficeDays;
    }
    return state.adminSettings.officeDays;
  };

  // Cargar configuración de admin al montar el componente
  useEffect(() => {
    console.log('🔍 Configuración de admin cargada:', {
      adminSettings: state.adminSettings,
      officeDays: state.adminSettings?.officeDays,
      officeHours: state.adminSettings?.officeHours
    });
  }, [state.adminSettings]);

  // Función para generar fechas recurrentes
  const generateRecurringDates = (startDate: string, recurrenceType: string, recurrenceInterval: number, recurrenceEndDate: string, recurrenceDays: string[] = []): string[] => {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(recurrenceEndDate);
    
    if (start > end) return dates;
    
    let currentDate = new Date(start);
    
    while (currentDate <= end) {
      let shouldInclude = false;
      
      switch (recurrenceType) {
        case 'daily':
          shouldInclude = true;
          currentDate.setDate(currentDate.getDate() + recurrenceInterval);
          break;
          
        case 'weekly':
          const dayOfWeek = currentDate.toLocaleDateString('en-US', { 
            weekday: 'long',
            timeZone: 'America/Bogota'
          }).toLowerCase();
          if (recurrenceDays.includes(dayOfWeek)) {
            shouldInclude = true;
          }
          currentDate.setDate(currentDate.getDate() + 1);
          break;
          
        case 'monthly':
          shouldInclude = true;
          currentDate.setMonth(currentDate.getMonth() + recurrenceInterval);
          break;
          
        default:
          shouldInclude = true;
          currentDate.setDate(currentDate.getDate() + 1);
      }
      
      if (shouldInclude && currentDate <= end) {
        const year = currentDate.getFullYear();
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const day = currentDate.getDate().toString().padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
      }
    }
    
    return dates;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reservaciones</h1>
          <p className="text-gray-600 mt-2">Gestiona las reservaciones de espacios de trabajo</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
          disabled={isLoading}
        >
          <Plus className="w-5 h-5" />
          Nueva Reservación
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Formulario de Reservación */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {editingReservation ? 'Editar Reservación' : 'Nueva Reservación'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Paso 1: Fecha */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <span className="bg-primary-100 text-primary-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">1</span>
                📅 Fecha de la Reservación
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seleccione la fecha
                </label>
                <input
                  type="date"
                  min={getMinDate()}
                  value={formData.date}
                  onChange={(e) => {
                    const dateValue = e.target.value;
                    if (dateValue) {
                      // Validar que la fecha no esté en el pasado
                      if (isDateInPast(dateValue)) {
                        setError('No se pueden seleccionar fechas pasadas. Por favor, seleccione una fecha futura.');
                        return;
                      }
                      
                      // Validar que sea un día de oficina
                      const selectedDate = new Date(dateValue);
                      if (!isOfficeDay(selectedDate, state.adminSettings.officeDays)) {
                        setError('La fecha seleccionada no es un día de oficina. Por favor, seleccione un día laboral.');
                        return;
                      }
                      
                      // Usar directamente el formato YYYY-MM-DD
                      setFormData({...formData, date: dateValue});
                    } else {
                      setFormData({...formData, date: ''});
                    }
                    setError(null); // Limpiar error cuando cambie la fecha
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    isSelectedDateFullyBooked 
                      ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                      : isDateInPast(formData.date)
                      ? 'border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300 focus:ring-primary-500'
                  }`}
                  required
                />
                {isSelectedDateFullyBooked && (
                  <div className="mt-1 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    Esta fecha está completamente ocupada para {formData.area}
                  </div>
                )}
                {isDateInPast(formData.date) && (
                  <div className="mt-1 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⏰</span>
                    No se pueden seleccionar fechas pasadas
                  </div>
                )}
                {formData.date && !isOfficeDay(new Date(formData.date), state.adminSettings.officeDays) && (
                  <div className="mt-1 text-sm text-red-600 flex items-center">
                    <span className="mr-1">🏢</span>
                    La fecha seleccionada no es un día de oficina
                  </div>
                )}
                {formData.date && (
                  <div className="mt-1 text-sm text-gray-500">
                    Fecha seleccionada: {formData.date} ({formatDateForDisplay(formData.date)})
                  </div>
                )}
              </div>
            </div>

            {/* Paso 2: Área */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <span className="bg-primary-100 text-primary-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">2</span>
                🏢 Tipo de Área
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seleccione el tipo de área
                </label>
                <select
                  value={formData.area}
                  onChange={(e) => handleAreaChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Seleccionar área</option>
                  {areas.map(area => (
                    <option key={area.id} value={area.name}>
                      {area.name} {area.isFullDayReservation ? '(Día completo)' : ''}
                    </option>
                  ))}
                </select>
                
                {/* Información para salas de reunión */}
                {selectedArea && selectedArea.isMeetingRoom && (
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">
                          Reserva de Sala Completa
                        </h3>
                        <div className="mt-1 text-sm text-blue-700">
                          <p>Esta sala se reserva completa para {selectedArea.capacity} personas.</p>
                          <p>No es necesario especificar cantidad de puestos.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </div>

            {/* Paso 3: Cantidad de puestos (solo para áreas que NO son salas) */}
            {selectedArea && !selectedArea.isMeetingRoom && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <span className="bg-primary-100 text-primary-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">3</span>
                  🪑 Cantidad de Puestos
                </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Especifique la cantidad de puestos requeridos
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    max={selectedArea?.capacity || 1}
                    value={formData.requestedSeats}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      const maxCapacity = selectedArea?.capacity || 1;
                      const finalValue = Math.min(Math.max(value, 1), maxCapacity);
                      setFormData({...formData, requestedSeats: finalValue});
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                  <span className="text-sm text-gray-600 whitespace-nowrap">
                    de {getAvailableCapacity(selectedArea?.id || '', formData.date) || 1} disponibles
                  </span>
                </div>
                  <div className="text-xs text-gray-500 mt-1">
                    <span className="text-blue-600 font-medium">
                      Área: {selectedArea.name} • Capacidad: {getAvailableCapacity(selectedArea.id, formData.date)} puestos disponibles
                    </span>
                  </div>
                </div>
                  </div>
                )}

            {/* Paso 4: Nombres de Asistentes (solo para rol user) */}
            {currentUser?.role === 'user' && selectedArea && !selectedArea.isMeetingRoom && formData.requestedSeats > 1 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <span className="bg-primary-100 text-primary-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">4</span>
                  👥 Nombres de Asistentes
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ingrese los nombres de los asistentes (uno por línea)
                  </label>
                  <textarea
                    value={formData.attendees.join('\n')}
                    onChange={(e) => {
                      const names = e.target.value.split('\n').filter(name => name.trim() !== '');
                      setFormData({...formData, attendees: names});
                    }}
                    rows={Math.min(formData.requestedSeats, 5)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder={`Ingrese ${formData.requestedSeats} nombre(s) de asistente(s), uno por línea...`}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    <span className="text-blue-600 font-medium">
                      {formData.attendees.length} de {formData.requestedSeats} asistentes especificados
                    </span>
              </div>
            </div>
              </div>
            )}

            {/* Configuración adicional */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <span className="bg-primary-100 text-primary-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">5</span>
                ⚙️ Configuración Adicional
              </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usar Plantilla (Opcional)
                </label>
                  <select
                    value={formData.templateId}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Sin plantilla</option>
                    {state.templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name} - {template.groupName}
                      </option>
                    ))}
                  </select>
                </div>

                {!isFullDayReservation && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duración (minutos)
                      {currentUser?.role === 'user' && (
                        <span className="text-xs text-orange-600 ml-2">
                          (Máximo 3 horas para usuarios)
                        </span>
                      )}
                    </label>
                    <select
                      value={formData.duration || '60'}
                  onChange={(e) => {
                        const duration = e.target.value;
                        const endTime = addMinutesToTime(formData.startTime, parseInt(duration));
                        setFormData({...formData, duration, endTime});
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                    >
                      {getDurationOptions().map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {formData.startTime && formData.duration && (
                      <div className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Horario seleccionado:</span> {formData.startTime} - {formData.endTime}
                      </div>
                    )}
                  </div>
                )}

                {/* Campo de Colaboradores (solo para usuarios con rol 'user' o 'admin') */}
                {currentUser?.role !== 'colaborador' && colaboradoresDisponibles.length > 0 && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Colaboradores (opcional)
                    </label>
                    <div className="space-y-2">
                      {colaboradoresDisponibles.map(colaborador => (
                        <label key={colaborador.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.colaboradores.includes(colaborador.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  colaboradores: [...prev.colaboradores, colaborador.id]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  colaboradores: prev.colaboradores.filter(id => id !== colaborador.id)
                                }));
                              }
                            }}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">
                            {colaborador.name} ({colaborador.email})
                          </span>
                        </label>
                      ))}
              </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Los colaboradores seleccionados podrán visualizar esta reserva
                    </p>
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Notas adicionales (opcional)"
                  />
                </div>
              </div>
            </div>

            {/* Información de contacto */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <span className="bg-primary-100 text-primary-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">6</span>
                👤 Información de Contacto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Solicitante
                </label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Nombre completo"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento *
                </label>
                <select
                  value={formData.teamName}
                  onChange={(e) => setFormData({...formData, teamName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Seleccione un departamento</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                {departments.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    No hay departamentos disponibles. Contacte al administrador para crear departamentos.
                  </p>
                )}
                {departments.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Seleccione el departamento al que pertenece esta reservación. Los departamentos se gestionan en el panel de administración.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="email@ejemplo.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono <span className="text-gray-500 text-xs">(opcional)</span>
                </label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="+57 300 123 4567 (opcional)"
                />
                </div>
              </div>
              </div>

            {/* Horarios (solo para reservas que no son de día completo) */}
              {!isFullDayReservation && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <span className="bg-primary-100 text-primary-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">7</span>
                  ⏰ Horarios
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hora de Inicio
                    </label>
                    <select
                      value={formData.startTime}
                      onChange={(e) => {
                        const startTime = e.target.value;
                        const duration = parseInt(formData.duration || '60');
                        const endTime = addMinutesToTime(startTime, duration);
                        setFormData({...formData, startTime, endTime});
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value="">Seleccionar hora de inicio</option>
                      {availableStartTimes.map((time, index) => (
                        <option key={index} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm text-gray-500">
                        {availableStartTimes.length} hora{availableStartTimes.length !== 1 ? 's' : ''} disponible{availableStartTimes.length !== 1 ? 's' : ''} para {formData.duration} min
                      </span>
                      {availableStartTimes.length > 0 && (
                        <span className="text-sm text-green-600">
                          ✓ Horarios libres
                        </span>
                      )}
                      {availableStartTimes.length === 0 && formData.area && formData.date && formData.duration && (
                        <span className="text-sm text-red-600">
                          ⚠️ No hay horarios disponibles para {formData.duration} min
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      Horario de oficina: {state.adminSettings.officeHours.start} - {state.adminSettings.officeHours.end}
                    </div>
                  </div>

                  {/* Mostrar reservaciones existentes para la fecha y área seleccionadas */}
                  {formData.area && formData.date && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reservaciones existentes para {formData.area} el {formatDateWithDay(formData.date)}:
                      </label>
                      {(() => {
                        // Debug: Mostrar información de fechas
                        console.log('🔍 Debug - Fechas en reservaciones existentes:', {
                          formDataDate: formData.date,
                          formDataDateFormatted: formatDateWithDay(formData.date),
                          totalReservations: reservations.length,
                          matchingReservations: reservations.filter(r => {
                            const reservationDate = normalizeDate(r.date);
                            const formDate = normalizeDate(formData.date);
                            return r.area === formData.area && reservationDate === formDate && r.status === 'active';
                          }).map(r => ({
                            id: r._id,
                            area: r.area,
                            originalDate: r.date,
                            normalizedDate: normalizeDate(r.date),
                            formattedDate: formatDateWithDay(r.date),
                            startTime: r.startTime,
                            endTime: r.endTime
                          }))
                        });
                        return null;
                      })()}
                      <div className="bg-gray-50 rounded-md p-3 max-h-32 overflow-y-auto">
                        {reservations
                          .filter(r => {
                            const reservationDate = normalizeDate(r.date);
                            const formDate = normalizeDate(formData.date);
                            return r.area === formData.area && reservationDate === formDate && r.status === 'active';
                          })
                          .map((reservation, index) => (
                            <div key={index} className="text-sm text-gray-600 mb-1">
                              <span className="font-medium">
                                {reservation.startTime} - {reservation.endTime}
                              </span>
                              {reservation.notes && ` (${reservation.notes})`}
                            </div>
                          ))}
                        {reservations.filter(r => {
                          const reservationDate = normalizeDate(r.date);
                          const formDate = normalizeDate(formData.date);
                          return r.area === formData.area && reservationDate === formDate && r.status === 'active';
                        }).length === 0 && (
                          <p className="text-sm text-gray-500">No hay reservaciones para esta fecha</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )}

            {/* Información para reservas de día completo */}
              {isFullDayReservation && (
              <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-blue-800">
                      Esta área se reserva por día completo ({formData.startTime} - {formData.endTime})
                      </span>
                    </div>
                  </div>
                </div>
              )}


            {/* Sección de Reservaciones Recurrentes (solo para admins) */}
            {currentUser?.role === 'admin' && (
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center space-x-2 mb-4">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">
                    Crear reservación recurrente
                  </label>
            </div>

                {formData.isRecurring && (
                  <div className="space-y-4 bg-gray-50 p-4 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo de Recurrencia
              </label>
                        <select
                          value={formData.recurrenceType}
                          onChange={(e) => setFormData({...formData, recurrenceType: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="daily">Diaria</option>
                          <option value="weekly">Semanal</option>
                          <option value="monthly">Mensual</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Intervalo
                        </label>
                        <select
                          value={formData.recurrenceInterval}
                          onChange={(e) => setFormData({...formData, recurrenceInterval: parseInt(e.target.value)})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value={1}>Cada 1</option>
                          <option value={2}>Cada 2</option>
                          <option value={3}>Cada 3</option>
                          <option value={4}>Cada 4</option>
                          <option value={5}>Cada 5</option>
                          <option value={6}>Cada 6</option>
                          <option value={7}>Cada 7</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fecha de Fin
                        </label>
                        <input
                          type="date"
                          value={formData.recurrenceEndDate}
                          onChange={(e) => setFormData({...formData, recurrenceEndDate: e.target.value})}
                          min={formData.date}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          required={formData.isRecurring}
                        />
                      </div>
            </div>

                    {formData.recurrenceType === 'weekly' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Días de la Semana
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {[
                            { value: 'monday', label: 'Lunes' },
                            { value: 'tuesday', label: 'Martes' },
                            { value: 'wednesday', label: 'Miércoles' },
                            { value: 'thursday', label: 'Jueves' },
                            { value: 'friday', label: 'Viernes' },
                            { value: 'saturday', label: 'Sábado' },
                            { value: 'sunday', label: 'Domingo' }
                          ].map((day) => (
                            <div key={day.value} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={day.value}
                                checked={formData.recurrenceDays.includes(day.value)}
                                onChange={(e) => {
                                  const newDays = e.target.checked
                                    ? [...formData.recurrenceDays, day.value]
                                    : formData.recurrenceDays.filter(d => d !== day.value);
                                  setFormData({...formData, recurrenceDays: newDays});
                                }}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <label htmlFor={day.value} className="text-sm text-gray-700">
                                {day.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-sm text-gray-600">
                      <p><strong>Vista previa:</strong> Se crearán reservaciones desde {formData.date} hasta {formData.recurrenceEndDate}</p>
                      {formData.recurrenceType === 'weekly' && formData.recurrenceDays.length > 0 && (
                        <p>Días seleccionados: {formData.recurrenceDays.map(day => {
                          const dayNames = {
                            monday: 'Lunes',
                            tuesday: 'Martes',
                            wednesday: 'Miércoles',
                            thursday: 'Jueves',
                            friday: 'Viernes',
                            saturday: 'Sábado',
                            sunday: 'Domingo'
                          };
                          return dayNames[day as keyof typeof dayNames];
                        }).join(', ')}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isLoading || isSelectedDateFullyBooked || isDateInPast(formData.date)}
                className={`flex-1 ${
                  isSelectedDateFullyBooked || isDateInPast(formData.date)
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                    : 'btn-primary'
                }`}
              >
                {isLoading ? 'Guardando...' : (editingReservation ? 'Actualizar' : 'Crear')}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros y Exportación */}
      <ReservationFilters
        reservations={reservations}
        onFilterChange={handleFilterChange}
        onLoadingChange={setIsLoading}
        areas={areas}
      />

      {/* Lista de Reservaciones */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Reservaciones Activas</h3>
        </div>

        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando reservaciones...</p>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No hay reservaciones que coincidan con los filtros</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredReservations.map((reservation) => (
              <div key={reservation._id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">
                        {reservation.area}
                      </h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(reservation.status)}`}>
                        {getStatusText(reservation.status)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span><strong>Solicitante:</strong> {reservation.contactPerson}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDateWithDay(reservation.date)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          {(() => {
                            // Verificar si es HOT DESK (reserva de día completo)
                            const area = areas.find(a => a.name === reservation.area);
                            const isFullDay = area?.isFullDayReservation || false;
                            
                            if (isFullDay) {
                              return 'Día completo';
                            } else {
                              return `${reservation.startTime} - ${reservation.endTime}`;
                            }
                          })()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{reservation.area}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">👥</span>
                        <span><strong>Equipo:</strong> {reservation.teamName}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">📧</span>
                        <span><strong>Email:</strong> {reservation.contactEmail}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">📞</span>
                        <span><strong>Teléfono:</strong> {reservation.contactPhone}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">🪑</span>
                        <span><strong>Puestos:</strong> {reservation.requestedSeats || 1}</span>
                      </div>

                      {reservation.templateId && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">📋</span>
                          <span><strong>Plantilla:</strong> {state.templates.find(t => t.id === reservation.templateId)?.name || 'Plantilla'}</span>
                        </div>
                      )}

                      {reservation.createdBy && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">👤</span>
                          <span><strong>Creado por:</strong> {reservation.createdBy.userName} ({reservation.createdBy.userRole})</span>
                        </div>
                      )}
                      
                      {reservation.colaboradores && reservation.colaboradores.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">👥</span>
                          <span><strong>Colaboradores:</strong> {reservation.colaboradores.map(c => c.name).join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {reservation.notes && (
                      <div className="mt-3 flex items-start gap-2">
                        <FileText className="w-4 h-4 mt-0.5 text-gray-400" />
                        <p className="text-sm text-gray-600">{reservation.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    {canEditReservation(reservation) && (
                      <button
                        onClick={() => handleEdit(reservation)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Editar reservación"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    
                    {canDeleteReservation(reservation) && (
                      <button
                        onClick={() => handleDelete(reservation)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Eliminar reservación"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
