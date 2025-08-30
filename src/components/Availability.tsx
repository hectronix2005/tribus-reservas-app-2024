import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, Filter } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { reservationService } from '../services/api';

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
}

export function Availability({ onHourClick }: AvailabilityProps) {
  const { state } = useApp();
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'total' | 'week' | 'day'>('total');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]); // Array de IDs de áreas seleccionadas

  // Generar los próximos 15 días a partir de hoy
  const generateNext15Days = (): Date[] => {
    const days: Date[] = [];
    const today = new Date();
    
    for (let i = 0; i < 15; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
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

  // Navegar al día anterior
  const goToPreviousDay = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  // Navegar al día siguiente
  const goToNextDay = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  };

  // Ir al día actual
  const goToCurrentDay = () => {
    setCurrentDate(new Date());
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

      // Generar disponibilidad para los próximos 15 días
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
  }, [state.areas]);

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
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'America/Bogota'
    });
  };

  // Obtener días según el modo de vista
  const getDaysToShow = () => {
    if (viewMode === 'total') {
      return days;
    } else if (viewMode === 'week') {
      // Mostrar 7 días a partir del día actual
      const today = new Date();
      const weekDays: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        weekDays.push(date);
      }
      return weekDays;
    } else { // day
      return [currentDate];
    }
  };

  const daysToShow = getDaysToShow();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header del Calendario */}
      <div className="bg-white rounded-2xl shadow-soft border border-white/20 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gradient-primary">Disponibilidad</h1>
            <p className="text-slate-600 mt-2">Vista de calendario de los próximos 15 días</p>
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
                  onClick={() => setViewMode(mode)}
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

          <button className="btn-primary">
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

      {/* Calendario Principal */}
      <div className="bg-white rounded-2xl shadow-soft border border-white/20 overflow-hidden">
        {/* Header de días de la semana */}
        <div className="grid grid-cols-7 bg-slate-50/80 backdrop-blur-sm border-b border-slate-200">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
            <div key={day} className="p-4 text-center">
              <div className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
                {day}
              </div>
            </div>
          ))}
        </div>

        {/* Días del calendario */}
        <div className="grid grid-cols-7">
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
                      // Salas: Mostrar bloques de hora individuales
                      const hourlySlots = areaStatus.hourlySlots ?? {};
                      const availableHours = generateHourlySlots().filter(hour => {
                        const hourStatus = hourlySlots[hour];
                        return hourStatus?.isAvailable ?? true;
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
              <span className="text-slate-600">Días mostrados:</span>
              <span className="font-medium">{daysToShow.length}</span>
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
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-soft border border-white/20 p-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4">Instrucciones</h4>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              <strong>Vista Total:</strong> Muestra los próximos 15 días
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              <strong>Vista Semana:</strong> Muestra los próximos 7 días
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              <strong>Vista Día:</strong> Muestra un día específico con navegación
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              <strong>Filtro de áreas:</strong> Selecciona las áreas que quieres ver
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
