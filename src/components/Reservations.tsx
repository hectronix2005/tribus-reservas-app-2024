import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Calendar, Clock, MapPin, User, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { reservationService } from '../services/api';

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
}

interface ReservationFormData {
  area: string;
  date: string;
  startTime: string;
  endTime: string;
  contactPerson: string;
  teamName: string;
  contactEmail: string;
  contactPhone: string;
  templateId: string;
  requestedSeats: number;
  notes: string;
}

export function Reservations() {
  const { state } = useApp();
  const currentUser = state.auth.currentUser;
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ReservationFormData>({
    area: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    contactPerson: currentUser?.name || '',
    teamName: '',
    contactEmail: currentUser?.email || '',
    contactPhone: '',
    templateId: '',
    requestedSeats: 1,
    notes: ''
  });

  // Función para manejar el cambio de área
  const handleAreaChange = (areaName: string) => {
    const selectedArea = areas.find(area => area.name === areaName);
    const isFullDay = selectedArea?.isFullDayReservation || false;
    
    setFormData(prev => ({
      ...prev,
      area: areaName,
      // Si es reserva por día completo, establecer horarios por defecto
      startTime: isFullDay ? '00:00' : '09:00',
      endTime: isFullDay ? '23:59' : '10:00',
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
  
  // Verificar si el área seleccionada requiere reserva por día completo
  const selectedArea = areas.find(area => area.name === formData.area);
  const isFullDayReservation = selectedArea?.isFullDayReservation || false;



  // Función para verificar conflictos de horarios
  const getConflictingReservations = (area: string, date: string, startTime: string, endTime: string, excludeId?: string) => {
    return reservations.filter(reservation => {
      // Excluir la reservación que se está editando
      if (excludeId && reservation._id === excludeId) return false;
      
      // Verificar que sea la misma área y fecha
      if (reservation.area !== area || reservation.date !== date) return false;
      
      // Verificar que la reservación esté activa
      if (reservation.status !== 'active') return false;
      
      // Verificar conflicto de horarios
      const reservationStart = reservation.startTime;
      const reservationEnd = reservation.endTime;
      
      // Hay conflicto si los horarios se solapan
      return (
        (startTime < reservationEnd && endTime > reservationStart) ||
        (reservationStart < endTime && reservationEnd > startTime)
      );
    });
  };

  // Función para generar opciones de horarios disponibles
  const getAvailableTimeSlots = (area: string, date: string) => {
    if (!area || !date) return [];
    
    const timeSlots = [];
    const startHour = 8; // 8:00 AM
    const endHour = 18;  // 6:00 PM
    const slotDuration = 60; // 60 minutos por slot
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const endTime = `${hour.toString().padStart(2, '0')}:${(minute + slotDuration).toString().padStart(2, '0')}`;
        
        // Verificar si este horario está disponible
        const conflicts = getConflictingReservations(area, date, startTime, endTime, editingReservation?._id);
        
        if (conflicts.length === 0) {
          timeSlots.push({
            start: startTime,
            end: endTime,
            label: `${startTime} - ${endTime}`
          });
        }
      }
    }
    
    return timeSlots;
  };

  // Obtener horarios disponibles para el área y fecha seleccionados
  const availableTimeSlots = getAvailableTimeSlots(formData.area, formData.date);

  // Cargar reservaciones al montar el componente
  useEffect(() => {
    loadReservations();
  }, []);

  // Recargar reservaciones cuando cambie el área o fecha para actualizar horarios disponibles
  useEffect(() => {
    if (formData.area && formData.date) {
      loadReservations();
    }
  }, [formData.area, formData.date]);

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

      const reservationData = {
        userId: currentUser.id,
        userName: currentUser.name,
        ...formData,
        requestedSeats: formData.requestedSeats
      };

      if (editingReservation) {
        // Actualizar reservación existente
        await reservationService.updateReservation(editingReservation._id, reservationData);
      } else {
        // Crear nueva reservación
        await reservationService.createReservation(reservationData);
      }

      // Recargar reservaciones
      await loadReservations();
      
      // Limpiar formulario
      setFormData({
        area: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        contactPerson: currentUser?.name || '',
        teamName: '',
        contactEmail: currentUser?.email || '',
        contactPhone: '',
        templateId: '',
        requestedSeats: 1,
        notes: ''
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
    setFormData({
      area: reservation.area,
      date: new Date(reservation.date).toISOString().split('T')[0],
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      contactPerson: reservation.contactPerson,
      teamName: reservation.teamName,
      contactEmail: reservation.contactEmail,
      contactPhone: reservation.contactPhone,
      templateId: reservation.templateId || '',
      requestedSeats: reservation.requestedSeats || 1,
      notes: reservation.notes
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
      contactPerson: currentUser?.name || '',
      teamName: '',
      contactEmail: currentUser?.email || '',
      contactPhone: '',
      templateId: '',
      requestedSeats: 1,
      notes: ''
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Área
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
              </div>

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

              {/* Campo de cantidad de puestos - solo para áreas que NO son salas */}
              {selectedArea && !selectedArea.isMeetingRoom && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad de Puestos
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
                      de {selectedArea?.capacity || 1} disponibles
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    <span className="text-blue-600 font-medium">
                      Área: {selectedArea.name} • Capacidad: {selectedArea.capacity} puestos
                    </span>
                  </div>
                </div>
              )}

              {/* Información para salas de reunión */}
              {selectedArea && selectedArea.isMeetingRoom && (
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
                        <p>No es necesario especificar cantidad de puestos.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => {
                    setFormData({...formData, date: e.target.value});
                    setError(null); // Limpiar error cuando cambie la fecha
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

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
                  Equipo de Trabajo
                </label>
                <input
                  type="text"
                  value={formData.teamName}
                  onChange={(e) => setFormData({...formData, teamName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Nombre del equipo"
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
                  onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="email@ejemplo.com"
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
                  onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="+57 300 123 4567"
                  required
                />
              </div>

              {!isFullDayReservation && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Horario Disponible
                    </label>
                    <select
                      value={`${formData.startTime}-${formData.endTime}`}
                      onChange={(e) => {
                        const [start, end] = e.target.value.split('-');
                        setFormData({...formData, startTime: start, endTime: end});
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value="">Seleccionar horario</option>
                      {availableTimeSlots.map((slot, index) => (
                        <option key={index} value={`${slot.start}-${slot.end}`}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm text-gray-500">
                        {availableTimeSlots.length} horario{availableTimeSlots.length !== 1 ? 's' : ''} disponible{availableTimeSlots.length !== 1 ? 's' : ''}
                      </span>
                      {availableTimeSlots.length > 0 && (
                        <span className="text-sm text-green-600">
                          ✓ Horarios libres
                        </span>
                      )}
                    </div>
                    {availableTimeSlots.length === 0 && formData.area && formData.date && (
                      <p className="text-sm text-red-600 mt-1">
                        No hay horarios disponibles para esta fecha y área
                      </p>
                    )}
                  </div>

                  {/* Mostrar reservaciones existentes para la fecha y área seleccionadas */}
                  {formData.area && formData.date && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reservaciones existentes para {formData.area} el {new Date(formData.date).toLocaleDateString('es-ES')}:
                      </label>
                      <div className="bg-gray-50 rounded-md p-3 max-h-32 overflow-y-auto">
                        {reservations
                          .filter(r => r.area === formData.area && r.date === formData.date && r.status === 'active')
                          .map((reservation, index) => (
                            <div key={index} className="text-sm text-gray-600 mb-1">
                              <span className="font-medium">
                                {reservation.startTime} - {reservation.endTime}
                              </span>
                              {reservation.notes && ` (${reservation.notes})`}
                            </div>
                          ))}
                        {reservations.filter(r => r.area === formData.area && r.date === formData.date && r.status === 'active').length === 0 && (
                          <p className="text-sm text-gray-500">No hay reservaciones para esta fecha</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {isFullDayReservation && (
                <div className="col-span-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-blue-800">
                        Esta área se reserva por día completo (00:00 - 23:59)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Notas adicionales..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary flex-1"
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
        ) : reservations.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No hay reservaciones activas</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {reservations.map((reservation) => (
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
                        <span>{formatDate(reservation.date)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          {reservation.startTime === '00:00' && reservation.endTime === '23:59' 
                            ? 'Día completo' 
                            : `${reservation.startTime} - ${reservation.endTime}`
                          }
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
