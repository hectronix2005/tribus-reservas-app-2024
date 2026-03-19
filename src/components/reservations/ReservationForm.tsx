import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { reservationService, departmentService } from '../../services/api';
import { DatePicker } from '../DatePicker';
import { Reservation, Department } from '../../types';
import {
  isWithinOfficeHours,
  isOfficeDay,
  isOfficeHour,
  createLocalDate,
  formatDateToString,
  normalizeUTCDateToLocal,
  formatDateWithDayName,
} from '../../utils/unifiedDateUtils';
import { addMinutesToTime } from '../../utils/reservationUtils';

interface ReservationFormData {
  area: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  teamName: string;
  requestedSeats: number;
  notes: string;
  colaboradores: string[];
  isRecurring: boolean;
  recurrenceType: 'daily' | 'weekly' | 'monthly' | 'custom';
  recurrenceInterval: number;
  recurrenceEndDate: string;
  recurrenceDays: string[];
}

const initialFormData = (): ReservationFormData => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return {
    area: '',
    date: `${year}-${month}-${day}`,
    startTime: '09:00',
    endTime: '10:00',
    duration: '60',
    teamName: '',
    requestedSeats: 1,
    notes: '',
    colaboradores: [],
    isRecurring: false,
    recurrenceType: 'weekly',
    recurrenceInterval: 1,
    recurrenceEndDate: '',
    recurrenceDays: ['monday'],
  };
};

interface ReservationFormProps {
  editingReservation: Reservation | null;
  initialData?: Partial<ReservationFormData>;
  onSubmitSuccess: () => void;
  onCancel: () => void;
}

