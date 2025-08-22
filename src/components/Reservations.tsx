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
      endTime: isFullDay ? '23:59' : '10:00'
    }));
  };

  // Obtener áreas del contexto
  const areas = state.areas;
  
  // Verificar si el área seleccionada requiere reserva por día completo
  const selectedArea = areas.find(area => area.name === formData.area);
  const isFullDayReservation = selectedArea?.isFullDayReservation || false;

  // Cargar reservaciones al montar el componente
  useEffect(() => {
    loadReservations();
  }, []);

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

    try {
      setIsLoading(true);
      setError(null);

      const reservationData = {
        userId: currentUser.id,
        userName: currentUser.name,
        ...formData
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  Fecha
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              {!isFullDayReservation && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hora de Inicio
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hora de Fin
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
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
                        <span>{reservation.userName}</span>
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
