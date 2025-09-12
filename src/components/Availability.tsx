import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Users, Clock, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isOfficeDay, createLocalDate, formatDateToString, getDayName } from '../utils/unifiedDateUtils';

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

interface AvailabilityProps {
  onHourClick?: (area: any, date: string, hour: string) => void;
  onNewReservation?: () => void;
  onAreaClick?: (area: any, date: string) => void;
}

interface Reservation {
  _id: string;
  area: string;
  date: string;
  startTime: string;
  endTime: string;
  teamName: string;
  requestedSeats: number;
  status: string;
  colaboradores: string[];
  attendees: string[];
  notes?: string;
  createdBy: {
    userId: string;
    userName: string;
    userEmail: string;
    userRole: string;
  };
  createdAt: string;
  updatedAt: string;
}

export function Availability({ onHourClick, onNewReservation, onAreaClick }: AvailabilityProps) {
  const { state } = useApp();
  
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'total' | 'week' | 'day'>('total');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [showReservationsModal, setShowReservationsModal] = useState(false);
  const [selectedAreaReservations, setSelectedAreaReservations] = useState<{
    area: string;
    date: string;
    reservations: Reservation[];
  } | null>(null);

  // Usar la función isOfficeDay del sistema unificado
  const isOfficeDayLocal = (date: Date): boolean => {
    return isOfficeDay(date, state.adminSettings.officeDays);
  };

  // Usar la función getDayName del sistema unificado
  const getDayNameLocal = (date: Date, short: boolean = false): string => {
    return getDayName(date, short);
  };

  // Usar la función formatDateToString del sistema unificado
  const formatDate = (date: Date): string => {
    return formatDateToString(date);
  };

  // Usar la función isToday del sistema unificado
  const isTodayLocal = (date: Date): boolean => {
    const today = new Date();
    return formatDateToString(date) === formatDateToString(today);
  };

  // Función para manejar el clic en reservas activas
  const handleReservationsClick = (area: string, date: string, reservations: Reservation[]) => {
    setSelectedAreaReservations({
      area,
      date,
      reservations
    });
    setShowReservationsModal(true);
  };

  // Función para formatear fecha y hora
  const formatDateTime = (dateString: string, timeString: string): string => {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    return `${formattedDate} ${timeString}`;
  };

  // Función para obtener el nombre de usuario por ID
  const getUserName = (userId: string): string => {
    const user = state.users.find(u => u._id === userId);
    return user ? user.name : 'Usuario no encontrado';
  };

  // Generar los próximos 15 días de oficina
  const generateNext15Days = (): Date[] => {
    const days: Date[] = [];
    const today = new Date();
    let currentDate = new Date(today);
    let daysFound = 0;
    
    console.log('🔍 [Availability] Generando próximos 15 días de oficina desde:', today.toDateString());
    
    // Buscar los próximos 15 días de oficina
    while (daysFound < 15) {
      if (isOfficeDayLocal(currentDate)) {
        const dayName = getDayNameLocal(currentDate, true);
        const dateString = formatDate(currentDate);
        console.log('🔍 [Availability] Día de oficina encontrado:', {
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
    
    console.log('🔍 [Availability] Total días de oficina generados:', days.length);
    return days;
  };

  // Cargar disponibilidad
  const loadAvailability = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const reservations = state.reservations;
      const areas = state.areas;

      console.log('🔍 [Availability] Estado global de reservaciones:', {
        totalReservations: reservations.length,
        hotDeskReservations: reservations.filter(r => r.area === 'Hot Desk'),
        reservationsFor09_10: reservations.filter(r => {
          // Normalizar fecha de reservación
          let reservationDate: string;
          if (r.date.includes('T')) {
            reservationDate = r.date.split('T')[0];
          } else {
            reservationDate = r.date;
          }
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
          // Normalizar la fecha de la reservación para comparación
          let reservationDate: string;
          if (reservation.date.includes('T')) {
            reservationDate = reservation.date.split('T')[0];
          } else {
            reservationDate = reservation.date;
          }
          return reservationDate === dateString && reservation.status === 'confirmed';
        });

        console.log(`🔍 [Availability] Procesando fecha ${dateString}:`, {
          dateString,
          dayName: getDayNameLocal(date, true),
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
          
          console.log(`🔍 [Availability] Área ${area.name} para ${dateString}:`, {
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
      console.log('🔄 [Availability] Evento de actualización recibido:', event.detail);
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
    // Mostrar los días restantes de la semana actual, incluyendo hoy
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Domingo, 1 = Lunes, etc.
    
    console.log('🔍 [Availability] Modo semana - Día actual:', {
      today: today.toDateString(),
      currentDay,
      dayName: getDayNameLocal(today, true)
    });
    
    // Si es domingo (0), empezar desde hoy
    // Si es lunes a viernes (1-5), empezar desde hoy
    // Si es sábado (6), mostrar solo hoy
    const startDay = currentDay === 0 ? 0 : currentDay; // Empezar desde hoy o domingo
    
    for (let i = startDay; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + (i - currentDay));
      
      console.log('🔍 [Availability] Procesando día de la semana:', {
        i,
        date: date.toDateString(),
        dayName: getDayNameLocal(date, true),
        isOfficeDayLocal: isOfficeDayLocal(date)
      });
      
      if (isOfficeDayLocal(date)) {
        daysToShow.push(date);
      }
    }
    
    console.log('🔍 [Availability] Días de la semana generados:', daysToShow.length);
  } else if (viewMode === 'day') {
    // Mostrar solo el día actual o el siguiente día hábil
    const today = new Date();
    if (isOfficeDayLocal(today)) {
      daysToShow = [today];
    } else {
      // Buscar el siguiente día de oficina
      const nextOfficeDay = new Date(today);
      nextOfficeDay.setDate(today.getDate() + 1);
      while (!isOfficeDayLocal(nextOfficeDay)) {
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
              const isTodayLocalDate = isTodayLocal(date);
              
              console.log('🔍 [Availability] Fecha mostrada en calendario:', {
                index,
                dateString,
                dayName: getDayNameLocal(date, true),
                dayIndex: date.getDay(),
                isTodayLocal: isTodayLocalDate,
                fullDate: date.toDateString()
              });
              
              return (
                <div
                  key={index}
                  className={`border border-gray-200 rounded-lg p-4 ${
                    isTodayLocalDate ? 'bg-primary-50 border-primary-200' : 'bg-white'
                  }`}
                >
                  {/* Header del día */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-600">
                          {getDayNameLocal(date, true)}
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
                      {isTodayLocalDate && (
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
                            onClick={() => {
                              if (isAvailable && onAreaClick) {
                                onAreaClick(area, dateString);
                              }
                            }}
                            className={`p-3 rounded-lg border transition-all duration-200 ${
                              isAvailable
                                ? 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300 cursor-pointer'
                                : 'bg-red-50 border-red-200 cursor-not-allowed'
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
                                {isAvailable && (
                                  <div className="text-xs text-blue-600 font-medium mt-1">
                                    Click para reservar
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {areaData?.reservations && areaData.reservations.length > 0 && (
                              <div 
                                className="mt-2 text-xs text-blue-600 font-medium cursor-pointer hover:text-blue-800 hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReservationsClick(area.name, dateString, areaData.reservations);
                                }}
                              >
                                {areaData.reservations.length} reserva(s) activa(s) - Click para ver
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

      {/* Modal de reservas activas */}
      {showReservationsModal && selectedAreaReservations && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header del modal */}
            <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Reservas Activas - {selectedAreaReservations.area}
                </h3>
                <p className="text-sm text-gray-600">
                  {new Date(selectedAreaReservations.date).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <button
                onClick={() => setShowReservationsModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              {selectedAreaReservations.reservations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay reservas activas para esta área en esta fecha</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedAreaReservations.reservations.map((reservation) => (
                    <div
                      key={reservation._id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {reservation.teamName}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Creada por {reservation.createdBy.userName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {reservation.requestedSeats} puesto(s)
                          </div>
                          <div className="text-xs text-gray-500">
                            {reservation.startTime} - {reservation.endTime}
                          </div>
                        </div>
                      </div>

                      {/* Información de colaboradores */}
                      {reservation.colaboradores && reservation.colaboradores.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">
                              Colaboradores ({reservation.colaboradores.length})
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {reservation.colaboradores.map((userId, index) => (
                              <span
                                key={index}
                                className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                              >
                                {getUserName(userId)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Información adicional */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              Creada: {new Date(reservation.createdAt).toLocaleDateString('es-ES')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span className="capitalize">{reservation.status}</span>
                          </div>
                        </div>
                        {reservation.notes && (
                          <div className="text-gray-600 italic">
                            "{reservation.notes}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer del modal */}
            <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-end">
              <button
                onClick={() => setShowReservationsModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}