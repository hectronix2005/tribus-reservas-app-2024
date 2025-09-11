import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, FileText, Users } from 'lucide-react';
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
  teamName: string;
  templateId?: string | null;
  requestedSeats: number;
  status: 'active' | 'cancelled' | 'completed';
  notes: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    userId: string;
    userName: string;
    userEmail: string;
    userRole: 'admin' | 'user' | 'colaborador';
  };
  colaboradores?: Array<{
    _id: string;
    name: string;
    username: string;
    email: string;
  }>;
}

export function ColaboradorView() {
  const { state } = useApp();
  const currentUser = state.auth.currentUser;
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar reservaciones del colaborador
  const loadReservations = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/reservations/colaborador/${currentUser.id}`);
      if (!response.ok) {
        throw new Error('Error al cargar las reservaciones');
      }
      const data = await response.json();
      setReservations(data);
    } catch (err) {
      console.error('Error cargando reservaciones:', err);
      setError('Error al cargar las reservaciones');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, [currentUser]);

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Función para formatear fecha con día
  const formatDateWithDay = (dateString: string) => {
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
    const shortDate = date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    
    return `${shortDate} - ${dayName}`;
  };

  if (!currentUser || currentUser.role !== 'colaborador') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Acceso Denegado
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>No tienes permisos para acceder a esta vista. Esta sección es solo para colaboradores.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Mis Reservaciones
        </h1>
        <p className="text-gray-600">
          Aquí puedes ver todas las reservaciones en las que has sido incluido como colaborador.
        </p>
      </div>

      {/* Información del usuario */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <User className="w-5 h-5 text-blue-600 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">
              Bienvenido, {currentUser.name}
            </h3>
            <p className="text-sm text-blue-600">
              Rol: Colaborador • Email: {currentUser.email}
            </p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-gray-600">Cargando reservaciones...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && reservations.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay reservaciones</h3>
          <p className="mt-1 text-sm text-gray-500">
            No tienes reservaciones asignadas como colaborador.
          </p>
        </div>
      )}

      {/* Reservations List */}
      {!isLoading && !error && reservations.length > 0 && (
        <div className="space-y-6">
          {reservations.map((reservation) => (
            <div key={reservation._id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{formatDateWithDay(reservation.date)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>
                        {(() => {
                          // Verificar si es HOT DESK (reserva de día completo)
                          const area = state.areas.find(a => a.name === reservation.area);
                          const isFullDay = area?.isFullDayReservation || false;
                          
                          if (isFullDay) {
                            return 'Día completo';
                          } else {
                            return `${reservation.startTime} - ${reservation.endTime}`;
                          }
                        })()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{reservation.area}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Información de la Reserva</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div><strong>Equipo:</strong> {reservation.teamName}</div>
                        <div><strong>Puestos:</strong> {reservation.requestedSeats}</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Información del Creador</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        {reservation.createdBy && (
                          <>
                            <div><strong>Creado por:</strong> {reservation.createdBy.userName}</div>
                            <div><strong>Rol:</strong> {reservation.createdBy.userRole}</div>
                            <div><strong>Email:</strong> {reservation.createdBy.userEmail}</div>
                          </>
                        )}
                        {reservation.createdAt && (
                          <div><strong>Registrado:</strong> {new Date(reservation.createdAt).toLocaleString('es-ES', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {reservation.colaboradores && reservation.colaboradores.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Otros Colaboradores</h4>
                      <div className="flex flex-wrap gap-2">
                        {reservation.colaboradores
                          .filter(c => c._id !== currentUser.id)
                          .map((colaborador) => (
                            <span
                              key={colaborador._id}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {colaborador.name}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  {reservation.notes && (
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-900 mb-2">Notas</h4>
                      <div className="bg-gray-50 rounded-md p-3">
                        <p className="text-sm text-gray-700">{reservation.notes}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="ml-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    reservation.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : reservation.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {reservation.status === 'active' ? 'Activa' : 
                     reservation.status === 'cancelled' ? 'Cancelada' : 'Completada'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
