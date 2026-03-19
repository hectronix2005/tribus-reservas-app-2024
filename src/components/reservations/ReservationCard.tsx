import React from 'react';
import { Calendar, Clock, MapPin, FileText, Edit, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Reservation } from '../../types';
import { formatDateWithDayName } from '../../utils/unifiedDateUtils';
import { getStatusColor, getStatusText } from '../../utils/reservationUtils';

interface ReservationCardProps {
  reservation: Reservation;
  currentUser: any;
  onView: (r: Reservation) => void;
  onEdit: (r: Reservation) => void;
  onDelete: (r: Reservation) => void;
  onShowDebug: (r: Reservation) => void;
}

export function ReservationCard({
  reservation,
  currentUser,
  onView,
  onEdit,
  onDelete,
  onShowDebug,
}: ReservationCardProps) {
  const { state } = useApp();
  const areas = state.areas.filter(area => area.isActive !== false);

  const canEditReservation = (_r: Reservation) => false;

  const canDeleteReservation = (r: Reservation) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || currentUser.role === 'superadmin') return true;
    if (r.status !== 'confirmed') return false;
    const isCreator =
      r.createdBy?.userId === currentUser.id ||
      r.createdBy?.userId === currentUser._id ||
      r.userId === currentUser.id ||
      r.userId === currentUser._id;
    return isCreator;
  };

  return (
    <div className="p-6">
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

          {/* ID único de la reservación */}
          {reservation.reservationId && (
            <div className="mb-2">
              <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                ID: {reservation.reservationId}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-sm text-gray-600">

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{formatDateWithDayName(reservation.date)}</span>
            </div>

            {/* Solo mostrar horario para SALA (salas de juntas), NO para HOT_DESK */}
            {(() => {
              const area = areas.find(a => a.name === reservation.area);
              const isHotDesk = area?.category === 'HOT_DESK';
              if (isHotDesk) return null;
              return (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{`${reservation.startTime} - ${reservation.endTime}`}</span>
                </div>
              );
            })()}

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{reservation.area}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400">👥</span>
              <span><strong>Equipo:</strong> {reservation.teamName}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400">🪑</span>
              <span><strong>Puestos:</strong> {reservation.requestedSeats || 1}</span>
            </div>

            {reservation.createdBy && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">👤</span>
                <span><strong>Creado por:</strong> {reservation.createdBy.userName} ({reservation.createdBy.userRole})</span>
              </div>
            )}

            {reservation.createdAt && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">📅</span>
                <span><strong>Registrado:</strong> {new Date(reservation.createdAt).toLocaleString('es-ES', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}</span>
              </div>
            )}

            {reservation.colaboradores && reservation.colaboradores.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">👥</span>
                <span><strong>Colaboradores:</strong> {
                  reservation.colaboradores.map(c => {
                    if (typeof c === 'object' && c.name) return c.name;
                    if (typeof c === 'string') {
                      const user = state.users.find(u => u.id === c || u._id === c);
                      return user ? user.name : 'Usuario no encontrado';
                    }
                    return 'Usuario no encontrado';
                  }).join(', ')
                }</span>
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
          {/* Botón para ver reservación completa */}
          <button
            onClick={() => onView(reservation)}
            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
            title="Ver reservación completa"
          >
            👁️ Ver
          </button>

          {/* Botón de Debug */}
          <button
            onClick={() => onShowDebug(reservation)}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            title="Ver información debug"
          >
            🔍 Debug
          </button>

          {canEditReservation(reservation) && (
            <button
              onClick={() => onEdit(reservation)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Editar reservación"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}

          {canDeleteReservation(reservation) && (
            <button
              onClick={() => onDelete(reservation)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Eliminar reservación"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
