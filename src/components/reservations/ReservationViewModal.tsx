import React from 'react';
import { useApp } from '../../context/AppContext';
import { Reservation } from '../../types';
import { formatDateWithDayName } from '../../utils/unifiedDateUtils';
import { getStatusColor, getStatusText } from '../../utils/reservationUtils';

interface ReservationViewModalProps {
  reservation: Reservation | null;
  onClose: () => void;
  onEdit?: (r: Reservation) => void;
  onDelete?: (reservation: Reservation) => void;
  currentUser: any;
}

export function ReservationViewModal({
  reservation,
  onClose,
  onEdit,
  onDelete,
  currentUser,
}: ReservationViewModalProps) {
  const { state } = useApp();
  const areas = state.areas.filter(area => area.isActive !== false);

  if (!reservation) return null;

  // ---- helpers duplicated from Reservations.tsx (needed for debug modal) ----
  const safeValue = (value: any, fallback: string = 'N/A'): string => {
    if (value === null || value === undefined || value === '' || value === 'null' || value === 'undefined') {
      return fallback;
    }
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      if (lowerValue === 'unknown' || lowerValue === 'null' || lowerValue === 'undefined' || lowerValue === '') {
        return fallback;
      }
      if (lowerValue.includes('unknown@') && fallback === 'N/A') {
        return 'Email no disponible';
      }
    }
    return String(value);
  };

  const formatDate = (dateString: any): string => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const getUserInfo = (userId: string): { name: string; email: string; role: string; cedula: string } => {
    const user = state.users.find(u => u.id === userId || u._id === userId);
    if (user) {
      return {
        name: safeValue(user.name),
        email: safeValue(user.email),
        role: safeValue(user.role),
        cedula: safeValue(user.cedula)
      };
    }
    return { name: 'Usuario no encontrado', email: 'N/A', role: 'N/A', cedula: 'N/A' };
  };

  const showDebugInfo = (r: Reservation) => {
    console.log('🔍 Verificando información debug para reservación:', {
      reservationId: r.reservationId,
      _id: r._id,
      hasDebug: !!r.debug,
      debugKeys: r.debug ? Object.keys(r.debug) : []
    });

    if (r.debug) {
      console.log('🔍 Debug object completo:', r.debug);
      console.log('🔍 systemInfo:', r.debug.systemInfo);
      console.log('🔍 userInfo:', (r.debug as any).userInfo);
      console.log('🔍 dateProcessing:', (r.debug as any).dateProcessing);
      console.log('🔍 areaInfo:', (r.debug as any).areaInfo);
    }

    if (!r.debug) {
      const basicInfo = `
🔍 INFORMACIÓN BÁSICA DE LA RESERVACIÓN
═══════════════════════════════════════

📋 INFORMACIÓN BÁSICA
─────────────────────
ID de Reservación: ${r.reservationId || 'N/A'}
ID de Base de Datos: ${r._id}
Fecha de Creación: ${r.createdAt || 'N/A'}

👤 INFORMACIÓN DEL USUARIO
──────────────────────────
Usuario: ${r.userName || 'N/A'}
Área: ${r.area || 'N/A'}
Equipo: ${r.teamName || 'N/A'}

📅 INFORMACIÓN DE LA RESERVA
────────────────────────────
Fecha: ${r.date || 'N/A'}
${(() => {
  const area = areas.find(a => a.name === r.area);
  const isHotDesk = area?.category === 'HOT_DESK';
  if (isHotDesk) return '';
  return `Hora Inicio: ${r.startTime || 'N/A'}\nHora Fin: ${r.endTime || 'N/A'}\n`;
})()}Puestos Solicitados: ${r.requestedSeats || 0}
Estado: ${r.status || 'N/A'}

👥 COLABORADORES
────────────────
${r.colaboradores?.map((c, i) => `${i + 1}. ${(c as any).name || c}`).join('\n') || 'Ninguno'}

📝 NOTAS
────────
${r.notes || 'Sin notas'}

⚠️ INFORMACIÓN DEBUG
────────────────────
Esta reservación fue creada antes de implementar el sistema de debug mejorado.
Para ver información debug detallada, crea una nueva reservación.

═══════════════════════════════════════
`;
      alert(basicInfo);
      return;
    }

    const debug = r.debug as any;
    const debugInfo = `
🔍 INFORMACIÓN DEBUG DETALLADA
═══════════════════════════════════════

📋 INFORMACIÓN BÁSICA
─────────────────────
ID de Reservación: ${safeValue(r.reservationId)}
ID de Base de Datos: ${safeValue(r._id)}
Versión del Sistema: ${safeValue(debug.systemInfo?.version, '1.0.0')}
ID de Request: ${safeValue(debug.systemInfo?.requestId)}

👤 INFORMACIÓN DEL USUARIO
──────────────────────────
Creador: ${(() => {
  const creatorId = debug.userInfo?.creator?.id;
  const creatorInfo = creatorId ? getUserInfo(creatorId) : {
    name: safeValue(debug.userInfo?.creator?.name || r.userName),
    email: safeValue(debug.userInfo?.creator?.email),
    role: safeValue(debug.userInfo?.creator?.role),
    cedula: safeValue(debug.userInfo?.creator?.cedula)
  };
  return creatorInfo.name;
})()}
Email: ${(() => {
  const creatorId = debug.userInfo?.creator?.id;
  const creatorInfo = creatorId ? getUserInfo(creatorId) : {
    name: safeValue(debug.userInfo?.creator?.name || r.userName),
    email: safeValue(debug.userInfo?.creator?.email),
    role: safeValue(debug.userInfo?.creator?.role),
    cedula: safeValue(debug.userInfo?.creator?.cedula)
  };
  return creatorInfo.email;
})()}
Rol: ${(() => {
  const creatorId = debug.userInfo?.creator?.id;
  const creatorInfo = creatorId ? getUserInfo(creatorId) : {
    name: safeValue(debug.userInfo?.creator?.name || r.userName),
    email: safeValue(debug.userInfo?.creator?.email),
    role: safeValue(debug.userInfo?.creator?.role),
    cedula: safeValue(debug.userInfo?.creator?.cedula)
  };
  return creatorInfo.role;
})()}
Cédula: ${(() => {
  const creatorId = debug.userInfo?.creator?.id;
  const creatorInfo = creatorId ? getUserInfo(creatorId) : {
    name: safeValue(debug.userInfo?.creator?.name || r.userName),
    email: safeValue(debug.userInfo?.creator?.email),
    role: safeValue(debug.userInfo?.creator?.role),
    cedula: safeValue(debug.userInfo?.creator?.cedula)
  };
  return creatorInfo.cedula;
})()}

👥 COLABORADORES (${debug.userInfo?.collaborators?.length || 0})
${debug.userInfo?.collaborators?.map((c: any, i: number) => {
  const userInfo = getUserInfo(c.id || c);
  return `${i + 1}. ${userInfo.name} (${safeValue(c.role || userInfo.role)})`;
}).join('\n') || 'Ninguno'}

📅 INFORMACIÓN DE FECHAS
────────────────────────
Fecha de Creación: ${formatDate(debug.systemInfo?.createdAt || r.createdAt)}
Fecha Reservada: ${formatDate(debug.dateProcessing?.original?.dateString || r.date)}
Fecha UTC: ${formatDate(debug.dateProcessing?.utc?.reservationDate)}
${(() => {
  const area = areas.find(a => a.name === r.area);
  const isHotDesk = area?.category === 'HOT_DESK';
  if (isHotDesk) return '';
  return `Hora Inicio: ${safeValue(debug.dateProcessing?.original?.startTimeString || r.startTime)}\nHora Fin: ${safeValue(debug.dateProcessing?.original?.endTimeString || r.endTime)}\n`;
})()}Día de la Semana: ${safeValue(debug.dateProcessing?.validation?.dayName)}
Zona Horaria: ${safeValue(debug.dateProcessing?.utc?.timezone || debug.systemInfo?.timezone, 'America/Bogota')}
User Agent: ${safeValue(debug.systemInfo?.userAgent || debug.metadata?.userAgent)}
Es Día de Oficina: ${debug.dateProcessing?.validation?.isOfficeDay ? 'Sí' : 'No'}
Es Fecha Futura: ${debug.dateProcessing?.validation?.isFutureDate ? 'Sí' : 'No'}

🏢 INFORMACIÓN DEL ÁREA
────────────────────────
Área: ${safeValue(debug.areaInfo?.areaName || r.area)}
Tipo: ${safeValue(debug.areaInfo?.areaType)}
Capacidad Total: ${safeValue(debug.areaInfo?.capacity, '50')}
Puestos Solicitados: ${safeValue(debug.areaInfo?.requestedSeats || debug.inputData?.processed?.finalRequestedSeats || r.requestedSeats, '0')}
Puestos Disponibles: ${safeValue(debug.areaInfo?.availableSeats, '0')}
Tasa de Utilización: ${safeValue(debug.areaInfo?.utilizationRate, '0%')}

✅ VALIDACIONES REALIZADAS
──────────────────────────
Campos Requeridos: ${Object.entries(debug.validations?.requiredFields || {}).map(([key, value]) => `${key}: ${value ? '✓' : '✗'}`).join(', ')}
Reglas de Negocio: ${Object.entries(debug.validations?.businessRules || {}).map(([key, value]) => `${key}: ${value ? '✓' : '✗'}`).join(', ')}
Validación de Capacidad: ${Object.entries(debug.validations?.capacityValidation || {}).map(([key, value]) => `${key}: ${value}`).join(', ')}

📊 INFORMACIÓN DE LA RESERVA
────────────────────────────
Duración: ${debug.reservationInfo?.duration?.durationHours || 0} horas (${debug.reservationInfo?.duration?.durationMinutes || 0} minutos)
Total Participantes: ${debug.reservationInfo?.participants?.total || 0}
Colaboradores: ${debug.reservationInfo?.participants?.collaborators || 0}
Asistentes: ${debug.reservationInfo?.participants?.attendees || 0}

🌐 METADATOS DE LA REQUEST
──────────────────────────
IP: ${safeValue(debug.metadata?.ipAddress)}
Referer: ${safeValue(debug.metadata?.referer)}
Idioma: ${safeValue(debug.metadata?.acceptLanguage)}
Método: ${safeValue(debug.metadata?.requestMethod)}
URL: ${safeValue(debug.metadata?.requestUrl)}
Timestamp: ${debug.metadata?.timestamp ? formatDate(debug.metadata.timestamp) : 'N/A'}

📧 NOTIFICACIONES POR EMAIL
──────────────────────────
👤 Creador: ${(() => {
  const creatorId = debug.userInfo?.creator?.id;
  const creatorInfo = creatorId ? getUserInfo(creatorId) : {
    name: safeValue(debug.userInfo?.creator?.name || r.userName),
    email: safeValue(debug.userInfo?.creator?.email)
  };
  return `${creatorInfo.email} (${creatorInfo.name})`;
})()}

${debug.userInfo?.collaborators?.length > 0 ? `👥 Colaboradores:
${debug.userInfo.collaborators.map((c: any, i: number) => {
  const userInfo = getUserInfo(c.id || c);
  return `   ${i + 1}. ${userInfo.email} (${userInfo.name})`;
}).join('\n')}` : '👥 Colaboradores: Ninguno'}

📨 Total de destinatarios: ${1 + (debug.userInfo?.collaborators?.length || 0)}
📋 Lista de emails: ${(() => {
  const creatorId = debug.userInfo?.creator?.id;
  const creatorInfo = creatorId ? getUserInfo(creatorId) : {
    email: safeValue(debug.userInfo?.creator?.email)
  };
  const emails = [creatorInfo.email];
  if (debug.userInfo?.collaborators?.length > 0) {
    debug.userInfo.collaborators.forEach((c: any) => {
      const userInfo = getUserInfo(c.id || c);
      if (userInfo.email && userInfo.email !== creatorInfo.email) {
        emails.push(userInfo.email);
      }
    });
  }
  return emails.join(', ');
})()}
🔒 BCC (copia oculta): noreply.tribus@gmail.com

═══════════════════════════════════════
`;

    if (debugInfo.length > 2000) {
      console.log(debugInfo);
      alert(`🔍 Información debug completa mostrada en consola (F12)\n\nResumen:\nID: ${r.reservationId}\nCreador: ${debug.userInfo?.creator?.name}\nÁrea: ${debug.areaInfo?.areaName}\nFecha: ${debug.dateProcessing?.original?.dateString}\nPuestos: ${debug.areaInfo?.requestedSeats}/${debug.areaInfo?.capacity}`);
    } else {
      alert(debugInfo);
    }
  };

  const canEditReservation = (_r: Reservation) => false;

  const canDeleteReservation = (r: Reservation) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || currentUser.role === 'superadmin') return true;
    if (r.status !== 'confirmed') return false;
    const isCreator = r.createdBy?.userId === currentUser.id ||
                     r.createdBy?.userId === currentUser._id ||
                     r.userId === currentUser.id ||
                     r.userId === currentUser._id;
    return isCreator;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header del Modal */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Vista Completa de Reservación
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Información Principal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
            {/* Columna Izquierda - Información Básica */}
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Información Básica</h3>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Área:</span>
                    <span className="font-medium">{reservation.area}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Fecha:</span>
                    <span className="font-medium">{formatDateWithDayName(reservation.date)}</span>
                  </div>

                  {/* Ocultar horario solo para Hot Desk */}
                  {(() => {
                    const area = areas.find(a => a.name === reservation.area);
                    const isHotDesk = area?.category === 'HOT_DESK';
                    if (isHotDesk) return null;
                    return (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Horario:</span>
                        <span className="font-medium">
                          {`${reservation.startTime} - ${reservation.endTime}`}
                        </span>
                      </div>
                    );
                  })()}

                  <div className="flex justify-between">
                    <span className="text-gray-600">Equipo:</span>
                    <span className="font-medium">{reservation.teamName}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Puestos:</span>
                    <span className="font-medium">{reservation.requestedSeats}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Estado:</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(reservation.status)}`}>
                      {getStatusText(reservation.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* IDs de la Reservación */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Identificadores</h3>

                <div className="space-y-3">
                  <div>
                    <span className="text-gray-600 text-sm">ID de Reservación:</span>
                    <div className="font-mono text-sm bg-white p-2 rounded border mt-1">
                      {reservation.reservationId || 'No disponible'}
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-600 text-sm">ID MongoDB:</span>
                    <div className="font-mono text-sm bg-white p-2 rounded border mt-1">
                      {reservation._id}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha - Información Adicional */}
            <div className="space-y-4">
              {/* Colaboradores */}
              {reservation.colaboradores && reservation.colaboradores.length > 0 && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Colaboradores</h3>
                  <div className="space-y-2">
                    {reservation.colaboradores.map((c, index) => {
                      const collaboratorName = typeof c === 'object' && c.name
                        ? c.name
                        : typeof c === 'string'
                          ? (state.users.find(u => u.id === c || u._id === c)?.name || 'Usuario no encontrado')
                          : 'Usuario no encontrado';
                      return (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-gray-400">👤</span>
                          <span className="text-sm">{collaboratorName}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Asistentes */}
              {reservation.attendees && reservation.attendees.length > 0 && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Asistentes</h3>
                  <div className="space-y-2">
                    {reservation.attendees.map((attendee, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-gray-400">👥</span>
                        <span className="text-sm">{attendee}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Información de Auditoría */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Auditoría</h3>

                <div className="space-y-3">
                  {reservation.createdBy && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Creado por:</span>
                      <span className="font-medium">
                        {reservation.createdBy.userName} ({reservation.createdBy.userRole})
                      </span>
                    </div>
                  )}

                  {reservation.createdAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fecha de creación:</span>
                      <span className="font-medium">
                        {new Date(reservation.createdAt).toLocaleString('es-ES', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                    </div>
                  )}

                  {reservation.updatedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Última actualización:</span>
                      <span className="font-medium">
                        {new Date(reservation.updatedAt).toLocaleString('es-ES', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notas */}
          {reservation.notes && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Notas</h3>
              <p className="text-gray-700">{reservation.notes}</p>
            </div>
          )}

          {/* Información Debug */}
          {reservation.debug && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Información Debug</h3>
              <p className="text-sm text-gray-600 mb-4">
                Usa el botón "🔍 Debug" para ver información detallada de esta reserva.
              </p>
              <button
                onClick={() => showDebugInfo(reservation)}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                🔍 Ver Debug Completo
              </button>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cerrar
            </button>

            {canEditReservation(reservation) && onEdit && (
              <button
                onClick={() => {
                  onEdit(reservation);
                  onClose();
                }}
                className="px-4 py-2 text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Editar
              </button>
            )}

            {canDeleteReservation(reservation) && onDelete && (
              <button
                onClick={() => {
                  onDelete(reservation);
                  onClose();
                }}
                className="px-4 py-2 text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
              >
                Eliminar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
