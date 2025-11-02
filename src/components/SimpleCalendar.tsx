import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, Filter } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { normalizeUTCDateToLocal } from '../utils/unifiedDateUtils';

interface DayAvailability {
  date: string;
  areas: {
    [areaName: string]: {
      isAvailable: boolean;
      reservations: any[];
      availableSpaces?: number;
      totalSpaces?: number;
    };
  };
}

interface SimpleCalendarProps {
  onHourClick?: (area: any, date: string, hour: string) => void;
  onNewReservation?: () => void;
}

export function SimpleCalendar({ onHourClick, onNewReservation }: SimpleCalendarProps) {
  const { state } = useApp();
  
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'total' | 'week' | 'day'>('total');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  // Función simple para verificar si es día de oficina
  const isOfficeDay = (date: Date): boolean => {
    if (!state.adminSettings.officeDays) return true;
    
    const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Lunes, etc.
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
    return state.adminSettings.officeDays[dayKey as keyof typeof state.adminSettings.officeDays] || false;
  };

  // Función simple para obtener el nombre del día
  const getDayName = (date: Date, short: boolean = false): string => {
    const dayNames = {
      short: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
      long: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    };
    
    const dayIndex = date.getDay();
    return dayNames[short ? 'short' : 'long'][dayIndex];
  };

  // Función simple para formatear fecha
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Función simple para verificar si es hoy
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Generar los próximos 15 días de oficina
  const generateNext15Days = (): Date[] => {
    const days: Date[] = [];
    const today = new Date();
    let currentDate = new Date(today);
    let daysFound = 0;
    
    console.log('🔍 [SimpleCalendar] Generando próximos 15 días de oficina desde:', today.toDateString());
    
    // Buscar los próximos 15 días de oficina
    while (daysFound < 15) {
      if (isOfficeDay(currentDate)) {
        const dayName = getDayName(currentDate, true);
        const dateString = formatDate(currentDate);
        console.log('🔍 [SimpleCalendar] Día de oficina encontrado:', {
          index: daysFound + 1,
          dateString,
          dayName,
          dayIndex: currentDate.getDay(),
          fullDate: currentDate.toDateString()
        });
        days.push(new Date(currentDate));
        daysFound++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log('🔍 [SimpleCalendar] Total días de oficina generados:', days.length);
    return days;
  };

  // Cargar disponibilidad
  const loadAvailability = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const reservations = state.reservations;
      const areas = state.areas.filter(area => area.isActive !== false);

      console.log('🔍 [SimpleCalendar] Estado global de reservaciones:', {
        totalReservations: reservations.length,
        hotDeskReservations: reservations.filter(r => r.area === 'Hot Desk'),
        reservationsFor09_10: reservations.filter(r => {
          const reservationDate = normalizeUTCDateToLocal(r.date);
          return reservationDate === '2025-09-10';
        }),
        allReservations: reservations.map(r => ({
          _id: r._id,
          area: r.area,
          date: r.date,
          status: r.status,
          requestedSeats: r.requestedSeats
        }))
      });

      // Generar disponibilidad para los próximos 15 días de oficina
      const days = generateNext15Days();
      const availabilityData: DayAvailability[] = days.map(date => {
        const dateString = formatDate(date);
        const dayReservations = reservations.filter(reservation => {
          // Normalizar la fecha de la reservación del backend (UTC) a formato local
          const reservationDate = normalizeUTCDateToLocal(reservation.date);
          return reservationDate === dateString && reservation.status === 'confirmed';
        });

        console.log(`🔍 [SimpleCalendar] Procesando fecha ${dateString}:`, {
          dateString,
          dayName: getDayName(date, true),
          dayIndex: date.getDay(),
          dayReservations: dayReservations.length,
          reservations: dayReservations.map(r => ({
            _id: r._id,
            area: r.area,
            date: r.date,
            status: r.status,
            requestedSeats: r.requestedSeats
          }))
        });

        const areasData: { [areaName: string]: any } = {};
        
        areas.forEach(area => {
          const areaReservations = dayReservations.filter(reservation => 
            reservation.area === area.name
          );
          
          const totalReservedSeats = areaReservations.reduce((total, reservation) => {
            return total + (reservation.requestedSeats || 0);
          }, 0);
          
          const availableSpaces = Math.max(0, area.capacity - totalReservedSeats);
          
          console.log(`🔍 [SimpleCalendar] Área ${area.name} para ${dateString}:`, {
            areaName: area.name,
            totalCapacity: area.capacity,
            areaReservations: areaReservations.length,
            totalReservedSeats,
            availableSpaces
          });
          
          areasData[area.name] = {
            isAvailable: availableSpaces > 0,
            reservations: areaReservations,
            availableSpaces,
            totalSpaces: area.capacity
          };
        });

        return {
          date: dateString,
          areas: areasData
        };
      });

      setAvailability(availabilityData);
    } catch (error) {
      console.error('Error cargando disponibilidad:', error);
      setError('Error al cargar la disponibilidad');
    } finally {
      setIsLoading(false);
    }
  }, [state.areas, state.adminSettings, state.reservations]);

  useEffect(() => {
    if (state.areas.length > 0) {
      loadAvailability();
    }
  }, [state.areas, state.reservations, loadAvailability]);

  // Escuchar eventos de actualización de reservaciones
  useEffect(() => {
    const handleReservationsUpdate = (event: CustomEvent) => {
      console.log('🔄 [SimpleCalendar] Evento de actualización recibido:', event.detail);
      if (state.areas.length > 0) {
        loadAvailability();
      }
    };

    window.addEventListener('reservationsUpdated', handleReservationsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('reservationsUpdated', handleReservationsUpdate as EventListener);
    };
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

  // Obtener días habilitados (lunes a viernes)
  const enabledWeekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
  
  // Obtener días a mostrar según el modo de vista
  let daysToShow: Date[] = [];
  
  if (viewMode === 'total') {
    daysToShow = generateNext15Days();
  } else if (viewMode === 'week') {
    // Mostrar la semana actual
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Lunes
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      if (isOfficeDay(date)) {
        daysToShow.push(date);
      }
    }
  } else if (viewMode === 'day') {
    // Mostrar solo el día actual o el siguiente día hábil
    const today = new Date();
    if (isOfficeDay(today)) {
      daysToShow = [today];
    } else {
      // Buscar el siguiente día de oficina
      const nextOfficeDay = new Date(today);
      nextOfficeDay.setDate(today.getDate() + 1);
      while (!isOfficeDay(nextOfficeDay)) {
        nextOfficeDay.setDate(nextOfficeDay.getDate() + 1);
      }
      daysToShow = [nextOfficeDay];
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disponibilidad</h1>
          <p className="text-gray-600">Consulta la disponibilidad de espacios de trabajo</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onNewReservation}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nueva Reserva
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Modo de vista */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Vista:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { key: 'total', label: 'Total' },
                { key: 'week', label: 'Semana' },
                { key: 'day', label: 'Día' }
              ].map((mode) => (
                <button
                  key={mode.key}
                  onClick={() => setViewMode(mode.key as any)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === mode.key
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro de áreas */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Áreas:</span>
            <div className="flex flex-wrap gap-2">
              {state.areas.map((area) => (
                <button
                  key={area._id}
                  onClick={() => {
                    if (selectedAreas.includes(area.name)) {
                      setSelectedAreas(selectedAreas.filter(a => a !== area.name));
                    } else {
                      setSelectedAreas([...selectedAreas, area.name]);
                    }
                  }}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    selectedAreas.includes(area.name)
                      ? 'bg-primary-100 border-primary-300 text-primary-700'
                      : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {area.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Calendario */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header del calendario */}
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {viewMode === 'total' && 'Próximos 15 días'}
              {viewMode === 'week' && 'Esta semana'}
              {viewMode === 'day' && 'Hoy'}
            </h2>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  if (viewMode === 'total') {
                    newDate.setDate(newDate.getDate() - 15);
                  } else if (viewMode === 'week') {
                    newDate.setDate(newDate.getDate() - 7);
                  } else {
                    newDate.setDate(newDate.getDate() - 1);
                  }
                  setCurrentDate(newDate);
                }}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  if (viewMode === 'total') {
                    newDate.setDate(newDate.getDate() + 15);
                  } else if (viewMode === 'week') {
                    newDate.setDate(newDate.getDate() + 7);
                  } else {
                    newDate.setDate(newDate.getDate() + 1);
                  }
                  setCurrentDate(newDate);
                }}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Días del calendario */}
        <div className="p-4">
          <div className="grid gap-4">
            {daysToShow.map((date, index) => {
              const dateString = formatDate(date);
              const dayAvailability = availability.find(day => day.date === dateString);
              const isTodayDate = isToday(date);
              
              console.log('🔍 [SimpleCalendar] Fecha mostrada en calendario:', {
                index,
                dateString,
                dayName: getDayName(date, true),
                dayIndex: date.getDay(),
                isToday: isTodayDate,
                fullDate: date.toDateString()
              });
              
              return (
                <div
                  key={index}
                  className={`border border-gray-200 rounded-lg p-4 ${
                    isTodayDate ? 'bg-primary-50 border-primary-200' : 'bg-white'
                  }`}
                >
                  {/* Header del día */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-600">
                          {getDayName(date, true)}
                        </div>
                        <div className="text-lg font-semibold text-gray-900">
                          {date.getDate()}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {date.toLocaleDateString('es-ES', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </div>
                      {isTodayDate && (
                        <span className="bg-primary-100 text-primary-700 text-xs font-medium px-2 py-1 rounded-full">
                          Hoy
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Áreas disponibles */}
                  <div className="grid gap-3">
                    {state.areas
                      .filter(area => selectedAreas.length === 0 || selectedAreas.includes(area.name))
                      .map((area) => {
                        const areaData = dayAvailability?.areas[area.name];
                        const availableSpaces = areaData?.availableSpaces || area.capacity;
                        const totalSpaces = areaData?.totalSpaces || area.capacity;
                        const isAvailable = availableSpaces > 0;
                        
                        return (
                          <div
                            key={area._id}
                            className={`p-3 rounded-lg border ${
                              isAvailable
                                ? 'bg-green-50 border-green-200'
                                : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: area.color }}
                                ></div>
                                <span className="font-medium text-gray-900">
                                  {area.name}
                                </span>
                              </div>
                              
                              <div className="text-right">
                                <div className={`text-sm font-medium ${
                                  isAvailable ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  {availableSpaces}/{totalSpaces} disponibles
                                </div>
                                <div className="text-xs text-gray-500">
                                  Capacidad: {totalSpaces} puestos
                                </div>
                              </div>
                            </div>
                            
                            {areaData?.reservations && areaData.reservations.length > 0 && (
                              <div className="mt-2 text-xs text-gray-600">
                                {areaData.reservations.length} reserva(s) activa(s)
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
