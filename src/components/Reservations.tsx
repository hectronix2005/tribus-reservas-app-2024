import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ReservationFormData } from '../types';
import { 
  getDateLabel, 
  getDateClass, 
  isValidBusinessHours, 
  getEndTime, 
  generateTimeSlots,
  getCurrentDateString
} from '../utils/dateUtils';
import { saveReservationToGoogleSheets, isGoogleSheetsConfigured } from '../utils/googleSheets';

export function Reservations() {
  const { state, dispatch, getDailyCapacity, isTimeSlotAvailable } = useApp();
  const [selectedDate, setSelectedDate] = useState(getCurrentDateString());
  const [showReservationForm, setShowReservationForm] = useState(false);

  const [formData, setFormData] = useState<ReservationFormData>({
    areaId: '',
    groupName: '',
    requestedSeats: 1,
    date: selectedDate,
    time: '09:00',
    duration: 60, // 1 hora por defecto
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    notes: ''
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<Array<{time: string, isAvailable: boolean, label: string}>>([]);

  const dailyCapacity = getDailyCapacity(selectedDate);

  // Actualizar horarios disponibles cuando cambie el área, fecha o duración
  useEffect(() => {
    if (formData.areaId) {
      const timeSlots = generateTimeSlots();
      const slots = timeSlots.map(slot => ({
        ...slot,
        isAvailable: isTimeSlotAvailable(formData.areaId, formData.date, slot.time, formData.duration)
      }));
      
      setAvailableTimeSlots(slots);
    }
  }, [formData.areaId, formData.date, formData.duration, isTimeSlotAvailable]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setFormData(prev => {
      // Si hay un horario seleccionado, verificar si sigue siendo válido con la nueva fecha
      if (prev.time && prev.areaId) {
        const isStillValid = isTimeSlotAvailable(prev.areaId, date, prev.time, prev.duration);
        return {
          ...prev,
          date,
          // Solo limpiar el tiempo si ya no es válido con la nueva fecha
          time: isStillValid ? prev.time : ''
        };
      }
      return { ...prev, date };
    });
  };

  const handleAreaSelect = (areaId: string) => {
    setFormData(prev => {
      // Si hay un horario seleccionado, verificar si sigue siendo válido con la nueva área
      if (prev.time) {
        const isStillValid = isTimeSlotAvailable(areaId, prev.date, prev.time, prev.duration);
        return {
          ...prev,
          areaId,
          // Solo limpiar el tiempo si ya no es válido con la nueva área
          time: isStillValid ? prev.time : ''
        };
      }
      return { ...prev, areaId };
    });
    setShowReservationForm(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const area = state.areas.find(a => a.id === formData.areaId);
    if (!area) return;

    // Validaciones específicas para salas de juntas
    if (area.isMeetingRoom) {
      // Validar duración mínima y máxima
      if (formData.duration < 30) {
        alert('La duración mínima para salas de juntas es de 30 minutos.');
        return;
      }
      if (formData.duration > 540) { // 9 horas = 540 minutos
        alert('La duración máxima para salas de juntas es de 9 horas.');
        return;
      }

      // Validar horarios de oficina
      if (!isValidBusinessHours(formData.time, formData.duration)) {
        alert('La reserva debe estar dentro del horario de oficina (7:00 AM - 6:00 PM).');
        return;
      }

      // Verificar conflictos de horario
      if (hasTimeConflict(formData.areaId, formData.date, formData.time, formData.duration)) {
        alert('Ya existe una reserva en este horario para esta sala.');
        return;
      }
    } else {
      // Para áreas de trabajo, validar capacidad
      const areaCapacity = dailyCapacity.find(dc => dc.areaId === formData.areaId);
      if (!areaCapacity || formData.requestedSeats > areaCapacity.availableSeats) {
        alert('No hay suficientes puestos disponibles para esta reserva.');
        return;
      }
    }

    const newReservation = {
      id: Date.now().toString(),
      areaId: formData.areaId,
      areaName: area.name,
      groupName: formData.groupName,
      requestedSeats: area.isMeetingRoom ? area.capacity : formData.requestedSeats,
      date: formData.date,
      time: formData.time,
      duration: formData.duration,
      contactPerson: formData.contactPerson,
      contactEmail: formData.contactEmail,
      contactPhone: formData.contactPhone,
      status: 'confirmed' as const,
      createdAt: getCurrentDateString(),
      notes: formData.notes
    };

    dispatch({ type: 'ADD_RESERVATION', payload: newReservation });
    
    // Guardar respaldo en Google Sheets
    try {
      const sheetsBackup = await saveReservationToGoogleSheets(newReservation);
      if (sheetsBackup) {
        console.log('✅ Reserva guardada en Google Sheets');
      } else {
        console.log('⚠️ No se pudo guardar en Google Sheets (no configurado o error)');
      }
    } catch (error) {
      console.error('❌ Error al guardar en Google Sheets:', error);
    }
    
    // Reset form
    setFormData({
      areaId: '',
      groupName: '',
      requestedSeats: 1,
      date: selectedDate,
      time: '09:00',
      duration: 60,
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
      notes: ''
    });
    setSelectedTemplateId('');
    setShowReservationForm(false);
  };



  // Función para verificar conflictos de horario
  const hasTimeConflict = (areaId: string, date: string, time: string, duration: number) => {
    return !isTimeSlotAvailable(areaId, date, time, duration);
  };

  // Función para aplicar una plantilla
  const applyTemplate = (templateId: string) => {
    const template = state.templates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        groupName: template.groupName,
        contactPerson: template.contactPerson,
        contactEmail: template.contactEmail,
        contactPhone: template.contactPhone,
        notes: template.notes || ''
      }));
      setSelectedTemplateId(templateId);
    }
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservas</h1>
          <p className="text-gray-600">Gestiona las reservas de puestos de trabajo</p>
        </div>
        <button
          onClick={() => setShowReservationForm(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Reserva</span>
        </button>
      </div>

      {/* Date Selector */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Fecha</h3>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {Array.from({ length: 7 }, (_, i) => {
            const date = getCurrentDateString();
            const targetDate = new Date(date);
            targetDate.setDate(targetDate.getDate() + i);
            const dateString = targetDate.toISOString().split('T')[0];
            return (
              <button
                key={dateString}
                onClick={() => handleDateChange(dateString)}
                className={`p-3 rounded-lg border-2 text-center transition-colors duration-200 ${getDateClass(dateString)} ${
                  selectedDate === dateString ? 'ring-2 ring-primary-500' : ''
                }`}
              >
                <div className="text-sm font-medium">{getDateLabel(dateString)}</div>
                <div className="text-xs opacity-75">
                  {targetDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'numeric' })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Areas and Capacity */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dailyCapacity.map((area) => {
          const areaData = state.areas.find(a => a.id === area.areaId);
          
          // Para salas de juntas, siempre están disponibles (se verifica por horario)
          // Para áreas de trabajo, se verifica por capacidad disponible
          const isAvailable = areaData?.isMeetingRoom ? true : area.availableSeats > 0;
          
          // Para salas de juntas, calculamos utilización basada en tiempo reservado del día
          const utilization = areaData?.isMeetingRoom 
            ? (() => {
                if (area.reservations.length === 0) return 0;
                
                // Horario de oficina: 7 AM (420 min) a 6 PM (1080 min) = 660 minutos totales
                const totalBusinessMinutes = 660;
                const totalReservedMinutes = area.reservations.reduce((total, reservation) => {
                  return total + reservation.duration;
                }, 0);
                
                return Math.min((totalReservedMinutes / totalBusinessMinutes) * 100, 100);
              })()
            : (area.reservedSeats / area.totalCapacity) * 100;
          
          return (
            <div key={area.areaId} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-6 h-6 rounded-lg"
                    style={{ backgroundColor: areaData?.color }}
                  />
                  <div>
                    <h4 className="font-semibold text-gray-900">{area.areaName}</h4>
                    <p className="text-sm text-gray-500">{areaData?.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`badge ${
                    areaData?.isMeetingRoom 
                      ? (utilization >= 90 ? 'badge-danger' :
                         utilization >= 70 ? 'badge-warning' : 'badge-success')
                      : (utilization >= 90 ? 'badge-danger' :
                         utilization >= 70 ? 'badge-warning' : 'badge-success')
                  }`}>
                    {areaData?.isMeetingRoom 
                      ? (utilization > 0 ? `${utilization.toFixed(0)}%` : 'Libre')
                      : `${utilization.toFixed(0)}%`
                    }
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Capacidad:</span>
                  <span className="font-medium">{area.totalCapacity} {areaData?.isMeetingRoom ? 'personas' : 'puestos'}</span>
                </div>
                {areaData?.isMeetingRoom ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Reservas del día:</span>
                    <span className="font-medium text-primary-600">{area.reservations.length} reserva{area.reservations.length !== 1 ? 's' : ''}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Reservado:</span>
                      <span className="font-medium text-warning-600">{area.reservedSeats} puestos</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Disponible:</span>
                      <span className="font-medium text-success-600">{area.availableSeats} puestos</span>
                    </div>
                  </>
                )}

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      utilization >= 90 ? 'bg-danger-500' :
                      utilization >= 70 ? 'bg-warning-500' : 'bg-success-500'
                    }`}
                    style={{ 
                      width: `${utilization}%` 
                    }}
                  />
                </div>

                <button
                  onClick={() => handleAreaSelect(area.areaId)}
                  disabled={!isAvailable}
                  className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isAvailable
                      ? 'bg-primary-600 hover:bg-primary-700 text-white'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {areaData?.isMeetingRoom 
                    ? 'Reservar Sala' 
                    : (isAvailable ? 'Reservar Puestos' : 'Sin Disponibilidad')
                  }
                </button>
              </div>

              {/* Recent Reservations for this area */}
              {area.reservations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Reservas del día:</h5>
                  <div className="space-y-2">
                                         {area.reservations.slice(0, 3).map((reservation) => {
                       const areaData = state.areas.find(a => a.id === area.areaId);
                       const endTime = getEndTime(reservation.time, reservation.duration);
                       return (
                         <div key={reservation.id} className="flex items-center justify-between text-xs">
                           <span className="text-gray-600">{reservation.groupName}</span>
                           <span className="font-medium">
                             {areaData?.isMeetingRoom 
                               ? `${reservation.time} - ${endTime}`
                               : `${reservation.requestedSeats} puestos - ${reservation.time}`
                             }
                           </span>
                         </div>
                       );
                     })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reservation Form Modal */}
      {showReservationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Nueva Reserva</h3>
                <button
                  onClick={() => setShowReservationForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Área
                  </label>
                  <select
                    value={formData.areaId}
                    onChange={(e) => {
                      const newAreaId = e.target.value;
                      setFormData(prev => {
                        // Si hay un horario seleccionado, verificar si sigue siendo válido con la nueva área
                        if (prev.time && newAreaId) {
                          const isStillValid = isTimeSlotAvailable(newAreaId, prev.date, prev.time, prev.duration);
                          return {
                            ...prev,
                            areaId: newAreaId,
                            // Solo limpiar el tiempo si ya no es válido con la nueva área
                            time: isStillValid ? prev.time : ''
                          };
                        }
                        return { ...prev, areaId: newAreaId };
                      });
                    }}
                    className="input-field"
                    required
                  >
                    <option value="">Seleccionar área</option>
                    {state.areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name} ({dailyCapacity.find(dc => dc.areaId === area.id)?.availableSeats || 0} disponibles)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selector de Plantillas */}
                {state.templates.filter(t => t.isActive).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Usar Plantilla (opcional)
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => {
                        setSelectedTemplateId(e.target.value);
                        if (e.target.value) {
                          applyTemplate(e.target.value);
                        } else {
                          // Limpiar formulario si se selecciona "Sin plantilla"
                          setFormData(prev => ({
                            ...prev,
                            groupName: '',
                            contactPerson: '',
                            contactEmail: '',
                            contactPhone: '',
                            notes: ''
                          }));
                        }
                      }}
                      className="input-field"
                    >
                      <option value="">Sin plantilla</option>
                      {state.templates.filter(t => t.isActive).map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} - {template.groupName}
                        </option>
                      ))}
                    </select>
                    {selectedTemplateId && (
                      <p className="text-xs text-success-600 mt-1">
                        ✓ Plantilla aplicada: {state.templates.find(t => t.id === selectedTemplateId)?.name}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Grupo/Área
                  </label>
                  <input
                    type="text"
                    value={formData.groupName}
                    onChange={(e) => setFormData(prev => ({ ...prev, groupName: e.target.value }))}
                    className="input-field"
                    placeholder="Ej: Equipo de Desarrollo"
                    required
                  />
                </div>

                {formData.areaId && state.areas.find(a => a.id === formData.areaId)?.isMeetingRoom ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Hora de Inicio
                        </label>
                        <select
                          value={formData.time}
                          onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                          className="input-field"
                          required
                        >
                          <option value="">Seleccionar horario</option>
                          {availableTimeSlots.map((slot) => (
                            <option 
                              key={slot.time} 
                              value={slot.time}
                              disabled={!slot.isAvailable}
                            >
                              {slot.label} {!slot.isAvailable ? '(Ocupado)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duración
                        </label>
                        <select
                          value={formData.duration}
                          onChange={(e) => {
                            const newDuration = parseInt(e.target.value);
                            setFormData(prev => {
                              // Si hay un horario seleccionado, verificar si sigue siendo válido con la nueva duración
                              if (prev.time && prev.areaId) {
                                const isStillValid = isTimeSlotAvailable(prev.areaId, prev.date, prev.time, newDuration);
                                return {
                                  ...prev,
                                  duration: newDuration,
                                  // Solo limpiar el tiempo si ya no es válido con la nueva duración
                                  time: isStillValid ? prev.time : ''
                                };
                              }
                              return { ...prev, duration: newDuration };
                            });
                          }}
                          className="input-field"
                          required
                        >
                          <option value={30}>30 minutos</option>
                          <option value={60}>1 hora</option>
                          <option value={90}>1.5 horas</option>
                          <option value={120}>2 horas</option>
                          <option value={180}>3 horas</option>
                          <option value={240}>4 horas</option>
                          <option value={300}>5 horas</option>
                          <option value={360}>6 horas</option>
                          <option value={420}>7 horas</option>
                          <option value={480}>8 horas</option>
                          <option value={540}>9 horas</option>
                        </select>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
                      <p>Se reservará toda la sala con capacidad para {state.areas.find(a => a.id === formData.areaId)?.capacity} personas</p>
                      <p>Horario: {formData.time} - {getEndTime(formData.time, formData.duration)}</p>
                      <p>Horario de oficina: 7:00 AM - 6:00 PM</p>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Puestos Requeridos
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.requestedSeats}
                        onChange={(e) => setFormData(prev => ({ ...prev, requestedSeats: parseInt(e.target.value) }))}
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hora
                      </label>
                      <input
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                        className="input-field"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Persona de Contacto
                  </label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                    className="input-field"
                    placeholder="Nombre completo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                    className="input-field"
                    placeholder="email@empresa.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                    className="input-field"
                    placeholder="+1234567890"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="input-field"
                    rows={3}
                    placeholder="Información adicional..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowReservationForm(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-success flex-1"
                  >
                    Confirmar Reserva
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
