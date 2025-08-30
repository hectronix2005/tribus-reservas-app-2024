import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, MapPin, CheckCircle, XCircle } from 'lucide-react';
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

  // Generar los próximos 15 días
  const generateNext15Days = (): string[] => {
    const days: string[] = [];
    const today = new Date();
    
    for (let i = 0; i < 15; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      days.push(`${year}-${month}-${day}`);
    }
    
    return days;
  };

  // Generar horarios de 1 hora (8:00 a 18:00) en formato AM/PM
  const generateHourlySlots = (): string[] => {
    const slots: string[] = [];
    for (let hour = 8; hour <= 18; hour++) {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 12 ? 12 : hour > 12 ? hour - 12 : hour;
      slots.push(`${displayHour}:00 ${ampm}`);
    }
    return slots;
  };

  // Formatear fecha para mostrar
  const formatDateForDisplay = (dateString: string): string => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('es-ES', options);
  };

  // Formatear fecha corta (DD/MM)
  const formatDateShort = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  };

  // Verificar si es hoy
  const isToday = (dateString: string): boolean => {
    const today = new Date();
    const date = new Date(dateString);
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

  // Convertir formato 24 horas a formato AM/PM para mostrar
  const convertTo12Hour = (time24h: string): string => {
    const [hours, minutes] = time24h.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  // Manejar clic en horario disponible
  const handleHourClick = (area: any, date: string, hour: string) => {
    console.log('🖱️ Clic en horario disponible:', { area: area.name, date, hour });
    
    if (onHourClick) {
      // Convertir el horario AM/PM a formato 24 horas para enviar al backend
      const hour24 = convertTo24Hour(hour);
      console.log('🔄 Horario convertido:', { original: hour, converted: hour24 });
      onHourClick(area, date, hour24);
    } else {
      console.log('❌ onHourClick no está disponible');
    }
  };

  // Cargar disponibilidad
  const loadAvailability = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const days = generateNext15Days();
      const hourlySlots = generateHourlySlots();
      const reservations = await reservationService.getAllReservations();
      const areas = state.areas;

      const availabilityData: DayAvailability[] = days.map(date => {
        const dayReservations = reservations.filter(reservation => {
          const reservationDate = new Date(reservation.date).toISOString().split('T')[0];
          return reservationDate === date && reservation.status === 'active';
        });

        const areasAvailability: { [areaName: string]: any } = {};
        
        areas.forEach(area => {
          const areaReservations = dayReservations.filter(reservation => 
            reservation.area === area.name
          );
          
          if (area.category === 'HOT_DESK') {
            // Para Hot Desk: calcular espacios disponibles
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
            // Para Salas: calcular disponibilidad por hora
            const hourlyAvailability: { [hour: string]: { isAvailable: boolean; reservations: any[] } } = {};
            
            hourlySlots.forEach(hour => {
              // Convertir el horario AM/PM a formato 24 horas para comparaciones
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
          date,
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Disponibilidad</h1>
        <p className="text-gray-600 mt-2">Vista de calendario de los próximos 15 días</p>
      </div>

      {/* Calendario de Disponibilidad */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Calendario de Disponibilidad
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                  Área
                </th>
                {availability.map((day) => (
                  <th key={day.date} className="px-2 py-3 text-center text-xs font-medium text-gray-700 border-b border-gray-200 min-w-[120px]">
                    <div className="flex flex-col items-center">
                      <span className={`font-semibold ${isToday(day.date) ? 'text-primary-600' : 'text-gray-900'}`}>
                        {formatDateShort(day.date)}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {formatDateForDisplay(day.date)}
                      </span>
                      {isToday(day.date) && (
                        <span className="text-xs text-primary-600 font-medium">HOY</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.areas.map((area, areaIndex) => (
                <tr key={area.id} className={areaIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 border-b border-gray-200">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{area.name}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        ({area.capacity} puestos)
                      </span>
                      <span className="ml-2 text-xs text-gray-400">
                        {area.category === 'HOT_DESK' ? 'Hot Desk' : 'Sala'}
                      </span>
                    </div>
                  </td>
                  {availability.map((day) => {
                    const areaStatus = day.areas[area.name];
                    
                    if (area.category === 'HOT_DESK') {
                      // Renderizado para Hot Desk
                      const availableSpaces = areaStatus?.availableSpaces ?? area.capacity;
                      const totalSpaces = areaStatus?.totalSpaces ?? area.capacity;
                      const isAvailable = availableSpaces > 0;
                      
                      return (
                        <td key={`${area.id}-${day.date}`} className="px-2 py-3 text-center border-b border-gray-200">
                          <div className={`flex flex-col items-center justify-center min-h-[60px] p-2 rounded-md ${
                            isAvailable 
                              ? 'bg-white text-gray-900 border border-gray-200' 
                              : 'bg-gray-200 text-gray-900 border border-gray-300'
                          }`}>
                            <div className="flex flex-col items-center">
                              {isAvailable ? (
                                <CheckCircle className="w-4 h-4 text-green-600 mb-1" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-600 mb-1" />
                              )}
                              <span className="text-xs font-medium">
                                {availableSpaces}/{totalSpaces}
                              </span>
                              <span className="text-xs text-gray-600">
                                espacios libres
                              </span>
                            </div>
                          </div>
                        </td>
                      );
                    } else {
                                             // Renderizado para Salas (bloques de hora)
                       const hourlySlots = areaStatus?.hourlySlots ?? {};
                       const reservations = areaStatus?.reservations ?? [];
                       
                       // Filtrar solo los horarios disponibles
                       const availableHours = generateHourlySlots().filter(hour => {
                         const hourStatus = hourlySlots[hour];
                         return hourStatus?.isAvailable ?? true;
                       });
                       
                       return (
                         <td key={`${area.id}-${day.date}`} className="px-2 py-3 text-center border-b border-gray-200">
                           <div className="min-h-[120px] p-1">
                             {availableHours.length > 0 ? (
                               <div className="grid grid-cols-2 gap-1">
                                 {availableHours.map((hour) => (
                                   <button
                                     key={hour}
                                     className="text-xs p-1 rounded border bg-white text-gray-900 border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer"
                                     title={`Hacer clic para reservar ${area.name} a las ${hour}`}
                                     onClick={() => handleHourClick(area, day.date, hour)}
                                   >
                                     <div className="font-medium">{hour}</div>
                                     <div className="text-[10px] text-green-600">✓ Libre</div>
                                   </button>
                                 ))}
                               </div>
                             ) : (
                               <div className="flex items-center justify-center h-full">
                                 <div className="text-xs text-gray-500">
                                   <div>Sin horarios</div>
                                   <div>disponibles</div>
                                 </div>
                               </div>
                             )}
                           </div>
                         </td>
                       );
                    }
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Leyenda */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-col space-y-3">
            <div className="text-center text-sm font-medium text-gray-700 mb-2">
              Leyenda de Disponibilidad
            </div>
            <div className="flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-white border border-gray-200 rounded mr-2"></div>
                <span className="text-gray-700">Libre</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded mr-2"></div>
                <span className="text-gray-700">Ocupado</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-primary-100 border border-primary-200 rounded mr-2"></div>
                <span className="text-primary-700 font-medium">Hoy</span>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center">
                <span className="mr-2">🏢</span>
                <span>Salas: Solo horarios libres (8:00 AM - 6:00 PM)</span>
              </div>
              <div className="flex items-center">
                <span className="mr-2">💺</span>
                <span>Hot Desk: Contador de espacios libres</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Información adicional */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Resumen de Disponibilidad
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total de áreas:</span>
              <span className="font-medium">{state.areas.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Días mostrados:</span>
              <span className="font-medium">15 días</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Período:</span>
              <span className="font-medium">
                {availability.length > 0 && (
                  <>
                    {formatDateForDisplay(availability[0].date)} - {formatDateForDisplay(availability[availability.length - 1].date)}
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Instrucciones</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              <strong>Salas:</strong> Solo se muestran horarios libres (8:00 AM - 6:00 PM). Haz clic para crear una reservación
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              <strong>Hot Desk:</strong> Se muestra el contador de espacios libres (disponibles/total)
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              Los horarios libres son botones clickeables que abren el formulario de reservación
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              El día actual está marcado como "HOY"
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              Se muestran los próximos 15 días desde hoy
            </li>
            <li className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              Pasa el mouse sobre los bloques para ver detalles
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
