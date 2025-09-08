import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, Filter } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { reservationService } from '../services/api';
import { isOfficeDay as isOfficeDayUtil } from '../utils/officeHoursUtils';

interface DayAvailability {
  date: string;
  areas: {
    [areaName: string]: {
      isAvailable: boolean;
      reservations: any[];
      hourlySlots?: {
        [hour: string]: {
          isAvailable: boolean;
          reservations: any[];
        };
      };
      availableSpaces?: number;
      totalSpaces?: number;
    };
  };
}

interface AvailabilityProps {
  onHourClick?: (area: any, date: string, hour: string) => void;
  onNewReservation?: () => void;
}

export function Availability({ onHourClick, onNewReservation }: AvailabilityProps) {
  const { state } = useApp();
  
  // Usar la función isOfficeDay importada que maneja correctamente las zonas horarias
  const isOfficeDay = (date: Date): boolean => {
    return isOfficeDayUtil(date, state.adminSettings.officeDays);
  };

  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(() => {
    // Inicializar con el siguiente día hábil si hoy no lo es
    const today = new Date();
    if (isOfficeDay(today)) {
      return today;
    } else {
      // Buscar el siguiente día de oficina
      const nextOfficeDay = new Date(today);
      nextOfficeDay.setDate(today.getDate() + 1);
      while (!isOfficeDay(nextOfficeDay)) {
        nextOfficeDay.setDate(nextOfficeDay.getDate() + 1);
      }
      return nextOfficeDay;
    }
  });
  const [viewMode, setViewMode] = useState<'total' | 'week' | 'day'>('total');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]); // Array de IDs de áreas seleccionadas

  // Verificar si una hora está dentro del horario de oficina
  const isWithinOfficeHours = (hour: string): boolean => {
    if (!state.adminSettings.officeHours) return true; // Si no hay configuración, mostrar todas las horas
    
    const hour24 = convertTo24Hour(hour);
    const [hourNum] = hour24.split(':').map(Number);
    
    const [startHour] = state.adminSettings.officeHours.start.split(':').map(Number);
    const [endHour] = state.adminSettings.officeHours.end.split(':').map(Number);
    
    return hourNum >= startHour && hourNum < endHour;
  };

  // Generar los próximos 15 días a partir de hoy, filtrando solo días de oficina
  const generateNext15Days = (): Date[] => {
    const days: Date[] = [];
    const today = new Date();
    let currentDate = new Date(today);
    let daysFound = 0;
    
    // Buscar los próximos 15 días de oficina
    while (daysFound < 15) {
      if (isOfficeDay(currentDate)) {
        days.push(new Date(currentDate));
        daysFound++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  // Generar horarios de 1 hora según la configuración de oficina en formato AM/PM
  const generateHourlySlots = (): string[] => {
    const slots: string[] = [];
    
    // Usar la configuración de horarios de oficina
    const [startHour] = state.adminSettings.officeHours.start.split(':').map(Number);
    const [endHour] = state.adminSettings.officeHours.end.split(':').map(Number);
    
    for (let hour = startHour; hour < endHour; hour++) {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 12 ? 12 : hour > 12 ? hour - 12 : hour;
      const timeSlot = `${displayHour}:00 ${ampm}`;
      slots.push(timeSlot);
    }
    
    return slots;
  };

  // Verificar si es hoy
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Convertir formato AM/PM a formato 24 horas para comparaciones
  const convertTo24Hour = (time12h: string): string => {
    const [time, period] = time12h.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) {
      hour24 = hours + 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0;
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Manejar clic en horario disponible
  const handleHourClick = (area: any, date: Date, hour: string) => {
    console.log('🖱️ Clic en horario disponible:', { area: area.name, date: date.toISOString().split('T')[0], hour });
    
    if (onHourClick) {
      const hour24 = convertTo24Hour(hour);
      onHourClick(area, date.toISOString().split('T')[0], hour24);
    }
  };

  // Navegar al día anterior (solo días de oficina)
  const goToPreviousDay = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      
      // Buscar el día de oficina anterior más cercano
      while (!isOfficeDay(newDate)) {
        newDate.setDate(newDate.getDate() - 1);
      }
      
      return newDate;
    });
  };

  // Navegar al día siguiente (solo días de oficina)
  const goToNextDay = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      
      // Buscar el día de oficina siguiente más cercano
      while (!isOfficeDay(newDate)) {
        newDate.setDate(newDate.getDate() + 1);
      }
      
      return newDate;
    });
  };

  // Ir al día actual (o al siguiente día de oficina si hoy no lo es)
  const goToCurrentDay = () => {
    const today = new Date();
    if (isOfficeDay(today)) {
      setCurrentDate(today);
    } else {
      // Buscar el siguiente día de oficina
      const nextOfficeDay = new Date(today);
      nextOfficeDay.setDate(today.getDate() + 1);
      while (!isOfficeDay(nextOfficeDay)) {
        nextOfficeDay.setDate(nextOfficeDay.getDate() + 1);
      }
      setCurrentDate(nextOfficeDay);
    }
  };

  // Función para manejar el cambio de modo de vista
  const handleViewModeChange = (mode: 'total' | 'week' | 'day') => {
    setViewMode(mode);
    
    // Si se cambia a vista día y hoy no es un día hábil, ir al siguiente día hábil
    if (mode === 'day') {
      const today = new Date();
      if (!isOfficeDay(today)) {
        // Buscar el siguiente día de oficina
        const nextOfficeDay = new Date(today);
        nextOfficeDay.setDate(today.getDate() + 1);
        while (!isOfficeDay(nextOfficeDay)) {
          nextOfficeDay.setDate(nextOfficeDay.getDate() + 1);
        }
        setCurrentDate(nextOfficeDay);
      } else {
        setCurrentDate(today);
      }
    }
  };

  // Obtener áreas filtradas según las áreas seleccionadas
  const getFilteredAreas = () => {
    if (selectedAreas.length === 0) {
      return state.areas; // Mostrar todas las áreas si no hay filtro
    }
    
    return state.areas.filter(area => selectedAreas.includes(area.id));
  };

  // Manejar selección/deselección de área
  const toggleAreaSelection = (areaId: string) => {
    setSelectedAreas(prev => {
      if (prev.includes(areaId)) {
        return prev.filter(id => id !== areaId);
      } else {
        return [...prev, areaId];
      }
    });
  };

  // Seleccionar todas las áreas
  const selectAllAreas = () => {
    setSelectedAreas(state.areas.map(area => area.id));
  };

  // Deseleccionar todas las áreas
  const deselectAllAreas = () => {
    setSelectedAreas([]);
  };

  // Seleccionar solo Hot Desk
  const selectHotDeskAreas = () => {
    const hotDeskIds = state.areas
      .filter(area => area.category === 'HOT_DESK')
      .map(area => area.id);
    setSelectedAreas(hotDeskIds);
  };

  // Seleccionar solo Salas
  const selectSalaAreas = () => {
    const salaIds = state.areas
      .filter(area => area.category === 'SALA')
      .map(area => area.id);
    setSelectedAreas(salaIds);
  };

  // Cargar disponibilidad
  const loadAvailability = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const reservations = await reservationService.getAllReservations();
      const areas = state.areas;

      // Generar disponibilidad para los próximos 15 días de oficina
      const days = generateNext15Days();
      const availabilityData: DayAvailability[] = days.map(date => {
        const dateString = date.toISOString().split('T')[0];
        const dayReservations = reservations.filter(reservation => {
          const reservationDate = new Date(reservation.date).toISOString().split('T')[0];
          return reservationDate === dateString && reservation.status === 'active';
        });

        const areasAvailability: { [areaName: string]: any } = {};
        
        areas.forEach(area => {
          const areaReservations = dayReservations.filter(reservation => 
            reservation.area === area.name
          );
          
          if (area.category === 'HOT_DESK') {
            const totalReservedSeats = areaReservations.reduce((total, reservation) => {
              return total + (reservation.requestedSeats || 0);
            }, 0);
            
            const availableSpaces = Math.max(0, area.capacity - totalReservedSeats);
            
            areasAvailability[area.name] = {
              isAvailable: availableSpaces > 0,
              reservations: areaReservations,
              availableSpaces,
              totalSpaces: area.capacity
            };
          } else {
            const hourlySlots = generateHourlySlots();
            const hourlyAvailability: { [hour: string]: { isAvailable: boolean; reservations: any[] } } = {};
            
            hourlySlots.forEach(hour => {
              const hour24 = convertTo24Hour(hour);
              
              const hourReservations = areaReservations.filter(reservation => {
                const startHour = reservation.startTime;
                const endHour = reservation.endTime;
                return startHour <= hour24 && endHour > hour24;
              });
              
              hourlyAvailability[hour] = {
                isAvailable: hourReservations.length === 0,
                reservations: hourReservations
              };
            });
            
            areasAvailability[area.name] = {
              isAvailable: areaReservations.length === 0,
              reservations: areaReservations,
              hourlySlots: hourlyAvailability
            };
          }
        });

        return {
          date: dateString,
          areas: areasAvailability
        };
      });

      setAvailability(availabilityData);
    } catch (error) {
      console.error('Error cargando disponibilidad:', error);
      setError('Error al cargar la disponibilidad');
    } finally {
      setIsLoading(false);
    }
  }, [state.areas, state.adminSettings]);

  useEffect(() => {
    if (state.areas.length > 0) {
      loadAvailability();
    }
  }, [state.areas, loadAvailability]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando disponibilidad...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  const days = generateNext15Days();
  const filteredAreas = getFilteredAreas();

  // Formatear fecha para mostrar
  const formatDateForDisplay = (date: Date): string => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Bogota'
    });
  };

  // Obtener días según el modo de vista
  const getDaysToShow = () => {
    if (viewMode === 'total') {
      return days;
    } else if (viewMode === 'week') {
      // Mostrar 7 días de oficina a partir del día actual
      const today = new Date();
      const weekDays: Date[] = [];
      let currentDate = new Date(today);
      let daysFound = 0;
      
      while (daysFound < 7) {
        if (isOfficeDay(currentDate)) {
          weekDays.push(new Date(currentDate));
          daysFound++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return weekDays;
    } else { // day
      return [currentDate];
    }
  };

  const daysToShow = getDaysToShow();

  // Obtener los días de la semana habilitados para el header
  const getEnabledWeekDays = () => {
    if (!state.adminSettings.officeDays) {
      return ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    }
    
    const enabledDays: string[] = [];
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    dayNames.forEach((dayName, index) => {
      if (state.adminSettings.officeDays[dayName as keyof typeof state.adminSettings.officeDays]) {
        enabledDays.push(dayLabels[index]);
      }
    });
    
    return enabledDays;
  };

  const enabledWeekDays = getEnabledWeekDays();

  // Renderizar vista de día completo
  const renderDayView = () => {
    const dateString = currentDate.toISOString().split('T')[0];
    const dayAvailability = availability.find(day => day.date === dateString);
    const hourlySlots = generateHourlySlots();

    return (
      <div className="bg-white rounded-2xl shadow-soft border border-white/20 overflow-hidden">
        {/* Header del día */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{formatDateForDisplay(currentDate)}</h2>
              <p className="text-primary-100 mt-1">
                {isToday(currentDate) ? 'Hoy' : 'Día de oficina'} • {filteredAreas.length} áreas disponibles
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPreviousDay}
                className="p-2 rounded-xl hover:bg-primary-500 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={goToNextDay}
                className="p-2 rounded-xl hover:bg-primary-500 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Vista tipo Google Calendar */}
        <div className="flex">
          {/* Columna de horas */}
          <div className="w-20 bg-slate-50 border-r border-slate-200">
            <div className="h-16 border-b border-slate-200"></div> {/* Header vacío */}
            {hourlySlots.map((hour, index) => (
              <div key={hour} className="h-16 border-b border-slate-100 flex items-center justify-center">
                <span className="text-xs font-medium text-slate-600">{hour}</span>
              </div>
            ))}
          </div>

          {/* Contenido del calendario */}
          <div className="flex-1">
            {/* Header con áreas */}
            <div className="h-16 border-b border-slate-200 bg-slate-50 flex">
              {filteredAreas.map((area) => (
                <div key={area.id} className="flex-1 border-r border-slate-200 p-2">
                  <div className="text-xs font-medium text-slate-700 truncate">{area.name}</div>
                  <div className="text-xs text-slate-500">
                    {area.category === 'HOT_DESK' ? 'Hot Desk' : 'Sala'}
                  </div>
                </div>
              ))}
            </div>

            {/* Filas de horas */}
            {hourlySlots.map((hour, hourIndex) => (
              <div key={hour} className="h-16 border-b border-slate-100 flex">
                {filteredAreas.map((area, areaIndex) => {
                  const areaStatus = dayAvailability?.areas[area.name];
                  const isWithinOfficeHours = (hour: string): boolean => {
                    if (!state.adminSettings.officeHours) return true;
                    const hour24 = convertTo24Hour(hour);
                    const [hourNum] = hour24.split(':').map(Number);
                    const [startHour] = state.adminSettings.officeHours.start.split(':').map(Number);
                    const [endHour] = state.adminSettings.officeHours.end.split(':').map(Number);
                    return hourNum >= startHour && hourNum < endHour;
                  };

                  return (
                    <div 
                      key={`${area.id}-${hour}`} 
                      className={`flex-1 border-r border-slate-100 relative ${
                        areaIndex === filteredAreas.length - 1 ? 'border-r-0' : ''
                      }`}
                    >
                      {area.category === 'HOT_DESK' ? (
                        // Hot Desk: Mostrar disponibilidad del día completo
                        <div className="h-full flex items-center justify-center">
                          {hourIndex === 0 && areaStatus && (
                            <div className="text-center">
                              <div className={`text-xs font-medium ${
                                (areaStatus.availableSpaces ?? area.capacity) > 0 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                              }`}>
                                {(areaStatus.availableSpaces ?? area.capacity)}/{(areaStatus.totalSpaces ?? area.capacity)}
                              </div>
                              <div className="text-[10px] text-slate-500">libres</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        // Salas: Mostrar disponibilidad por hora
                        <div className="h-full relative">
                          {isWithinOfficeHours(hour) && areaStatus && (
                            (() => {
                              const hourlySlots = areaStatus.hourlySlots ?? {};
                              const hourStatus = hourlySlots[hour];
                              const isAvailable = hourStatus?.isAvailable ?? true;
                              
                              if (isAvailable) {
                                return (
                                  <button
                                    className="w-full h-full bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center justify-center group"
                                    onClick={() => handleHourClick(area, currentDate, hour)}
                                    title={`Reservar ${area.name} a las ${hour}`}
                                  >
                                    <div className="text-xs text-blue-700 font-medium group-hover:text-blue-800">
                                      Disponible
                                    </div>
                                  </button>
                                );
                              } else {
                                return (
                                  <div className="w-full h-full bg-red-50 border border-red-200 flex items-center justify-center">
                                    <div className="text-xs text-red-700 font-medium">
                                      Ocupado
                                    </div>
                                  </div>
                                );
                              }
                            })()
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Resumen del día */}
        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <h4 className="text-lg font-semibold text-slate-900 mb-3">Resumen del día</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {filteredAreas.filter(area => area.category === 'HOT_DESK').length}
              </div>
              <div className="text-sm text-slate-600">Áreas Hot Desk</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {filteredAreas.filter(area => area.category === 'SALA').length}
              </div>
              <div className="text-sm text-slate-600">Salas de Reunión</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {hourlySlots.length}
              </div>
              <div className="text-sm text-slate-600">Horarios de oficina</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {filteredAreas.length}
              </div>
              <div className="text-sm text-slate-600">Total de áreas</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header del Calendario */}
      <div className="bg-white rounded-2xl shadow-soft border border-white/20 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gradient-primary">Disponibilidad</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={goToCurrentDay}
              className="btn-secondary"
            >
              Hoy
            </button>
            {viewMode === 'day' && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={goToPreviousDay}
                  className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <button
                  onClick={goToNextDay}
                  className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            )}
            {viewMode === 'day' && (
              <div className="text-lg font-semibold text-slate-900">
                {formatDateForDisplay(currentDate)}
              </div>
            )}
          </div>
        </div>

        {/* Controles de Vista */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Selector de Vista */}
            <div className="flex bg-slate-100 rounded-xl p-1">
              {(['total', 'week', 'day'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleViewModeChange(mode)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    viewMode === mode
                      ? 'bg-white text-slate-900 shadow-soft'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode === 'total' ? 'Total (15 días)' : mode === 'week' ? 'Semana (7 días)' : 'Día'}
                </button>
              ))}
            </div>
          </div>

          <button 
            className="btn-primary"
            onClick={onNewReservation}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Reserva
          </button>
        </div>
      </div>

      {/* Filtro de Áreas */}
      <div className="bg-white rounded-2xl shadow-soft border border-white/20 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center">
            <Filter className="w-5 h-5 mr-2 text-primary-600" />
            Filtro de Áreas
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={selectAllAreas}
              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
            >
              Seleccionar Todas
            </button>
            <button
              onClick={deselectAllAreas}
              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              Deseleccionar Todas
            </button>
          </div>
        </div>

        {/* Botones de filtro rápido */}
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={selectHotDeskAreas}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            Solo Hot Desk
          </button>
          <button
            onClick={selectSalaAreas}
            className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
          >
            Solo Salas
          </button>
        </div>

        {/* Lista de áreas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {state.areas.map((area) => (
            <div
              key={area.id}
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                selectedAreas.includes(area.id)
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300'
              }`}
              onClick={() => toggleAreaSelection(area.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{area.name}</div>
                  <div className="text-xs text-slate-600">
                    {area.category === 'HOT_DESK' ? 'Hot Desk' : 'Sala de Reunión'} • {area.capacity} {area.category === 'HOT_DESK' ? 'puestos' : 'personas'}
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  selectedAreas.includes(area.id)
                    ? 'bg-primary-500 border-primary-500'
                    : 'border-slate-300'
                }`}>
                  {selectedAreas.includes(area.id) && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Información del Filtro Activo */}
        {selectedAreas.length > 0 && (
          <div className="mt-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-primary-600" />
                <span className="text-sm font-medium text-primary-800">
                  Áreas seleccionadas: {selectedAreas.length} de {state.areas.length}
                </span>
                <span className="text-xs text-primary-600">
                  ({filteredAreas.length} mostradas)
                </span>
              </div>
              <button
                onClick={deselectAllAreas}
                className="text-xs text-primary-600 hover:text-primary-800 underline"
              >
                Limpiar filtro
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Contenido principal según el modo de vista */}
      {viewMode === 'day' ? (
        renderDayView()
      ) : (
        /* Calendario Principal para vistas Total y Semana */
        <div className="bg-white rounded-2xl shadow-soft border border-white/20 overflow-hidden">
          {/* Header de días de la semana - Solo días habilitados */}
          <div className={`grid bg-slate-50/80 backdrop-blur-sm border-b border-slate-200`} 
               style={{ gridTemplateColumns: `repeat(${enabledWeekDays.length}, 1fr)` }}>
            {enabledWeekDays.map((day) => (
              <div key={day} className="p-4 text-center">
                <div className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  {day}
                </div>
              </div>
            ))}
          </div>

          {/* Días del calendario - Solo días habilitados */}
          <div className={`grid`} style={{ gridTemplateColumns: `repeat(${enabledWeekDays.length}, 1fr)` }}>
            {daysToShow.map((date, index) => {
              const dateString = date.toISOString().split('T')[0];
              const dayAvailability = availability.find(day => day.date === dateString);
              const isTodayDate = isToday(date);
              
              return (
                <div
                  key={index}
                  className={`min-h-[120px] border-r border-b border-slate-100 p-2 ${
                    isTodayDate ? 'bg-primary-50/30' : 'bg-white'
                  }`}
                >
                  {/* Número del día */}
                  <div className={`text-sm font-medium mb-2 ${
                    isTodayDate 
                      ? 'text-primary-600 font-bold' 
                      : 'text-slate-900'
                  }`}>
                    {date.getDate()}
                    {isTodayDate && (
                      <span className="ml-1 text-xs bg-primary-600 text-white px-2 py-1 rounded-full">
                        HOY
                      </span>
                    )}
                  </div>

                  {/* Eventos/Disponibilidad del día */}
                  <div className="space-y-1">
                    {filteredAreas.map((area) => {
                      if (!dayAvailability?.areas[area.name]) return null;
                      
                      const areaStatus = dayAvailability.areas[area.name];
                      
                      if (area.category === 'HOT_DESK') {
                        // Hot Desk: Mostrar contador de espacios
                        const availableSpaces = areaStatus.availableSpaces ?? area.capacity;
                        const totalSpaces = areaStatus.totalSpaces ?? area.capacity;
                        const isAvailable = availableSpaces > 0;
                        
                        return (
                          <div
                            key={area.id}
                            className={`text-xs p-1 rounded border ${
                              isAvailable 
                                ? 'bg-green-50 border-green-200 text-green-800' 
                                : 'bg-red-50 border-red-200 text-red-800'
                            }`}
                          >
                            <div className="font-medium truncate">{area.name}</div>
                            <div className="text-[10px]">
                              {availableSpaces}/{totalSpaces} libres
                            </div>
                          </div>
                        );
                      } else {
                        // Salas: Mostrar bloques de hora individuales (solo horarios disponibles)
                        const hourlySlots = areaStatus.hourlySlots ?? {};
                        const availableHours = generateHourlySlots().filter(hour => {
                          const hourStatus = hourlySlots[hour];
                          // Solo mostrar horarios que estén disponibles Y dentro del horario de oficina
                          return (hourStatus?.isAvailable ?? true) && isWithinOfficeHours(hour);
                        });
                        
                        if (availableHours.length === 0) return null;
                        
                        // Mostrar bloques de hora individuales para salas
                        return (
                          <div key={area.id} className="space-y-1">
                            <div className="text-[10px] font-medium text-slate-700 truncate">
                              {area.name}
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                              {availableHours.slice(0, 4).map((hour) => (
                                <button
                                  key={hour}
                                  className="text-[8px] p-1 rounded border bg-blue-50 border-blue-200 text-blue-800 cursor-pointer hover:bg-blue-100 transition-colors"
                                  onClick={() => handleHourClick(area, date, hour)}
                                  title={`Reservar ${area.name} a las ${hour}`}
                                >
                                  {hour}
                                </button>
                              ))}
                              {availableHours.length > 4 && (
                                <div className="text-[8px] p-1 rounded border bg-blue-100 border-blue-300 text-blue-900 text-center">
                                  +{availableHours.length - 4}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Información adicional */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-soft border border-white/20 p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-primary-600" />
            Resumen de Disponibilidad
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Total de áreas:</span>
              <span className="font-medium">{state.areas.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Áreas seleccionadas:</span>
              <span className="font-medium">{selectedAreas.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Áreas mostradas:</span>
              <span className="font-medium">{filteredAreas.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Días de oficina mostrados:</span>
              <span className="font-medium">{daysToShow.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Días habilitados:</span>
              <span className="font-medium">{enabledWeekDays.join(', ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Período:</span>
              <span className="font-medium">
                {daysToShow.length > 0 && (
                  <>
                    {formatDateForDisplay(daysToShow[0])} - {formatDateForDisplay(daysToShow[daysToShow.length - 1])}
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-soft border border-white/20 p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Leyenda</h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-100 border border-green-200 rounded mr-2"></div>
              <span className="text-slate-700">Hot Desk disponible</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded mr-2"></div>
              <span className="text-slate-700">Sala con horarios libres</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-100 border border-red-200 rounded mr-2"></div>
              <span className="text-slate-700">Hot Desk ocupado</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-primary-100 border border-primary-200 rounded mr-2"></div>
              <span className="text-slate-700">Día actual</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-slate-100 border border-slate-200 rounded mr-2"></div>
              <span className="text-slate-700">Solo días de oficina habilitados</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-soft border border-white/20 p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Instrucciones</h4>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              <strong>Vista Total:</strong> Muestra los próximos 15 días de oficina
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              <strong>Vista Semana:</strong> Muestra los próximos 7 días de oficina
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              <strong>Vista Día:</strong> Muestra el día completo con bloques de horas disponibles
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              <strong>Filtro de áreas:</strong> Selecciona las áreas que quieres ver
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              <strong>Días de oficina:</strong> Solo se muestran los días habilitados (no sábados/domingos)
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              <strong>Horarios de oficina:</strong> Solo se muestran horarios habilitados
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              <strong>Bloques de hora:</strong> Las salas muestran horarios individuales clickeables
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              <strong>Reservas:</strong> Haz clic en cualquier bloque azul para crear una reserva
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              <strong>Hoy:</strong> El día actual está marcado con "HOY"
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