export function ReservationForm({
  editingReservation,
  initialData,
  onSubmitSuccess,
  onCancel,
}: ReservationFormProps) {
  const { state, getDailyCapacity } = useApp();
  const currentUser = state.auth.currentUser;

  const areas = useMemo(() => state.areas.filter(area => area.isActive !== false), [state.areas]);

  const [formData, setFormData] = useState<ReservationFormData>(() => ({
    ...initialFormData(),
    ...initialData,
  }));
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>(
    initialData?.colaboradores || []
  );
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync when editingReservation changes
  useEffect(() => {
    if (editingReservation) {
      const startMinutes =
        parseInt(editingReservation.startTime.split(':')[0]) * 60 +
        parseInt(editingReservation.startTime.split(':')[1]);
      const endMinutes =
        parseInt(editingReservation.endTime.split(':')[0]) * 60 +
        parseInt(editingReservation.endTime.split(':')[1]);
      const duration = (endMinutes - startMinutes).toString();

      setFormData({
        area: editingReservation.area,
        date: formatDateToString(new Date(editingReservation.date)),
        startTime: editingReservation.startTime,
        endTime: editingReservation.endTime,
        duration,
        teamName: editingReservation.teamName,
        requestedSeats: editingReservation.requestedSeats || 1,
        notes: editingReservation.notes,
        colaboradores: editingReservation.colaboradores?.map(c => c._id) || [],
        isRecurring: false,
        recurrenceType: 'weekly',
        recurrenceInterval: 1,
        recurrenceEndDate: '',
        recurrenceDays: ['monday'],
      });
      setSelectedCollaborators(editingReservation.colaboradores?.map(c => c._id) || []);
    }
  }, [editingReservation]);

  // Sync when initialData changes (e.g. from availability click)
  useEffect(() => {
    if (initialData && !editingReservation) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData, editingReservation]);

  // Load departments
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        console.log('🔄 Cargando departamentos...');
        const depts = await departmentService.getDepartments();
        console.log('✅ Departamentos cargados:', depts);
        setDepartments(depts);
      } catch (err) {
        console.error('❌ Error cargando departamentos:', err);
      }
    };
    loadDepartments();

    const handleDepartmentsUpdate = () => loadDepartments();
    window.addEventListener('departmentsUpdated', handleDepartmentsUpdate);
    return () => window.removeEventListener('departmentsUpdated', handleDepartmentsUpdate);
  }, []);

  const selectedArea = areas.find(area => area.name === formData.area);
  const isFullDayReservation = selectedArea?.isFullDayReservation || false;

  const getAvailableCapacity = useCallback(
    (areaId: string, date: string): number => {
      const dailyCapacity = getDailyCapacity(date);
      const areaCapacity = dailyCapacity.find(capacity => capacity.areaId === areaId);
      return areaCapacity ? areaCapacity.availableSeats : 0;
    },
    [getDailyCapacity]
  );

  const getCollaboratorsByDepartment = useCallback(
    (departmentName: string) =>
      state.users.filter(user => user.isActive && user.department === departmentName),
    [state.users]
  );

  const colaboradoresDisponibles = useMemo(
    () =>
      formData.teamName
        ? getCollaboratorsByDepartment(formData.teamName)
        : state.users.filter(user => user.isActive),
    [formData.teamName, getCollaboratorsByDepartment, state.users]
  );

  const handleAreaChange = (areaName: string) => {
    const area = areas.find(a => a.name === areaName);
    const isFullDay = area?.isFullDayReservation || false;
    const officeHours = state.adminSettings?.officeHours || { start: '08:00', end: '18:00' };

    setFormData(prev => ({
      ...prev,
      area: areaName,
      startTime: isFullDay ? officeHours.start : '09:00',
      endTime: isFullDay ? officeHours.end : '10:00',
      duration: '60',
      requestedSeats: area?.isMeetingRoom ? area.capacity : 1,
    }));
    setError(null);
  };

  const handleDepartmentChange = (departmentName: string) => {
    setFormData(prev => ({ ...prev, teamName: departmentName }));
    const newCollaborators = getCollaboratorsByDepartment(departmentName);
    setSelectedCollaborators(newCollaborators.map(c => c.id));
  };

  const handleCollaboratorSelection = (collaboratorId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedCollaborators(prev => [...prev, collaboratorId]);
    } else {
      setSelectedCollaborators(prev => prev.filter(id => id !== collaboratorId));
    }
  };

  const handleSelectAll = () =>
    setSelectedCollaborators(colaboradoresDisponibles.map(c => c.id));
  const handleDeselectAll = () => setSelectedCollaborators([]);

  // Duration limiter for "lider" role
  const lastDurationAdjustmentRef = useRef<{ duration: string; startTime: string } | null>(null);
  useEffect(() => {
    if (currentUser?.role === 'lider' && !isFullDayReservation) {
      const currentDuration = parseInt(formData.duration || '60');
      const alreadyAdjusted =
        lastDurationAdjustmentRef.current &&
        lastDurationAdjustmentRef.current.duration === formData.duration &&
        lastDurationAdjustmentRef.current.startTime === formData.startTime;

      if (!alreadyAdjusted && currentDuration > 180) {
        const newEndTime = addMinutesToTime(formData.startTime, 180);
        lastDurationAdjustmentRef.current = { duration: '180', startTime: formData.startTime };
        setFormData(prev => ({ ...prev, duration: '180', endTime: newEndTime }));
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ Duración ajustada para usuario con rol "user"');
        }
      }
    }
  }, [currentUser?.role, formData.duration, formData.startTime, isFullDayReservation]);

  // HOT DESK must always use office hours
  const lastOfficeHoursRef = useRef<{ start: string; end: string } | null>(null);
  useEffect(() => {
    if (isFullDayReservation && formData.area) {
      const officeHours = state.adminSettings?.officeHours || { start: '08:00', end: '18:00' };
      const officeHoursChanged =
        !lastOfficeHoursRef.current ||
        lastOfficeHoursRef.current.start !== officeHours.start ||
        lastOfficeHoursRef.current.end !== officeHours.end;

      if (
        officeHoursChanged &&
        (formData.startTime !== officeHours.start || formData.endTime !== officeHours.end)
      ) {
        lastOfficeHoursRef.current = officeHours;
        setFormData(prev => ({
          ...prev,
          startTime: officeHours.start,
          endTime: officeHours.end,
        }));
      }
    }
  }, [isFullDayReservation, formData.area, state.adminSettings?.officeHours]);

  // Clear startTime when date/duration changes and startTime not set
  useEffect(() => {
    if ((formData.date || formData.duration) && !formData.startTime) {
      setFormData(prev => ({ ...prev, startTime: '', endTime: '' }));
    }
  }, [formData.date, formData.duration, formData.startTime]);

  const normalizeDate = useCallback((date: string | Date): string => {
    if (typeof date === 'string') return normalizeUTCDateToLocal(date);
    return formatDateToString(date);
  }, []);

  const formatDateForDisplay = (date: string | Date): string => {
    let dateObj: Date;
    if (typeof date === 'string') {
      if (/^\d{2}-\d{2}-\d{2}$/.test(date)) {
        const [day, month, year] = date.split('-').map(Number);
        const fullYear = year < 50 ? 2000 + year : 1900 + year;
        dateObj = new Date(fullYear, month - 1, day);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-').map(Number);
        dateObj = new Date(year, month - 1, day);
      } else if (date.includes('T')) {
        const [year, month, day] = date.split('T')[0].split('-').map(Number);
        dateObj = new Date(year, month - 1, day);
      } else {
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }
    return dateObj.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Bogota',
    });
  };

  const isDateAndTimeInPast = useCallback(
    (date: string, startTime: string): boolean => {
      if (!date || !startTime) return false;
      const now = new Date();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = startTime.split(':').map(Number);
      const reservationDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
      const isInPast = reservationDate < now;
      const isWithinOfficeHoursCheck = isWithinOfficeHours(reservationDate, startTime, state.adminSettings);
      return isInPast || !isWithinOfficeHoursCheck;
    },
    [state.adminSettings]
  );

  const isDateInPast = useCallback((date: string): boolean => {
    if (!date) return false;
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return date < todayString;
  }, []);

  const getMinDate = useCallback((): string => {
    const today = new Date();
    let currentDate = new Date(today);
    if (isOfficeDay(currentDate, state.adminSettings.officeDays)) {
      const currentHour = today.getHours();
      const [officeStartHour] = state.adminSettings.officeHours.start.split(':').map(Number);
      if (currentHour < officeStartHour) return formatDateToString(currentDate);
    }
    currentDate.setDate(currentDate.getDate() + 1);
    while (!isOfficeDay(currentDate, state.adminSettings.officeDays)) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return formatDateToString(currentDate);
  }, [state.adminSettings.officeDays, state.adminSettings.officeHours.start]);

  // All current reservations from state (for conflict checking & time slot availability)
  const reservations = useMemo(() => state.reservations || [], [state.reservations]);

  const getConflictingReservations = useCallback(
    (area: string, date: string, startTime: string, endTime: string, excludeId?: string) => {
      const normalizedDate = normalizeDate(date);
      return reservations.filter(reservation => {
        if (excludeId && reservation._id === excludeId) return false;
        const reservationDate = normalizeDate(reservation.date);
        if (reservation.area !== area || reservationDate !== normalizedDate) return false;
        if (reservation.status !== 'confirmed' && reservation.status !== 'active') return false;
        const reservationStart = reservation.startTime;
        const reservationEnd = reservation.endTime;
        return (
          (startTime < reservationEnd && endTime > reservationStart) ||
          (reservationStart < endTime && reservationEnd > startTime)
        );
      });
    },
    [reservations, normalizeDate]
  );

  const isDateFullyBooked = useCallback(
    (area: string, date: string) => {
      const normalizedDate = normalizeDate(date);
      const areaReservations = reservations.filter(
        r =>
          r.area === area &&
          normalizeDate(r.date) === normalizedDate &&
          (r.status === 'confirmed' || r.status === 'active')
      );
      if (areaReservations.length === 0) return false;
      const areaInfo = areas.find(a => a.name === area);
      const isFullDay = areaInfo?.isFullDayReservation || false;
      if (isFullDay) {
        const totalCapacity = areaInfo?.capacity || 0;
        const totalReservedSeats = areaReservations.reduce(
          (sum, r) => sum + (r.requestedSeats || 1),
          0
        );
        return totalReservedSeats >= totalCapacity;
      }
      const businessHours: string[] = [];
      for (let hour = 8; hour < 18; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          businessHours.push(
            `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          );
        }
      }
      const occupiedHours = new Set<string>();
      areaReservations.forEach(r => {
        let currentTime = r.startTime;
        while (currentTime < r.endTime) {
          occupiedHours.add(currentTime);
          const [h, m] = currentTime.split(':').map(Number);
          const totalMinutes = h * 60 + m + 30;
          const nh = Math.floor(totalMinutes / 60);
          const nm = totalMinutes % 60;
          currentTime = `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
        }
      });
      return businessHours.every(hour => occupiedHours.has(hour));
    },
    [reservations, normalizeDate, areas]
  );

  const isSelectedDateFullyBooked = useMemo(() => {
    if (!formData.area || !formData.date) return false;
    return isDateFullyBooked(formData.area, formData.date);
  }, [formData.area, formData.date, isDateFullyBooked]);

  const availableStartTimes = useMemo(() => {
    if (!formData.area || !formData.date || !formData.duration) return [];
    const [startHour] = state.adminSettings.officeHours.start.split(':').map(Number);
    const [endHour] = state.adminSettings.officeHours.end.split(':').map(Number);
    const interval = 30;
    const duration = parseInt(formData.duration || '60');
    const selectedDate = createLocalDate(formData.date);
    if (!isOfficeDay(selectedDate, state.adminSettings.officeDays)) return [];

    const times: string[] = [];
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const endTime = addMinutesToTime(startTime, duration);
        if (!isOfficeHour(startTime, state.adminSettings.officeHours)) continue;
        const conflicts = getConflictingReservations(
          formData.area,
          formData.date,
          startTime,
          endTime,
          editingReservation?._id
        );
        const isInPast = isDateAndTimeInPast(formData.date, startTime);
        if (conflicts.length === 0 && !isInPast) {
          times.push(startTime);
        }
      }
    }
    return times;
  }, [
    formData.area,
    formData.date,
    formData.duration,
    reservations,
    editingReservation?._id,
    getConflictingReservations,
    isDateAndTimeInPast,
    state.adminSettings.officeDays,
    state.adminSettings.officeHours,
  ]);

  const ensureAdminSettings = () => {
    if (!state.adminSettings || !state.adminSettings.officeDays) {
      return {
        monday: true, tuesday: true, wednesday: true, thursday: true,
        friday: true, saturday: false, sunday: false,
      };
    }
    return state.adminSettings.officeDays;
  };

  const generateRecurringDates = (
    startDate: string,
    recurrenceType: string,
    recurrenceInterval: number,
    recurrenceEndDate: string,
    recurrenceDays: string[] = []
  ): string[] => {
    const dates: string[] = [];
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const start = new Date(startYear, startMonth - 1, startDay);
    const [endYear, endMonth, endDay] = recurrenceEndDate.split('-').map(Number);
    const end = new Date(endYear, endMonth - 1, endDay);
    if (start > end) return dates;

    let currentDate = new Date(start);
    while (currentDate <= end) {
      let shouldInclude = false;
      switch (recurrenceType) {
        case 'daily':
          shouldInclude = true;
          break;
        case 'weekly': {
          const dayIndex = currentDate.getDay();
          const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          if (recurrenceDays.includes(daysMap[dayIndex])) shouldInclude = true;
          break;
        }
        case 'monthly':
          shouldInclude = true;
          break;
        default:
          shouldInclude = true;
      }
      if (shouldInclude && currentDate <= end) {
        const y = currentDate.getFullYear();
        const m = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const d = currentDate.getDate().toString().padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
      }
      switch (recurrenceType) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + recurrenceInterval);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + recurrenceInterval);
          break;
        default:
          currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    return dates;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError('Debe iniciar sesión para crear una reservación');
      return;
    }

    if (!isFullDayReservation && formData.startTime) {
      if (isDateAndTimeInPast(formData.date, formData.startTime)) {
        setError('No se pueden hacer reservaciones en fechas y horarios pasados. Por favor, seleccione una fecha y hora futura.');
        return;
      }
    } else if (isFullDayReservation) {
      if (isDateInPast(formData.date)) {
        setError('No se pueden hacer reservaciones en fechas pasadas. Por favor, seleccione una fecha futura.');
        return;
      }
    }

    if (formData.date) {
      const selectedDate = createLocalDate(formData.date);
      const officeDays = ensureAdminSettings();
      if (!isOfficeDay(selectedDate, officeDays)) {
        setError('La fecha seleccionada no es un día de oficina. Por favor, seleccione un día laboral.');
        return;
      }
    }

    if (!isFullDayReservation && formData.startTime) {
      const officeHours = state.adminSettings?.officeHours || { start: '08:00', end: '18:00' };
      if (!isOfficeHour(formData.startTime, officeHours)) {
        setError('La hora seleccionada está fuera del horario de oficina. Por favor, seleccione una hora dentro del horario laboral.');
        return;
      }
    }

    if (!isFullDayReservation && currentUser?.role === 'lider') {
      const durationMinutes = parseInt(formData.duration || '60');
      if (durationMinutes > 180) {
        setError('Los usuarios con rol "Lider" solo pueden reservar hasta 3 horas (180 minutos) máximo.');
        return;
      }
    }

    if (!selectedArea?.isMeetingRoom && formData.requestedSeats < 1) {
      setError('Debe reservar al menos 1 puesto para Hot Desk. Por favor, ingrese una cantidad válida.');
      return;
    }

    if (isSelectedDateFullyBooked) {
      setError('Esta fecha está completamente ocupada. Por favor, seleccione otra fecha.');
      return;
    }

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
      const existingReservations = reservations.filter(
        r =>
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

    if (!selectedArea?.isMeetingRoom && selectedCollaborators.length === 0) {
      setError('Debe seleccionar al menos 1 colaborador para la reserva.');
      return;
    }

    if (!selectedArea?.isMeetingRoom && selectedCollaborators.length !== formData.requestedSeats) {
      setError(`La cantidad de colaboradores seleccionados (${selectedCollaborators.length}) debe ser igual a la cantidad de puestos reservados (${formData.requestedSeats}).`);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (formData.isRecurring && (currentUser?.role === 'admin' || currentUser?.role === 'superadmin')) {
        if (!formData.recurrenceEndDate) {
          setError('Para reservaciones recurrentes, debe especificar una fecha de fin.');
          setIsLoading(false);
          return;
        }
        const recurringDates = generateRecurringDates(
          formData.date,
          formData.recurrenceType,
          formData.recurrenceInterval,
          formData.recurrenceEndDate,
          formData.recurrenceDays
        );
        console.log('📅 Fechas recurrentes generadas:', recurringDates);
        for (const date of recurringDates) {
          const reservationData = {
            userId: currentUser.id,
            userName: currentUser.name,
            area: formData.area,
            date,
            startTime: formData.startTime,
            endTime: formData.endTime,
            duration: formData.duration,
            teamName: formData.teamName,
            requestedSeats: formData.requestedSeats,
            notes: formData.notes,
            colaboradores: selectedCollaborators,
          };
          await reservationService.createReservation(reservationData);
        }
        console.log(`✅ Se crearon ${recurringDates.length} reservaciones recurrentes`);
      } else {
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
          colaboradores: selectedCollaborators,
        };

        if (editingReservation) {
          await reservationService.updateReservation(editingReservation._id, reservationData);
          console.log('✅ Reservación actualizada, recargando página...');
          window.location.reload();
          return;
        } else {
          const response = await reservationService.createReservation(reservationData);
          if (response?.reservation) {
            setIsLoading(false);
            onSubmitSuccess();
            // Pass confirmed reservation up via a custom event so Reservations.tsx can show modal
            window.dispatchEvent(
              new CustomEvent('reservationCreated', { detail: { reservation: response.reservation } })
            );
            return;
          } else {
            console.log('✅ Reservación creada, recargando página...');
            window.location.reload();
            return;
          }
        }
      }

      console.log('✅ Reservaciones creadas, recargando página...');
      window.location.reload();
    } catch (err: any) {
      console.error('Error guardando reservación:', err);
      setError(err.message || 'Error al guardar la reservación');
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6 md:mb-8">
      <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">
        {editingReservation ? 'Editar Reservación' : 'Nueva Reservación'}
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        {/* Paso 1: Fecha, Tipo de Área y Departamento */}
        <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
            <span className="bg-primary-100 text-primary-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">1</span>
            📅 Información Básica de la Reservación
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {/* Fecha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de la Reservación *
              </label>
              <DatePicker
                value={formData.date}
                onChange={(dateValue) => {
                  if (dateValue) {
                    if (isDateInPast(dateValue)) {
                      setError('No se pueden seleccionar fechas pasadas. Por favor, seleccione una fecha futura.');
                      return;
                    }
                    const selectedDate = createLocalDate(dateValue);
                    if (!isOfficeDay(selectedDate, state.adminSettings.officeDays)) {
                      setError('La fecha seleccionada no es un día de oficina. Por favor, seleccione un día laboral.');
                      return;
                    }
                  }
                  setFormData(prev => ({ ...prev, date: dateValue, startTime: '', endTime: '' }));
                  setError(null);
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

            {/* Tipo de Área */}
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

              {selectedArea && selectedArea.isMeetingRoom && (
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Reserva de Sala Completa</h3>
                      <div className="mt-1 text-sm text-blue-700">
                        <p>Esta sala se reserva completa para {selectedArea.capacity} personas.</p>
                        <p>No es necesario especificar cantidad de puestos.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Departamento */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
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
                        setFormData({ ...formData, requestedSeats: finalValue });
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
                      setFormData(prev => {
                        const newData = { ...prev, duration };
                        if (prev.startTime) {
                          newData.endTime = addMinutesToTime(prev.startTime, parseInt(duration));
                        }
                        return newData;
                      });
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
                        <h3 className="text-sm font-medium text-blue-800">Reserva de Sala Completa</h3>
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
                  {colaboradoresDisponibles.length > 1 && (
                    <div className="bg-gray-50 border-b border-gray-200 p-3 sticky top-0 z-10">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-700">Selección masiva</div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
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
                    setFormData({ ...formData, startTime, endTime });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Seleccionar hora de inicio</option>
                  {availableStartTimes.map((time, index) => (
                    <option key={index} value={time}>{time}</option>
                  ))}
                </select>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-gray-500">
                    {availableStartTimes.length} hora{availableStartTimes.length !== 1 ? 's' : ''} disponible{availableStartTimes.length !== 1 ? 's' : ''} para {formData.duration} min
                  </span>
                  {availableStartTimes.length > 0 && (
                    <span className="text-sm text-green-600">✓ Horarios libres</span>
                  )}
                  {availableStartTimes.length === 0 && formData.area && formData.date && formData.duration && (
                    <span className="text-sm text-red-600">⚠️ No hay horarios disponibles para {formData.duration} min</span>
                  )}
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  Horario de oficina: {state.adminSettings.officeHours.start} - {state.adminSettings.officeHours.end}
                </div>
              </div>

              {/* Reservaciones existentes para la fecha y área */}
              {formData.area && formData.date && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reservaciones existentes para {formData.area} el {formatDateWithDayName(formData.date)}:
                  </label>
                  <div className="bg-gray-50 rounded-md p-3 max-h-32 overflow-y-auto">
                    {reservations
                      .filter(r => {
                        const reservationDate = normalizeDate(r.date);
                        const formDate = normalizeDate(formData.date);
                        return r.area === formData.area && reservationDate === formDate && (r.status === 'confirmed' || r.status === 'active');
                      })
                      .map((r, index) => {
                        const area = areas.find(a => a.name === r.area);
                        const isHotDesk = area?.category === 'HOT_DESK';
                        return (
                          <div key={index} className="text-sm text-gray-600 mb-1">
                            {!isHotDesk && (
                              <span className="font-medium">{r.startTime} - {r.endTime}</span>
                            )}
                            {r.notes && ` (${r.notes})`}
                          </div>
                        );
                      })}
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
                  Esta área se reserva por día completo
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Sección de Reservaciones Recurrentes (solo para admins y superadmins) */}
        {(currentUser?.role === 'admin' || currentUser?.role === 'superadmin') && (
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                id="isRecurring"
                checked={formData.isRecurring}
                onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">
                Crear reservación recurrente
              </label>
            </div>

            {formData.isRecurring && (
              <div className="space-y-4 bg-gray-50 p-4 rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Recurrencia
                    </label>
                    <select
                      value={formData.recurrenceType}
                      onChange={(e) => setFormData({ ...formData, recurrenceType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="daily">Diaria</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo</label>
                    <select
                      value={formData.recurrenceInterval}
                      onChange={(e) => setFormData({ ...formData, recurrenceInterval: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map(n => (
                        <option key={n} value={n}>Cada {n}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Fin</label>
                    <input
                      type="date"
                      value={formData.recurrenceEndDate}
                      onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                      min={formData.date}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required={formData.isRecurring}
                    />
                  </div>
                </div>

                {formData.recurrenceType === 'weekly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Días de la Semana</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { value: 'monday', label: 'Lunes' },
                        { value: 'tuesday', label: 'Martes' },
                        { value: 'wednesday', label: 'Miércoles' },
                        { value: 'thursday', label: 'Jueves' },
                        { value: 'friday', label: 'Viernes' },
                        { value: 'saturday', label: 'Sábado' },
                        { value: 'sunday', label: 'Domingo' },
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
                              setFormData({ ...formData, recurrenceDays: newDays });
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
                      const dayNames: Record<string, string> = {
                        monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
                        thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
                      };
                      return dayNames[day];
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
            {isLoading ? 'Guardando...' : editingReservation ? 'Actualizar' : 'Crear'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="btn-secondary flex-1"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
