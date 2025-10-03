import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, Edit, Calendar, Clock, MapPin, User, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { reservationService, departmentService } from '../services/api';
import { isWithinOfficeHours, isValidReservationDate, isOfficeDay, isOfficeHour, createLocalDate, formatDateToString } from '../utils/unifiedDateUtils';
import { normalizeDateConsistent, testDateNormalization, debugDateNormalization } from '../utils/dateConversionUtils';
import { ReservationFilters } from './ReservationFilters';
import { DatePicker } from './DatePicker';
import { Department, Reservation } from '../types';

interface ReservationFormData {
  area: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  teamName: string;
  requestedSeats: number;
  notes: string;
  colaboradores: string[]; // Array de IDs de colaboradores
  // Campos para reservaciones recurrentes (solo para admins)
  isRecurring: boolean;
  recurrenceType: 'daily' | 'weekly' | 'monthly' | 'custom';
  recurrenceInterval: number; // Cada X días/semanas/meses
  recurrenceEndDate: string; // Fecha de fin de la recurrencia
  recurrenceDays: string[]; // Para recurrencia semanal: ['monday', 'tuesday', etc.]
}

export function Reservations() {
  const { state, dispatch, getDailyCapacity } = useApp();
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
  const [viewingReservation, setViewingReservation] = useState<Reservation | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'createdAt' | 'area' | 'team'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const [isDefaultFilterApplied, setIsDefaultFilterApplied] = useState(false);
  
  // Debounce para evitar peticiones excesivas
  const [loadReservationsTimeout, setLoadReservationsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  // Debug: Log del estado de departamentos
  console.log('🔍 Estado actual de departments:', departments);
  console.log('🔍 Cantidad de departamentos:', departments.length);
  console.log('🔍 ¿Array vacío?', departments.length === 0);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);

  const [formData, setFormData] = useState<ReservationFormData>({
    area: '',
    date: (() => {
      // Inicializar con la fecha actual en formato YYYY-MM-DD usando fechas locales
      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    })(),
    startTime: '09:00',
    endTime: '10:00',
    duration: '60',
    teamName: '',
    requestedSeats: 1,
    notes: '',
    colaboradores: [],
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


  // Obtener áreas del contexto
  const areas = state.areas;
  
  // Obtener usuarios colaboradores disponibles filtrados por departamento
  const getCollaboratorsByDepartment = (departmentName: string) => {
    return state.users.filter(user => 
      user.isActive && 
      user.department === departmentName
    );
  };

  const colaboradoresDisponibles = formData.teamName ? 
    getCollaboratorsByDepartment(formData.teamName) : 
    state.users.filter(user => user.isActive);

  // Función para manejar la selección de colaboradores
  const handleCollaboratorSelection = (collaboratorId: string, isSelected: boolean) => {
    if (isSelected) {
      // Agregar colaborador (sin restricción de cantidad de puestos)
      setSelectedCollaborators([...selectedCollaborators, collaboratorId]);
    } else {
      // Remover colaborador
      setSelectedCollaborators(selectedCollaborators.filter(id => id !== collaboratorId));
    }
  };

  // Función para limpiar colaboradores seleccionados cuando cambia el departamento
  const handleDepartmentChange = (departmentName: string) => {
    setFormData({...formData, teamName: departmentName});
    // Al cambiar departamento, seleccionar automáticamente todos los colaboradores
    const newCollaborators = getCollaboratorsByDepartment(departmentName);
    setSelectedCollaborators(newCollaborators.map(c => c.id));
  };

  // Función para seleccionar todos los colaboradores
  const handleSelectAll = () => {
    const allCollaborators = colaboradoresDisponibles.map(c => c.id);
    setSelectedCollaborators(allCollaborators);
  };

  // Función para deseleccionar todos los colaboradores
  const handleDeselectAll = () => {
    setSelectedCollaborators([]);
  };

  // Cargar departamentos disponibles al montar el componente
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        console.log('🔄 Cargando departamentos...');
        const depts = await departmentService.getDepartments();
        console.log('✅ Departamentos cargados:', depts);
        setDepartments(depts);
      } catch (error) {
        console.error('❌ Error cargando departamentos:', error);
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

  // Validar y ajustar duración para usuarios con rol "lider"
  useEffect(() => {
    if (currentUser?.role === 'lider' && !isFullDayReservation) {
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
      
      // Verificar que la reservación esté activa o confirmada
      if (reservation.status !== 'confirmed' && reservation.status !== 'active') return false;
      
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
        statusMatch: reservation.status === 'confirmed' || reservation.status === 'active',
        isMatch: reservation.area === area && reservationDate === normalizedDate && (reservation.status === 'confirmed' || reservation.status === 'active')
      });
      
      return reservation.area === area && 
             reservationDate === normalizedDate && 
             (reservation.status === 'confirmed' || reservation.status === 'active');
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
    
    // Crear fecha actual UTC
    const now = new Date();
    
    // Crear fecha de la reservación en UTC
    let reservationDate: Date;
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // Formato YYYY-MM-DD
      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = startTime.split(':').map(Number);
      // Crear fecha UTC directamente
      reservationDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
    } else {
      return false; // Formato no soportado
    }
    
    // Verificar si está en el pasado
    const isInPast = reservationDate < now;
    
    // Verificar si está dentro de horarios de oficina
    const isWithinOfficeHoursCheck = isWithinOfficeHours(reservationDate, startTime, state.adminSettings);
    
    console.log('🔍 Validación fecha/hora (UTC):', {
      now: now.toISOString(),
      reservationDateTime: reservationDate.toISOString(),
      isInPast,
      isWithinOfficeHours: isWithinOfficeHoursCheck,
      date,
      startTime
    });
    
    return isInPast || !isWithinOfficeHoursCheck;
  }, [state.adminSettings]);

  // Función para verificar si solo una fecha está en el pasado (sin hora) usando fechas locales
  const isDateInPast = useCallback((date: string): boolean => {
    if (!date) return false;
    
    // Crear fecha actual local (inicio del día)
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // Crear fecha de la reservación local usando el sistema unificado
    const reservationDate = createLocalDate(date);
    reservationDate.setHours(0, 0, 0, 0);
    
    console.log('📅 Validación fecha pasada (LOCAL UNIFICADO):', {
      inputDate: date,
      now: now.toISOString(),
      nowLocal: now.toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
      reservationDate: reservationDate.toISOString(),
      reservationDateLocal: reservationDate.toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
      isInPast: reservationDate < now,
      comparison: `${reservationDate.toISOString()} < ${now.toISOString()} = ${reservationDate < now}`
    });
    
    return reservationDate < now;
  }, []);

  // Función para obtener la fecha mínima permitida (próximo día de oficina) en formato YYYY-MM-DD usando fechas locales
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
        return formatDateToString(currentDate);
      }
    }
    
    // Buscar el próximo día de oficina
    currentDate.setDate(currentDate.getDate() + 1);
    while (!isOfficeDay(currentDate, state.adminSettings.officeDays)) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return formatDateToString(currentDate);
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
    // Crear fecha local usando el sistema unificado
    const selectedDate = createLocalDate(formData.date);
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



  // Función para cargar reservaciones con debounce
  const loadReservations = useCallback(async () => {
    // Cancelar petición anterior si existe
    if (loadReservationsTimeout) {
      clearTimeout(loadReservationsTimeout);
    }

    // Crear nuevo timeout
    const timeout = setTimeout(async () => {
    try {
      setIsLoading(true);
      const data = await reservationService.getAllReservations();
      setReservations(data);
        // Actualizar también el estado global para que otros componentes vean los cambios
        dispatch({ type: 'SET_RESERVATIONS', payload: data });
      setError(null);
        
        // Log para debug
        console.log('🔄 [Reservations] Estado global actualizado:', {
          totalReservations: data.length,
          hotDeskReservations: data.filter(r => r.area === 'Hot Desk').length
        });
        
        // Disparar evento personalizado para notificar a otros componentes
        window.dispatchEvent(new CustomEvent('reservationsUpdated', {
          detail: { reservations: data }
        }));
    } catch (error) {
      console.error('Error cargando reservaciones:', error);
      setError('Error al cargar las reservaciones');
    } finally {
      setIsLoading(false);
    }
    }, 300); // Debounce de 300ms

    setLoadReservationsTimeout(timeout);
  }, [loadReservationsTimeout, dispatch]);

  // Cargar reservaciones al montar el componente
  useEffect(() => {
    loadReservations();
    
    // Cleanup del timeout al desmontar
    return () => {
      if (loadReservationsTimeout) {
        clearTimeout(loadReservationsTimeout);
      }
    };
  }, [loadReservations, loadReservationsTimeout]);

  // Función para obtener las fechas de los próximos 5 días
  // const getNext5Days = useCallback(() => {
  //   const dates = [];
  //   const today = new Date();
  //   
  //   for (let i = 0; i < 5; i++) {
  //     const date = new Date(today);
  //     date.setDate(today.getDate() + i);
  //     dates.push(date.toISOString().split('T')[0]); // Formato YYYY-MM-DD
  //   }
  //   
  //   return dates;
  // }, []);

  // Función para filtrar reservas por los próximos 5 días (comentada - no se usa por defecto)
  // const filterReservationsByNext5Days = useCallback((reservationsList: Reservation[]) => {
  //   const next5Days = getNext5Days();
  //   
  //   return reservationsList.filter(reservation => {
  //     const reservationDate = normalizeDate(reservation.date);
  //     return next5Days.includes(reservationDate);
  //   });
  // }, [getNext5Days, normalizeDate]);

  // Función para ordenar reservaciones
  const sortReservations = useCallback((reservationsList: Reservation[]) => {
    return [...reservationsList].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'createdAt':
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          comparison = dateA - dateB;
          break;
        case 'date':
          const reservationDateA = createLocalDate(a.date).getTime();
          const reservationDateB = createLocalDate(b.date).getTime();
          comparison = reservationDateA - reservationDateB;
          break;
        case 'area':
          comparison = a.area.localeCompare(b.area);
          break;
        case 'team':
          comparison = a.teamName.localeCompare(b.teamName);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [sortBy, sortOrder]);

  // Actualizar reservaciones filtradas cuando cambien las reservaciones o el ordenamiento
  useEffect(() => {
    // Por defecto, mostrar todas las reservaciones (sin filtro)
    const sorted = sortReservations(reservations);
    setFilteredReservations(sorted);
  }, [reservations, sortReservations]);

  // Función para manejar el cambio de filtros
  const handleFilterChange = (filtered: Reservation[]) => {
    const sorted = sortReservations(filtered);
    setFilteredReservations(sorted);
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
              teamName: '',
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

    // Función para manejar el clic en área desde disponibilidad
    const handleAreaClick = (event: CustomEvent) => {
      console.log('📡 Evento areaClick recibido en Reservations:', event.detail);
      const { area, date } = event.detail;
      
      // Preseleccionar el área y la fecha
      setFormData(prev => ({
        ...prev,
        area: area.name,
        date: date
      }));
      
      // Abrir el formulario
      setShowForm(true);
    };

    // Agregar event listeners
    window.addEventListener('availabilityHourClick', handleAvailabilityHourClick);
    window.addEventListener('newReservationClick', handleNewReservationClick);
    window.addEventListener('areaClick', handleAreaClick as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('availabilityHourClick', handleAvailabilityHourClick);
      window.removeEventListener('newReservationClick', handleNewReservationClick);
      window.removeEventListener('areaClick', handleAreaClick as EventListener);
    };
  }, [state.auth.currentUser]);

  // Recargar reservaciones cuando cambie el área, fecha o duración para actualizar horarios disponibles
  // Comentado para evitar peticiones excesivas - las reservaciones se cargan al montar el componente
  // useEffect(() => {
  //   if (formData.area && formData.date) {
  //     loadReservations();
  //   }
  // }, [formData.area, formData.date, formData.duration]);

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
      // Crear fecha local usando el sistema unificado
      const selectedDate = createLocalDate(formData.date);
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
        isOfficeDay: isOfficeDay(selectedDate, officeDays),
        // Debug adicional
        formDataDate: formData.date,
        selectedDateString: selectedDate.toString(),
        selectedDateDay: selectedDate.getDay(),
        officeDaysMonday: officeDays.monday,
        stateAdminSettings: state.adminSettings,
        stateOfficeDays: state.adminSettings?.officeDays
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

    // Verificar límite de duración para usuarios con rol "lider"
    if (!isFullDayReservation && currentUser?.role === 'lider') {
      const durationMinutes = parseInt(formData.duration || '60');
      if (durationMinutes > 180) {
        setError('Los usuarios con rol "Lider" solo pueden reservar hasta 3 horas (180 minutos) máximo.');
        return;
      }
    }

    // Verificar cantidad mínima de personas para Hot Desk
    if (!selectedArea?.isMeetingRoom && formData.requestedSeats < 1) {
      setError('Debe reservar al menos 1 puesto para Hot Desk. Por favor, ingrese una cantidad válida.');
      return;
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
        (r.status === 'confirmed' || r.status === 'active') &&
        r._id !== editingReservation?._id
      );
      
      if (existingReservations.length > 0) {
        setError('Esta área ya está reservada para el día completo seleccionado.');
        return;
      }
    }

    // Validar que se haya seleccionado al menos 1 colaborador (solo para Hot Desk, no para salas)
    if (!selectedArea?.isMeetingRoom && selectedCollaborators.length === 0) {
      setError('Debe seleccionar al menos 1 colaborador para la reserva.');
      return;
    }

    // Validar que la cantidad de colaboradores sea igual a la cantidad de puestos reservados
    if (!selectedArea?.isMeetingRoom && selectedCollaborators.length !== formData.requestedSeats) {
      setError(`La cantidad de colaboradores seleccionados (${selectedCollaborators.length}) debe ser igual a la cantidad de puestos reservados (${formData.requestedSeats}).`);
      return;
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
        area: formData.area,
        date: date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        duration: formData.duration,
        teamName: formData.teamName,
        requestedSeats: formData.requestedSeats,
        notes: formData.notes,
        colaboradores: selectedCollaborators
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
          area: formData.area,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          duration: formData.duration,
          teamName: formData.teamName,
          requestedSeats: formData.requestedSeats,
          notes: formData.notes,
          colaboradores: selectedCollaborators
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

      // Recargar reservaciones y actualizar estado global
      await loadReservations();
      
      // Limpiar formulario
      setFormData({
        area: '',
        date: (() => {
          const today = new Date();
          const year = today.getFullYear();
          const month = (today.getMonth() + 1).toString().padStart(2, '0');
          const day = today.getDate().toString().padStart(2, '0');
          return `${year}-${month}-${day}`;
        })(),
        startTime: '09:00',
        endTime: '10:00',
        duration: '60',
        teamName: '',
        requestedSeats: 1,
        notes: '',
        colaboradores: [],
        // Campos para reservaciones recurrentes (solo para admins)
        isRecurring: false,
        recurrenceType: 'weekly',
        recurrenceInterval: 1,
        recurrenceEndDate: '',
        recurrenceDays: ['monday']
      });
      setSelectedCollaborators([]);
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

    // Verificar permisos: solo administradores pueden eliminar
    if (currentUser.role !== 'admin') {
      setError('Solo los administradores pueden eliminar reservaciones');
      return;
    }

    if (!window.confirm('¿Está seguro de que desea eliminar esta reservación?')) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Log detallado antes de eliminar
      console.log('🗑️ ELIMINANDO RESERVACIÓN:', {
        timestamp: new Date().toISOString(),
        deletedBy: {
          id: currentUser.id,
          name: currentUser.name,
          username: currentUser.username,
          role: currentUser.role
        },
        reservation: {
          id: reservation._id,
          area: reservation.area,
          date: reservation.date,
          startTime: reservation.startTime,
          endTime: reservation.endTime,
          teamName: reservation.teamName,
          requestedSeats: reservation.requestedSeats,
          status: reservation.status,
          createdAt: reservation.createdAt,
          createdBy: reservation.createdBy,
          colaboradores: reservation.colaboradores,
          attendees: reservation.attendees
        }
      });

      await reservationService.deleteReservation(reservation._id, currentUser.id);
      await loadReservations();

      // Log de confirmación
      console.log('✅ RESERVACIÓN ELIMINADA EXITOSAMENTE:', {
        timestamp: new Date().toISOString(),
        deletedBy: currentUser.username,
        reservationId: reservation._id,
        area: reservation.area,
        date: reservation.date
      });

    } catch (error: any) {
      console.error('❌ Error eliminando reservación:', error);
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
      date: formatDateToString(new Date(reservation.date)),
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      duration: duration,
      teamName: reservation.teamName,
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
    setSelectedCollaborators(reservation.colaboradores?.map(c => c._id) || []);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingReservation(null);
    setSelectedCollaborators([]);
    setFormData({
      area: '',
      date: (() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      })(),
      startTime: '09:00',
      endTime: '10:00',
      duration: '60',
      teamName: '',
      requestedSeats: 1,
      notes: '',
      colaboradores: [],
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
    // Deshabilitar edición de reservas una vez guardadas
    return false;
  };

  const canDeleteReservation = (reservation: Reservation) => {
    if (!currentUser) return false;
    // Solo administradores pueden eliminar reservas
    return currentUser.role === 'admin';
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Función para abrir la vista completa de la reservación
  const handleViewReservation = (reservation: Reservation) => {
    setViewingReservation(reservation);
  };

  // Función para cerrar la vista de reservación
  const handleCloseView = () => {
    setViewingReservation(null);
  };

  // Función para cambiar el criterio de ordenamiento
  const handleSortChange = (newSortBy: 'date' | 'createdAt' | 'area' | 'team') => {
    if (sortBy === newSortBy) {
      // Si es el mismo criterio, cambiar el orden
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Si es un criterio diferente, establecerlo y usar desc por defecto
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  // Función auxiliar para manejar valores undefined/null
  // Función auxiliar mejorada para manejar valores undefined/null/unknown
  const safeValue = (value: any, fallback: string = 'N/A'): string => {
    if (value === null || value === undefined || value === '' || value === 'null' || value === 'undefined') {
      return fallback;
    }
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      // Solo reemplazar si es exactamente "unknown", "null", "undefined" o vacío
      if (lowerValue === 'unknown' || lowerValue === 'null' || lowerValue === 'undefined' || lowerValue === '') {
        return fallback;
      }
      // Para emails con "unknown@", usar un fallback más específico
      if (lowerValue.includes('unknown@') && fallback === 'N/A') {
        return 'Email no disponible';
      }
    }
    return String(value);
  };

  // Función para formatear fechas
  const formatDate = (dateString: any): string => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  // Función para obtener información del usuario real
  const getUserInfo = (userId: string): { name: string; email: string; role: string; cedula: string } => {
    const user = state.users.find(u => u.id === userId || u._id === userId);
    if (user) {
      return {
        name: safeValue(user.name),
        email: safeValue(user.email),
        role: safeValue(user.role),
        cedula: safeValue(user.cedula)
      };
    }
    return { name: 'Usuario no encontrado', email: 'N/A', role: 'N/A', cedula: 'N/A' };
  };

  // Función para mostrar información debug detallada
  const showDebugInfo = (reservation: Reservation) => {
    console.log('🔍 Verificando información debug para reservación:', {
      reservationId: reservation.reservationId,
      _id: reservation._id,
      hasDebug: !!reservation.debug,
      debugKeys: reservation.debug ? Object.keys(reservation.debug) : []
    });

    // Log detallado del debug object
    if (reservation.debug) {
      console.log('🔍 Debug object completo:', reservation.debug);
      console.log('🔍 systemInfo:', reservation.debug.systemInfo);
      console.log('🔍 userInfo:', reservation.debug.userInfo);
      console.log('🔍 dateProcessing:', reservation.debug.dateProcessing);
      console.log('🔍 areaInfo:', reservation.debug.areaInfo);
    }

    if (!reservation.debug) {
      console.log('No hay información debug disponible para esta reservación');
      
      // Mostrar información básica de la reservación aunque no tenga debug
      const basicInfo = `
🔍 INFORMACIÓN BÁSICA DE LA RESERVACIÓN
═══════════════════════════════════════

📋 INFORMACIÓN BÁSICA
─────────────────────
ID de Reservación: ${reservation.reservationId || 'N/A'}
ID de Base de Datos: ${reservation._id}
Fecha de Creación: ${reservation.createdAt || 'N/A'}

👤 INFORMACIÓN DEL USUARIO
──────────────────────────
Usuario: ${reservation.userName || 'N/A'}
Área: ${reservation.area || 'N/A'}
Equipo: ${reservation.teamName || 'N/A'}

📅 INFORMACIÓN DE LA RESERVA
────────────────────────────
Fecha: ${reservation.date || 'N/A'}
Hora Inicio: ${reservation.startTime || 'N/A'}
Hora Fin: ${reservation.endTime || 'N/A'}
Puestos Solicitados: ${reservation.requestedSeats || 0}
Estado: ${reservation.status || 'N/A'}

👥 COLABORADORES
────────────────
${reservation.colaboradores?.map((c, i) => `${i + 1}. ${c.name || c}`).join('\n') || 'Ninguno'}

📝 NOTAS
────────
${reservation.notes || 'Sin notas'}

⚠️ INFORMACIÓN DEBUG
────────────────────
Esta reservación fue creada antes de implementar el sistema de debug mejorado.
Para ver información debug detallada, crea una nueva reservación.

═══════════════════════════════════════
`;
      
      alert(basicInfo);
      return;
    }

    console.log('🔍 INFORMACIÓN DEBUG COMPLETA DE LA RESERVACIÓN:', {
      reservationId: reservation.reservationId,
      _id: reservation._id,
      debug: reservation.debug
    });

    const debug = reservation.debug as any; // Type assertion para compatibilidad con estructura antigua y nueva
    
    // Crear información debug estructurada (compatible con estructura antigua y nueva)
    const debugInfo = `
🔍 INFORMACIÓN DEBUG DETALLADA
═══════════════════════════════════════

📋 INFORMACIÓN BÁSICA
─────────────────────
ID de Reservación: ${safeValue(reservation.reservationId)}
ID de Base de Datos: ${safeValue(reservation._id)}
Versión del Sistema: ${safeValue(debug.systemInfo?.version, '1.0.0')}
ID de Request: ${safeValue(debug.systemInfo?.requestId)}

👤 INFORMACIÓN DEL USUARIO
──────────────────────────
Creador: ${(() => {
  const creatorId = debug.userInfo?.creator?.id;
  const creatorInfo = creatorId ? getUserInfo(creatorId) : {
    name: safeValue(debug.userInfo?.creator?.name || reservation.userName),
    email: safeValue(debug.userInfo?.creator?.email),
    role: safeValue(debug.userInfo?.creator?.role),
    cedula: safeValue(debug.userInfo?.creator?.cedula)
  };
  return creatorInfo.name;
})()}
Email: ${(() => {
  const creatorId = debug.userInfo?.creator?.id;
  const creatorInfo = creatorId ? getUserInfo(creatorId) : {
    name: safeValue(debug.userInfo?.creator?.name || reservation.userName),
    email: safeValue(debug.userInfo?.creator?.email),
    role: safeValue(debug.userInfo?.creator?.role),
    cedula: safeValue(debug.userInfo?.creator?.cedula)
  };
  return creatorInfo.email;
})()}
Rol: ${(() => {
  const creatorId = debug.userInfo?.creator?.id;
  const creatorInfo = creatorId ? getUserInfo(creatorId) : {
    name: safeValue(debug.userInfo?.creator?.name || reservation.userName),
    email: safeValue(debug.userInfo?.creator?.email),
    role: safeValue(debug.userInfo?.creator?.role),
    cedula: safeValue(debug.userInfo?.creator?.cedula)
  };
  return creatorInfo.role;
})()}
Cédula: ${(() => {
  const creatorId = debug.userInfo?.creator?.id;
  const creatorInfo = creatorId ? getUserInfo(creatorId) : {
    name: safeValue(debug.userInfo?.creator?.name || reservation.userName),
    email: safeValue(debug.userInfo?.creator?.email),
    role: safeValue(debug.userInfo?.creator?.role),
    cedula: safeValue(debug.userInfo?.creator?.cedula)
  };
  return creatorInfo.cedula;
})()}

👥 COLABORADORES (${debug.userInfo?.collaborators?.length || 0})
${debug.userInfo?.collaborators?.map((c: any, i: number) => {
  const userInfo = getUserInfo(c.id || c);
  return `${i + 1}. ${userInfo.name} (${safeValue(c.role || userInfo.role)})`;
}).join('\n') || 'Ninguno'}

📅 INFORMACIÓN DE FECHAS
────────────────────────
Fecha de Creación: ${formatDate(debug.systemInfo?.createdAt || reservation.createdAt)}
Fecha Reservada: ${formatDate(debug.dateProcessing?.original?.dateString || reservation.date)}
Fecha UTC: ${formatDate(debug.dateProcessing?.utc?.reservationDate)}
Hora Inicio: ${safeValue(debug.dateProcessing?.original?.startTimeString || reservation.startTime)}
Hora Fin: ${safeValue(debug.dateProcessing?.original?.endTimeString || reservation.endTime)}
Día de la Semana: ${safeValue(debug.dateProcessing?.validation?.dayName)}
Zona Horaria: ${safeValue(debug.dateProcessing?.utc?.timezone || debug.systemInfo?.timezone, 'America/Bogota')}
User Agent: ${safeValue(debug.systemInfo?.userAgent || debug.metadata?.userAgent)}
Es Día de Oficina: ${debug.dateProcessing?.validation?.isOfficeDay ? 'Sí' : 'No'}
Es Fecha Futura: ${debug.dateProcessing?.validation?.isFutureDate ? 'Sí' : 'No'}

🏢 INFORMACIÓN DEL ÁREA
────────────────────────
Área: ${safeValue(debug.areaInfo?.areaName || reservation.area)}
Tipo: ${safeValue(debug.areaInfo?.areaType)}
Capacidad Total: ${safeValue(debug.areaInfo?.capacity, '50')}
Puestos Solicitados: ${safeValue(debug.areaInfo?.requestedSeats || debug.inputData?.processed?.finalRequestedSeats || reservation.requestedSeats, '0')}
Puestos Disponibles: ${safeValue(debug.areaInfo?.availableSeats, '0')}
Tasa de Utilización: ${safeValue(debug.areaInfo?.utilizationRate, '0%')}

✅ VALIDACIONES REALIZADAS
──────────────────────────
Campos Requeridos: ${Object.entries(debug.validations?.requiredFields || {}).map(([key, value]) => `${key}: ${value ? '✓' : '✗'}`).join(', ')}
Reglas de Negocio: ${Object.entries(debug.validations?.businessRules || {}).map(([key, value]) => `${key}: ${value ? '✓' : '✗'}`).join(', ')}
Validación de Capacidad: ${Object.entries(debug.validations?.capacityValidation || {}).map(([key, value]) => `${key}: ${value}`).join(', ')}

📊 INFORMACIÓN DE LA RESERVA
────────────────────────────
Duración: ${debug.reservationInfo?.duration?.durationHours || 0} horas (${debug.reservationInfo?.duration?.durationMinutes || 0} minutos)
Total Participantes: ${debug.reservationInfo?.participants?.total || 0}
Colaboradores: ${debug.reservationInfo?.participants?.collaborators || 0}
Asistentes: ${debug.reservationInfo?.participants?.attendees || 0}

🌐 METADATOS DE LA REQUEST
──────────────────────────
IP: ${safeValue(debug.metadata?.ipAddress)}
Referer: ${safeValue(debug.metadata?.referer)}
Idioma: ${safeValue(debug.metadata?.acceptLanguage)}
Método: ${safeValue(debug.metadata?.requestMethod)}
URL: ${safeValue(debug.metadata?.requestUrl)}
Timestamp: ${debug.metadata?.timestamp ? formatDate(debug.metadata.timestamp) : 'N/A'}

═══════════════════════════════════════
`;

    // Mostrar en alert (limitado por tamaño)
    if (debugInfo.length > 2000) {
      // Si es muy largo, mostrar en consola y alert resumido
      console.log(debugInfo);
      alert(`🔍 Información debug completa mostrada en consola (F12)\n\nResumen:\nID: ${reservation.reservationId}\nCreador: ${debug.userInfo?.creator?.name}\nÁrea: ${debug.areaInfo?.areaName}\nFecha: ${debug.dateProcessing?.original?.dateString}\nPuestos: ${debug.areaInfo?.requestedSeats}/${debug.areaInfo?.capacity}`);
    } else {
      alert(debugInfo);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmada';
      case 'active': return 'Activa';
      case 'completed': return 'Cumplida';
      case 'pending': return 'Pendiente';
      case 'cancelled': return 'Cancelada';
      default: return 'Desconocido';
    }
  };

  // Función para verificar y cargar configuración de admin
  const ensureAdminSettings = () => {
    console.log('🔍 ensureAdminSettings debug:', {
      stateAdminSettings: state.adminSettings,
      hasOfficeDays: !!state.adminSettings?.officeDays,
      officeDays: state.adminSettings?.officeDays
    });
    
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
      console.log('🔍 Usando configuración por defecto:', defaultOfficeDays);
      return defaultOfficeDays;
    }
    console.log('🔍 Usando configuración del estado:', state.adminSettings.officeDays);
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
            {/* Paso 1: Fecha, Tipo de Área y Departamento */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <span className="bg-primary-100 text-primary-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">1</span>
                📅 Información Básica de la Reservación
              </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Fecha - Izquierda */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de la Reservación *
                  </label>
                  <DatePicker
                    value={formData.date}
                    onChange={(dateValue) => {
                      if (dateValue) {
                        // Validar que la fecha no esté en el pasado
                        if (isDateInPast(dateValue)) {
                          setError('No se pueden seleccionar fechas pasadas. Por favor, seleccione una fecha futura.');
                          return;
                        }
                        
                        // Validar que sea un día de oficina
                        const selectedDate = createLocalDate(dateValue);
                        if (!isOfficeDay(selectedDate, state.adminSettings.officeDays)) {
                          setError('La fecha seleccionada no es un día de oficina. Por favor, seleccione un día laboral.');
                          return;
                        }
                      }
                      
                      setFormData(prev => ({
                        ...prev,
                        date: dateValue,
                        startTime: '', // Limpiar hora al cambiar fecha
                        endTime: ''
                      }));
                      setError(null); // Limpiar error cuando cambie la fecha
                    }}
                    minDate={getMinDate()}
                    placeholder="Seleccionar fecha de reservación"
                    error={isSelectedDateFullyBooked || isDateInPast(formData.date)}
                    className="w-full"
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
                  {formData.date && !isOfficeDay(createLocalDate(formData.date), state.adminSettings.officeDays) && (
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

                {/* Tipo de Área - Medio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Área *
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

                {/* Departamento - Derecha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departamento *
                </label>
                {(() => {
                  console.log('🎯 Renderizando select de departamentos con', departments.length, 'departamentos');
                  return null;
                })()}
                <select
                    value={formData.teamName}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Seleccione un departamento</option>
                    {departments.map((dept) => {
                      console.log('🏢 Renderizando departamento:', dept);
                      return (
                        <option key={dept._id} value={dept.name}>
                          {dept.name}
                    </option>
                      );
                    })}
                </select>
                  {departments.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        No hay departamentos disponibles. Contacte al administrador para crear departamentos.
                      </p>
                    )}
                </div>
              </div>
              </div>

            {/* Paso 2: Cantidad de Personas o Duración */}
            {selectedArea && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <span className="bg-primary-100 text-primary-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">2</span>
                  📊 Configuración de la Reservación
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cantidad de Personas - Solo para Hot Desk */}
                  {!selectedArea.isMeetingRoom && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cantidad de Personas *
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                          min="0"
                    max={selectedArea?.capacity || 1}
                    value={formData.requestedSeats}
                    onChange={(e) => {
                            const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                      const maxCapacity = selectedArea?.capacity || 1;
                            const finalValue = Math.min(Math.max(value, 0), maxCapacity);
                      setFormData({...formData, requestedSeats: finalValue});
                    }}
                          className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                            formData.requestedSeats === 0 
                              ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                              : 'border-gray-300 focus:ring-primary-500'
                          }`}
                          placeholder="Ingrese cantidad"
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
                      {formData.requestedSeats === 0 && (
                        <div className="mt-1 text-sm text-red-600 flex items-center">
                          <span className="mr-1">⚠️</span>
                          Debe ingresar al menos 1 puesto para crear la reserva
                  </div>
                )}
              </div>
                  )}

                  {/* Duración - Solo para Salas */}
                  {selectedArea.isMeetingRoom && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duración (horas) *
                </label>
                      <select
                        value={formData.duration}
                  onChange={(e) => {
                          const duration = e.target.value;
                          setFormData({...formData, duration});
                          
                          // Si hay una hora de inicio, recalcular la hora de fin
                          if (formData.startTime) {
                            const endTime = addMinutesToTime(formData.startTime, parseInt(duration));
                            setFormData(prev => ({...prev, endTime}));
                          }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                      >
                        <option value="">Seleccionar duración</option>
                        <option value="30">30 minutos</option>
                        <option value="60">1 hora</option>
                        <option value="90">1.5 horas</option>
                        <option value="120">2 horas</option>
                        <option value="180">3 horas</option>
                        <option value="240">4 horas</option>
                        <option value="300">5 horas</option>
                        <option value="360">6 horas</option>
                        <option value="480">8 horas</option>
                      </select>
                      <div className="text-xs text-gray-500 mt-1">
                        <span className="text-blue-600 font-medium">
                          Sala: {selectedArea.name} • Capacidad: {selectedArea.capacity} personas
                        </span>
              </div>
                    </div>
                  )}

                  {/* Información adicional para salas */}
                  {selectedArea.isMeetingRoom && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                        Información de la Sala
                </label>
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
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
                              <p>Seleccione la duración de la reunión.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Paso 3: Selección de Colaboradores */}
            {selectedArea && !selectedArea.isMeetingRoom && formData.teamName && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <span className="bg-primary-100 text-primary-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">3</span>
                  👥 Selección de Colaboradores
                </h3>
                
                {/* Selección de Colaboradores */}
              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seleccionar Colaboradores ({selectedCollaborators.length} seleccionados) *
                </label>
                    
                    {colaboradoresDisponibles.length === 0 ? (
                      <div className="text-sm text-gray-500 p-3 bg-gray-100 rounded-md">
                        No hay colaboradores disponibles en el departamento "{formData.teamName}".
            </div>
                    ) : (
                      <div className="border border-gray-200 rounded-md">
                        {/* Botones de Selección Masiva */}
                        {colaboradoresDisponibles.length > 1 && (
                          <div className="bg-gray-50 border-b border-gray-200 p-3 sticky top-0 z-10">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-700">
                                  Selección masiva
                                </div>
                                <div className="text-xs text-gray-500">
                                  {colaboradoresDisponibles.length} colaboradores disponibles
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={handleSelectAll}
                                  className="px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md border border-primary-200 transition-colors"
                                >
                                  Seleccionar todos
                                </button>
                                <button
                                  type="button"
                                  onClick={handleDeselectAll}
                                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-md border border-gray-300 transition-colors"
                                >
                                  Limpiar selección
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Lista de colaboradores con scroll */}
                        <div className="space-y-2 max-h-48 overflow-y-auto p-3">
                        
                        {colaboradoresDisponibles.map((collaborator) => (
                          <label key={collaborator.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                <input
                              type="checkbox"
                              checked={selectedCollaborators.includes(collaborator.id)}
                              onChange={(e) => handleCollaboratorSelection(collaborator.id, e.target.checked)}
                              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{collaborator.name}</div>
                              <div className="text-xs text-gray-500">{collaborator.email}</div>
              </div>
                          </label>
                        ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 mt-2">
                      <span className="text-blue-600 font-medium">
                        {selectedCollaborators.length} colaborador(es) seleccionado(s)
                      </span>
                      {selectedCollaborators.length === 0 && !selectedArea?.isMeetingRoom && (
                        <span className="text-red-600 ml-2">
                          • Debe seleccionar al menos 1 colaborador
                        </span>
                      )}
                    </div>
                </div>
              </div>
            )}

            {/* Horarios (solo para reservas que no son de día completo) */}
              {!isFullDayReservation && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <span className="bg-primary-100 text-primary-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">4</span>
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
                            return r.area === formData.area && reservationDate === formDate && (r.status === 'confirmed' || r.status === 'active');
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
                            return r.area === formData.area && reservationDate === formDate && (r.status === 'confirmed' || r.status === 'active');
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
                          return r.area === formData.area && reservationDate === formDate && r.status === 'confirmed';
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

      {/* Ordenador de Reservaciones */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Ordenar por:</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleSortChange('createdAt')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  sortBy === 'createdAt'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Fecha de creación"
              >
                📅 Creación {sortBy === 'createdAt' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
              
              <button
                onClick={() => handleSortChange('date')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  sortBy === 'date'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Fecha de la reservación"
              >
                📆 Fecha {sortBy === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
              
              <button
                onClick={() => handleSortChange('area')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  sortBy === 'area'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Área"
              >
                🏢 Área {sortBy === 'area' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
              
              <button
                onClick={() => handleSortChange('team')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  sortBy === 'team'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Equipo"
              >
                👥 Equipo {sortBy === 'team' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Orden:</span>
            <span className="font-medium">
              {sortOrder === 'desc' ? 'Descendente (más reciente primero)' : 'Ascendente (más antiguo primero)'}
            </span>
          </div>
        </div>
      </div>

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
                    
                    {/* ID único de la reservación */}
                    {reservation.reservationId && (
                      <div className="mb-2">
                        <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                          ID: {reservation.reservationId}
                        </span>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      
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
                        <span className="text-gray-400">🪑</span>
                        <span><strong>Puestos:</strong> {reservation.requestedSeats || 1}</span>
                      </div>


                      {reservation.createdBy && (
                      <div className="flex items-center gap-2">
                          <span className="text-gray-400">👤</span>
                          <span><strong>Creado por:</strong> {reservation.createdBy.userName} ({reservation.createdBy.userRole})</span>
                      </div>
                      )}

                      {reservation.createdAt && (
                      <div className="flex items-center gap-2">
                          <span className="text-gray-400">📅</span>
                          <span><strong>Registrado:</strong> {new Date(reservation.createdAt).toLocaleString('es-ES', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}</span>
                      </div>
                      )}

                      {reservation.colaboradores && reservation.colaboradores.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">👥</span>
                          <span><strong>Colaboradores:</strong> {
                            reservation.colaboradores.map(c => {
                              // Si c es un objeto con name, usar c.name
                              if (typeof c === 'object' && c.name) {
                                return c.name;
                              }
                              // Si c es un ID (string), buscar el usuario en el estado global
                              if (typeof c === 'string') {
                                const user = state.users.find(u => u.id === c || u._id === c);
                                return user ? user.name : 'Usuario no encontrado';
                              }
                              return 'Usuario no encontrado';
                            }).join(', ')
                          }</span>
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
                    {/* Botón para ver reservación completa */}
                    <button
                      onClick={() => handleViewReservation(reservation)}
                      className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                      title="Ver reservación completa"
                    >
                      👁️ Ver
                    </button>
                    
                    {/* Botón de Debug */}
                    <button
                      onClick={() => showDebugInfo(reservation)}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      title="Ver información debug"
                    >
                      🔍 Debug
                    </button>
                    
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

      {/* Modal de Vista Completa de Reservación */}
      {viewingReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header del Modal */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Vista Completa de Reservación
                </h2>
                <button
                  onClick={handleCloseView}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Información Principal */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Columna Izquierda - Información Básica */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Información Básica</h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Área:</span>
                        <span className="font-medium">{viewingReservation.area}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fecha:</span>
                        <span className="font-medium">{formatDateWithDay(viewingReservation.date)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Horario:</span>
                        <span className="font-medium">
                          {(() => {
                            const area = areas.find(a => a.name === viewingReservation.area);
                            const isFullDay = area?.isFullDayReservation || false;
                            return isFullDay ? 'Día completo' : `${viewingReservation.startTime} - ${viewingReservation.endTime}`;
                          })()}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Equipo:</span>
                        <span className="font-medium">{viewingReservation.teamName}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Puestos:</span>
                        <span className="font-medium">{viewingReservation.requestedSeats}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estado:</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(viewingReservation.status)}`}>
                          {getStatusText(viewingReservation.status)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* IDs de la Reservación */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Identificadores</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="text-gray-600 text-sm">ID de Reservación:</span>
                        <div className="font-mono text-sm bg-white p-2 rounded border mt-1">
                          {viewingReservation.reservationId || 'No disponible'}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-gray-600 text-sm">ID MongoDB:</span>
                        <div className="font-mono text-sm bg-white p-2 rounded border mt-1">
                          {viewingReservation._id}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Columna Derecha - Información Adicional */}
                <div className="space-y-4">
                  {/* Colaboradores */}
                  {viewingReservation.colaboradores && viewingReservation.colaboradores.length > 0 && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Colaboradores</h3>
                      <div className="space-y-2">
                        {viewingReservation.colaboradores.map((c, index) => {
                          const collaboratorName = typeof c === 'object' && c.name 
                            ? c.name 
                            : typeof c === 'string' 
                              ? (state.users.find(u => u.id === c || u._id === c)?.name || 'Usuario no encontrado')
                              : 'Usuario no encontrado';
                          return (
                            <div key={index} className="flex items-center gap-2">
                              <span className="text-gray-400">👤</span>
                              <span className="text-sm">{collaboratorName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Asistentes */}
                  {viewingReservation.attendees && viewingReservation.attendees.length > 0 && (
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Asistentes</h3>
                      <div className="space-y-2">
                        {viewingReservation.attendees.map((attendee, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-gray-400">👥</span>
                            <span className="text-sm">{attendee}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Información de Auditoría */}
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Auditoría</h3>
                    
                    <div className="space-y-3">
                      {viewingReservation.createdBy && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Creado por:</span>
                          <span className="font-medium">
                            {viewingReservation.createdBy.userName} ({viewingReservation.createdBy.userRole})
                          </span>
                        </div>
                      )}
                      
                      {viewingReservation.createdAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Fecha de creación:</span>
                          <span className="font-medium">
                            {new Date(viewingReservation.createdAt).toLocaleString('es-ES', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                      
                      {viewingReservation.updatedAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Última actualización:</span>
                          <span className="font-medium">
                            {new Date(viewingReservation.updatedAt).toLocaleString('es-ES', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notas */}
              {viewingReservation.notes && (
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Notas</h3>
                  <p className="text-gray-700">{viewingReservation.notes}</p>
                </div>
              )}

              {/* Información Debug */}
              {viewingReservation.debug && (
                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Información Debug</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Usa el botón "🔍 Debug" para ver información detallada de esta reserva.
                  </p>
                  <button
                    onClick={() => showDebugInfo(viewingReservation)}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    🔍 Ver Debug Completo
                  </button>
                </div>
              )}

              {/* Botones de Acción */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={handleCloseView}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cerrar
                </button>
                
                {canEditReservation(viewingReservation) && (
                  <button
                    onClick={() => {
                      handleEdit(viewingReservation);
                      handleCloseView();
                    }}
                    className="px-4 py-2 text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Editar
                  </button>
                )}
                
                {canDeleteReservation(viewingReservation) && (
                  <button
                    onClick={() => {
                      handleDelete(viewingReservation);
                      handleCloseView();
                    }}
                    className="px-4 py-2 text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
