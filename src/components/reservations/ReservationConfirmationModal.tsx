import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatDateWithDayName } from '../../utils/unifiedDateUtils';

interface ReservationConfirmationModalProps {
  reservation: any;
  onClose: () => void;
}

export function ReservationConfirmationModal({ reservation, onClose }: ReservationConfirmationModalProps) {
  const { state } = useApp();
  const areas = state.areas.filter(area => area.isActive !== false);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Reserva Confirmada
          </h2>
          <p className="text-center text-gray-600 mb-6">
            Tu reserva ha sido registrada exitosamente
          </p>

          <div className="bg-gray-50 rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">ID de Reserva</p>
                <p className="text-lg font-semibold text-gray-900">{reservation.reservationId}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Área</p>
                <p className="text-lg font-semibold text-gray-900">{reservation.area}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Fecha</p>
                <p className="text-lg font-semibold text-gray-900">
                  {reservation.date ? formatDateWithDayName(reservation.date) : 'Fecha no disponible'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Horario</p>
                <p className="text-lg font-semibold text-gray-900">
                  {reservation.startTime} - {reservation.endTime}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Equipo</p>
                <p className="text-lg font-semibold text-gray-900">{reservation.teamName}</p>
              </div>
              {reservation.requestedSeats && !areas.find(a => a.name === reservation.area)?.isMeetingRoom && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Puestos</p>
                  <p className="text-lg font-semibold text-gray-900">{reservation.requestedSeats}</p>
                </div>
              )}
            </div>

            {reservation.colaboradores && reservation.colaboradores.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Colaboradores</p>
                <div className="flex flex-wrap gap-2">
                  {reservation.colaboradores.map((colaborador: any) => (
                    <span
                      key={colaborador._id}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                    >
                      {colaborador.name || colaborador.username}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {reservation.notes && (
              <div>
                <p className="text-sm font-medium text-gray-500">Notas</p>
                <p className="text-gray-900">{reservation.notes}</p>
              </div>
            )}
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Se ha enviado un correo de confirmación con los detalles de tu reserva a tu email y al de todos los colaboradores.
            </p>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
