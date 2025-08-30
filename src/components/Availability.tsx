import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, Filter, Clock } from 'lucide-react';
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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [areaFilter, setAreaFilter] = useState<string>('all'); // Filtro general
  const [selectedArea, setSelectedArea] = useState<string>('all'); // Área específica seleccionada

  // Generar días del mes actual
  const generateMonthDays = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: Date[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= lastDay || days.length < 42) {
      days.push(new Date(currentDate));
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

  // Verificar si es el mes actual
  const isCurrentMonth = (date: Date): boolean => {
    const today = new Date();
    return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
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

  // Navegar al mes anterior
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() - 1);
      return newMonth;
    });
  };

  // Navegar al mes siguiente
  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() + 1);
      return newMonth;
    });
  };

  // Ir al mes actual
  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  // Obtener áreas filtradas según el filtro seleccionado
  const getFilteredAreas = () => {
    let filteredAreas = state.areas;

    // Aplicar filtro por categoría
    if (areaFilter === 'hot_desk') {
      filteredAreas = state.areas.filter(area => area.category === 'HOT_DESK');
    } else if (areaFilter === 'meeting_rooms') {
      filteredAreas = state.areas.filter(area => area.category === 'SALA');
    }

    // Aplicar filtro por área específica
    if (selectedArea !== 'all') {
      filteredAreas = filteredAreas.filter(area => area.id === selectedArea);
    }

    return filteredAreas;
  };

  // Obtener opciones de áreas para el selector
  const getAreaOptions = () => {
    const hotDeskAreas = state.areas.filter(area => area.category === 'HOT_DESK');
    const salaAreas = state.areas.filter(area => area.category === 'SALA');
    
    return {
      hotDesk: hotDeskAreas,
      salas: salaAreas
    };
  };

  // Limpiar filtros
  const clearFilters = () => {
    setAreaFilter('all');
    setSelectedArea('all');
  };

  // Cargar disponibilidad
  const loadAvailability = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const reservations = await reservationService.getAllReservations();
      const areas = state.areas;

      // Generar disponibilidad para el mes actual
      const monthDays = generateMonthDays(currentMonth);
      const availabilityData: DayAvailability[] = monthDays.map(date => {
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
  }, [state.areas, currentMonth]);

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

  const monthDays = generateMonthDays(currentMonth);
  const monthName = currentMonth.toLocaleDateString('es-ES', { 
    month: 'long', 
    year: 'numeric',
    timeZone: 'America/Bogota'
  });
  const filteredAreas = getFilteredAreas();
  const areaOptions = getAreaOptions();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header del Calendario */}
      <div className="bg-white rounded-2xl shadow-soft border border-white/20 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gradient-primary">Disponibilidad</h1>
            <p className="text-slate-600 mt-2">Vista de calendario estilo Google Calendar</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={goToCurrentMonth}
              className="btn-secondary"
            >
              Hoy
            </button>
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPreviousMonth}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <button
                onClick={goToNextMonth}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="text-xl font-semibold text-slate-900 capitalize">
              {monthName}
            </div>
          </div>
        </div>

        {/* Controles de Vista y Filtros */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Selector de Vista */}
            <div className="flex bg-slate-100 rounded-xl p-1">
              {(['month', 'week', 'day'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    viewMode === mode
                      ? 'bg-white text-slate-900 shadow-soft'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode === 'month' ? 'Mes' : mode === 'week' ? 'Semana' : 'Día'}
                </button>
              ))}
            </div>

            {/* Filtro de Categoría */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-600" />
              <select
                value={areaFilter}
                onChange={(e) => {
                  setAreaFilter(e.target.value);
                  setSelectedArea('all'); // Reset área específica cuando cambia categoría
                }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              >
                <option value="all">Todas las áreas</option>
                <option value="hot_desk">Solo Hot Desk</option>
                <option value="meeting_rooms">Solo Salas de Reunión</option>
              </select>
            </div>

            {/* Filtro de Área Específica */}
            {areaFilter !== 'all' && (
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                >
                  <option value="all">
                    {areaFilter === 'hot_desk' ? 'Todas las áreas Hot Desk' : 'Todas las salas'}
                  </option>
                  {areaFilter === 'hot_desk' && areaOptions.hotDesk.map(area => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                  {areaFilter === 'meeting_rooms' && areaOptions.salas.map(area => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Reserva
          </button>
        </div>

        {/* Información del Filtro Activo */}
        {(areaFilter !== 'all' || selectedArea !== 'all') && (
          <div className="mt-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-primary-600" />
                <span className="text-sm font-medium text-primary-800">
                  Filtro activo: {
                    areaFilter === 'hot_desk' ? 'Hot Desk' : 
                    areaFilter === 'meeting_rooms' ? 'Salas de Reunión' : 
                    'Todas las áreas'
                  }
                  {selectedArea !== 'all' && (
                    <span> - {state.areas.find(a => a.id === selectedArea)?.name}</span>
                  )}
                </span>
                <span className="text-xs text-primary-600">
                  ({filteredAreas.length} {filteredAreas.length === 1 ? 'área' : 'áreas'} mostradas)
                </span>
              </div>
              <button
                onClick={clearFilters}
                className="text-xs text-primary-600 hover:text-primary-800 underline"
              >
                Limpiar filtros
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
          {monthDays.map((date, index) => {
            const dateString = date.toISOString().split('T')[0];
            const dayAvailability = availability.find(day => day.date === dateString);
            const isCurrentMonthDay = isCurrentMonth(date);
            const isTodayDate = isToday(date);
            
            return (
              <div
                key={index}
                className={`min-h-[120px] border-r border-b border-slate-100 p-2 ${
                  !isCurrentMonthDay ? 'bg-slate-50/50' : 'bg-white'
                } ${isTodayDate ? 'bg-primary-50/30' : ''}`}
              >
                {/* Número del día */}
                <div className={`text-sm font-medium mb-2 ${
                  isTodayDate 
                    ? 'text-primary-600 font-bold' 
                    : !isCurrentMonthDay 
                      ? 'text-slate-400' 
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
                      
                      // Si solo hay una sala seleccionada, mostrar bloques de hora individuales
                      if (selectedArea === area.id || (selectedArea === 'all' && areaFilter === 'meeting_rooms')) {
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
                      } else {
                        // Vista general: mostrar resumen
                        return (
                          <div
                            key={area.id}
                            className="text-xs p-1 rounded border bg-blue-50 border-blue-200 text-blue-800 cursor-pointer hover:bg-blue-100 transition-colors"
                            onClick={() => handleHourClick(area, date, availableHours[0])}
                            title={`${area.name} - ${availableHours.length} horarios disponibles`}
                          >
                            <div className="font-medium truncate">{area.name}</div>
                            <div className="text-[10px]">
                              {availableHours.length} horarios libres
                            </div>
                          </div>
                        );
                      }
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
            Resumen del Mes
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Total de áreas:</span>
              <span className="font-medium">{state.areas.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Áreas mostradas:</span>
              <span className="font-medium">{filteredAreas.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Días mostrados:</span>
              <span className="font-medium">{monthDays.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Mes actual:</span>
              <span className="font-medium capitalize">{monthName}</span>
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
              <strong>Filtros:</strong> Usa los selectores para filtrar por categoría y área específica
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
              <strong>Navegación:</strong> Usa las flechas para cambiar de mes
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
