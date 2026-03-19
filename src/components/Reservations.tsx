import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Calendar, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { reservationService } from '../services/api';
import { createLocalDate } from '../utils/unifiedDateUtils';
import { ReservationFilters } from './ReservationFilters';
import { Reservation } from '../types';
import { addMinutesToTime } from '../utils/reservationUtils';
import { ReservationCard } from './reservations/ReservationCard';
import { ReservationViewModal } from './reservations/ReservationViewModal';
import { ReservationConfirmationModal } from './reservations/ReservationConfirmationModal';
import { ReservationForm } from './reservations/ReservationForm';

export function Reservations() {
  const { state, dispatch } = useApp();
  const currentUser = state.auth.currentUser;

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [viewingReservation, setViewingReservation] = useState<Reservation | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'createdAt' | 'area' | 'team'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMyReservationsOnly, setShowMyReservationsOnly] = useState(true);

  // State for form pre-fill (from availability click)
  const [formInitialData, setFormInitialData] = useState<Record<string, any> | undefined>(undefined);

  // State for the post-creation confirmation modal
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmedReservation, setConfirmedReservation] = useState<any>(null);

  // ---- data loading -----------------------------------------------------------

  const loadReservations = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await reservationService.getAllReservations();
      setReservations(data);
      dispatch({ type: 'SET_RESERVATIONS', payload: data });
      setError(null);
      console.log('🔄 [Reservations] Estado global actualizado:', {
        totalReservations: data.length,
        hotDeskReservations: data.filter(r => r.area === 'Hot Desk').length,
      });
      window.dispatchEvent(new CustomEvent('reservationsUpdated', { detail: { reservations: data } }));
    } catch (err) {
      console.error('Error cargando reservaciones:', err);
      setError('Error al cargar las reservaciones');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  // Listen for a new reservation created inside ReservationForm
  useEffect(() => {
    const handleReservationCreated = (event: any) => {
      if (event.detail?.reservation) {
        setConfirmedReservation(event.detail.reservation);
        setShowConfirmationModal(true);
        setShowForm(false);
        setEditingReservation(null);
        setFormInitialData(undefined);
      }
    };
    window.addEventListener('reservationCreated', handleReservationCreated);
    return () => window.removeEventListener('reservationCreated', handleReservationCreated);
  }, []);

  // ---- event listeners from Availability view ---------------------------------

  useEffect(() => {
    const handleAvailabilityHourClick = (event: any) => {
      console.log('🎯 Evento recibido:', event);
      if (event.detail) {
        const { area, date, hour } = event.detail;
        console.log('🎯 Evento de disponibilidad recibido:', { area, date, hour });
        setTimeout(() => {
          setFormInitialData({
            area: area.name,
            date,
            startTime: hour,
            endTime: addMinutesToTime(hour, 60),
            teamName: '',
            requestedSeats: area.category === 'SALA' ? area.capacity : 1,
            notes: '',
          });
          setShowForm(true);
          setEditingReservation(null);
          setError(null);
          console.log('✅ Formulario pre-llenado y abierto');
        }, 100);
      }
    };

    const handleNewReservationClick = () => {
      console.log('📡 Evento newReservationClick recibido en Reservations');
      setShowForm(true);
    };

    const handleAreaClick = (event: CustomEvent) => {
      console.log('📡 Evento areaClick recibido en Reservations:', event.detail);
      const { area, date } = event.detail;
      setFormInitialData({ area: area.name, date });
      setShowForm(true);
    };

    window.addEventListener('availabilityHourClick', handleAvailabilityHourClick);
    window.addEventListener('newReservationClick', handleNewReservationClick);
    window.addEventListener('areaClick', handleAreaClick as EventListener);

    return () => {
      window.removeEventListener('availabilityHourClick', handleAvailabilityHourClick);
      window.removeEventListener('newReservationClick', handleNewReservationClick);
      window.removeEventListener('areaClick', handleAreaClick as EventListener);
    };
  }, [state.auth.currentUser]);

  // ---- sorting ----------------------------------------------------------------

  const sortReservations = useCallback(
    (list: Reservation[]) =>
      [...list].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'createdAt':
            comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
          case 'date':
            comparison = createLocalDate(a.date).getTime() - createLocalDate(b.date).getTime();
            break;
          case 'area':
            comparison = a.area.localeCompare(b.area);
            break;
          case 'team':
            comparison = a.teamName.localeCompare(b.teamName);
            break;
          default:
            comparison = 0;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      }),
    [sortBy, sortOrder]
  );

  useEffect(() => {
    if (filteredReservations.length > 0) {
      setFilteredReservations(sortReservations(filteredReservations));
    }
  }, [sortBy, sortOrder]); // intentionally limited deps to avoid loop

  const handleFilterChange = (filtered: Reservation[]) => {
    setFilteredReservations(sortReservations(filtered));
  };

  const handleSortChange = (newSortBy: 'date' | 'createdAt' | 'area' | 'team') => {
    if (sortBy === newSortBy) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  // ---- CRUD handlers ----------------------------------------------------------

  const handleViewReservation = (reservation: Reservation) => setViewingReservation(reservation);
  const handleCloseView = () => setViewingReservation(null);

  const handleEdit = (reservation: Reservation) => {
    setEditingReservation(reservation);
    setFormInitialData(undefined);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingReservation(null);
    setFormInitialData(undefined);
    setError(null);
  };

  const handleDelete = async (reservation: Reservation) => {
    if (!currentUser) {
      setError('Debe iniciar sesión para eliminar una reservación');
      return;
    }

    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';
    const reservationUserId =
      typeof reservation.userId === 'string' ? reservation.userId : reservation.userId?._id;
    const currentUserId = currentUser.id || currentUser._id;

    const isCreator =
      reservationUserId === currentUserId ||
      reservationUserId === currentUser.id ||
      reservationUserId === currentUser._id ||
      reservation.createdBy?.userId === currentUserId ||
      reservation.createdBy?.userId === currentUser.id ||
      reservation.createdBy?.userId === currentUser._id ||
      (typeof reservation.userId === 'object' &&
        reservation.userId?.username === currentUser.username);

    console.log('🔍 DEBUG - Verificación de permisos para eliminar:', {
      currentUser: { id: currentUser.id, _id: currentUser._id, username: currentUser.username, role: currentUser.role },
      reservation: { userId: reservation.userId, reservationUserId, 'createdBy.userId': reservation.createdBy?.userId },
      resultado: { isAdmin, isCreator },
    });

    if (!isAdmin && !isCreator) {
      setError('No tienes permisos para eliminar esta reservación. Solo administradores y el creador pueden eliminarla.');
      return;
    }

    if (!window.confirm('¿Está seguro de que desea eliminar esta reservación?')) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('🗑️ ELIMINANDO RESERVACIÓN:', {
        timestamp: new Date().toISOString(),
        deletedBy: { id: currentUser.id, name: currentUser.name, username: currentUser.username, role: currentUser.role },
        reservation: {
          id: reservation._id, area: reservation.area, date: reservation.date,
          startTime: reservation.startTime, endTime: reservation.endTime,
          teamName: reservation.teamName, requestedSeats: reservation.requestedSeats,
          status: reservation.status, createdAt: reservation.createdAt,
          createdBy: reservation.createdBy, colaboradores: reservation.colaboradores,
          attendees: reservation.attendees,
        },
      });

      await reservationService.deleteReservation(reservation._id, currentUser.id);

      console.log('✅ RESERVACIÓN ELIMINADA EXITOSAMENTE:', {
        timestamp: new Date().toISOString(),
        deletedBy: currentUser.username,
        reservationId: reservation._id,
        area: reservation.area,
        date: reservation.date,
      });

      window.location.reload();
    } catch (err: any) {
      console.error('❌ Error eliminando reservación:', err);
      setError(err.message || 'Error al eliminar la reservación');
      setIsLoading(false);
    }
  };

  // showDebugInfo — kept in Reservations.tsx (used by ReservationCard via onShowDebug)
  const safeValue = (value: any, fallback: string = 'N/A'): string => {
    if (value === null || value === undefined || value === '' || value === 'null' || value === 'undefined') return fallback;
    if (typeof value === 'string') {
      const lv = value.toLowerCase();
      if (lv === 'unknown' || lv === 'null' || lv === 'undefined' || lv === '') return fallback;
      if (lv.includes('unknown@') && fallback === 'N/A') return 'Email no disponible';
    }
    return String(value);
  };

  const formatDate = (dateString: any): string => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString('es-CO', {
        timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
    } catch { return 'N/A'; }
  };

  const getUserInfo = (userId: string): { name: string; email: string; role: string; cedula: string } => {
    const user = state.users.find(u => u.id === userId || u._id === userId);
    if (user) return {
      name: safeValue(user.name), email: safeValue(user.email),
      role: safeValue(user.role), cedula: safeValue(user.cedula),
    };
    return { name: 'Usuario no encontrado', email: 'N/A', role: 'N/A', cedula: 'N/A' };
  };

  const areas = useMemo(() => state.areas.filter(area => area.isActive !== false), [state.areas]);

  const showDebugInfo = (reservation: Reservation) => {
    console.log('🔍 Verificando información debug para reservación:', {
      reservationId: reservation.reservationId,
      _id: reservation._id,
      hasDebug: !!reservation.debug,
      debugKeys: reservation.debug ? Object.keys(reservation.debug) : [],
    });

    if (reservation.debug) {
      console.log('🔍 Debug object completo:', reservation.debug);
      console.log('🔍 systemInfo:', reservation.debug.systemInfo);
      console.log('🔍 userInfo:', (reservation.debug as any).userInfo);
      console.log('🔍 dateProcessing:', (reservation.debug as any).dateProcessing);
      console.log('🔍 areaInfo:', (reservation.debug as any).areaInfo);
    }

    if (!reservation.debug) {
      const basicInfo = `
🔍 INFORMACIÓN BÁSICA DE LA RESERVACIÓN
═══════════════════════════════════════

📋 INFORMACIÓN BÁSICA
─────────────────────
ID de Reservación: ${reservation.reservationId || 'N/A'}
ID de Base de Datos: ${reservation._id}
Fecha de Creación: ${reservation.createdAt || 'N/A'}

👤 INFORMACIÓN DEL USUARIO
──────────────────────────
Usuario: ${reservation.userName || 'N/A'}
Área: ${reservation.area || 'N/A'}
Equipo: ${reservation.teamName || 'N/A'}

📅 INFORMACIÓN DE LA RESERVA
────────────────────────────
Fecha: ${reservation.date || 'N/A'}
${(() => {
  const area = areas.find(a => a.name === reservation.area);
  const isHotDesk = area?.category === 'HOT_DESK';
  if (isHotDesk) return '';
  return `Hora Inicio: ${reservation.startTime || 'N/A'}\nHora Fin: ${reservation.endTime || 'N/A'}\n`;
})()}Puestos Solicitados: ${reservation.requestedSeats || 0}
Estado: ${reservation.status || 'N/A'}

👥 COLABORADORES
────────────────
${reservation.colaboradores?.map((c, i) => `${i + 1}. ${(c as any).name || c}`).join('\n') || 'Ninguno'}

📝 NOTAS
────────
${reservation.notes || 'Sin notas'}

⚠️ INFORMACIÓN DEBUG
────────────────────
Esta reservación fue creada antes de implementar el sistema de debug mejorado.
Para ver información debug detallada, crea una nueva reservación.

═══════════════════════════════════════
`;
      alert(basicInfo);
      return;
    }

    console.log('🔍 INFORMACIÓN DEBUG COMPLETA DE LA RESERVACIÓN:', {
      reservationId: reservation.reservationId, _id: reservation._id, debug: reservation.debug,
    });

    const debug = reservation.debug as any;
    const debugInfo = `
🔍 INFORMACIÓN DEBUG DETALLADA
═══════════════════════════════════════

📋 INFORMACIÓN BÁSICA
─────────────────────
ID de Reservación: ${safeValue(reservation.reservationId)}
ID de Base de Datos: ${safeValue(reservation._id)}
Versión del Sistema: ${safeValue(debug.systemInfo?.version, '1.0.0')}
ID de Request: ${safeValue(debug.systemInfo?.requestId)}

👤 INFORMACIÓN DEL USUARIO
──────────────────────────
Creador: ${(() => {
  const creatorId = debug.userInfo?.creator?.id;
  const creatorInfo = creatorId ? getUserInfo(creatorId) : {
    name: safeValue(debug.userInfo?.creator?.name || reservation.userName),
    email: safeValue(debug.userInfo?.creator?.email),
    role: safeValue(debug.userInfo?.creator?.role),
    cedula: safeValue(debug.userInfo?.creator?.cedula),
  };
  return creatorInfo.name;
})()}
Email: ${(() => {
  const creatorId = debug.userInfo?.creator?.id;
  const creatorInfo = creatorId ? getUserInfo(creatorId) : {
    email: safeValue(debug.userInfo?.creator?.email),
    name: '', role: '', cedula: '',
  };
  return creatorInfo.email;
})()}
Rol: ${(() => {
  const creatorId = debug.userInfo?.creator?.id;
  const creatorInfo = creatorId ? getUserInfo(creatorId) : {
    role: safeValue(debug.userInfo?.creator?.role),
    name: '', email: '', cedula: '',
  };
  return creatorInfo.role;
})()}
Cédula: ${(() => {
  const creatorId = debug.userInfo?.creator?.id;
  const creatorInfo = creatorId ? getUserInfo(creatorId) : {
    cedula: safeValue(debug.userInfo?.creator?.cedula),
    name: '', email: '', role: '',
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
Fecha de Creación: ${formatDate(debug.systemInfo?.createdAt || reservation.createdAt)}
Fecha Reservada: ${formatDate(debug.dateProcessing?.original?.dateString || reservation.date)}
Fecha UTC: ${formatDate(debug.dateProcessing?.utc?.reservationDate)}
${(() => {
  const area = areas.find(a => a.name === reservation.area);
  const isHotDesk = area?.category === 'HOT_DESK';
  if (isHotDesk) return '';
  return `Hora Inicio: ${safeValue(debug.dateProcessing?.original?.startTimeString || reservation.startTime)}\nHora Fin: ${safeValue(debug.dateProcessing?.original?.endTimeString || reservation.endTime)}\n`;
})()}Día de la Semana: ${safeValue(debug.dateProcessing?.validation?.dayName)}
Zona Horaria: ${safeValue(debug.dateProcessing?.utc?.timezone || debug.systemInfo?.timezone, 'America/Bogota')}
User Agent: ${safeValue(debug.systemInfo?.userAgent || debug.metadata?.userAgent)}
Es Día de Oficina: ${debug.dateProcessing?.validation?.isOfficeDay ? 'Sí' : 'No'}
Es Fecha Futura: ${debug.dateProcessing?.validation?.isFutureDate ? 'Sí' : 'No'}

🏢 INFORMACIÓN DEL ÁREA
────────────────────────
Área: ${safeValue(debug.areaInfo?.areaName || reservation.area)}
Tipo: ${safeValue(debug.areaInfo?.areaType)}
Capacidad Total: ${safeValue(debug.areaInfo?.capacity, '50')}
Puestos Solicitados: ${safeValue(debug.areaInfo?.requestedSeats || debug.inputData?.processed?.finalRequestedSeats || reservation.requestedSeats, '0')}
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
    name: safeValue(debug.userInfo?.creator?.name || reservation.userName),
    email: safeValue(debug.userInfo?.creator?.email),
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
  const creatorInfo = creatorId ? getUserInfo(creatorId) : { email: safeValue(debug.userInfo?.creator?.email) };
  const emails = [creatorInfo.email];
  if (debug.userInfo?.collaborators?.length > 0) {
    debug.userInfo.collaborators.forEach((c: any) => {
      const userInfo = getUserInfo(c.id || c);
      if (userInfo.email && userInfo.email !== creatorInfo.email) emails.push(userInfo.email);
    });
  }
  return emails.join(', ');
})()}
🔒 BCC (copia oculta): noreply.tribus@gmail.com

═══════════════════════════════════════
`;

    if (debugInfo.length > 2000) {
      console.log(debugInfo);
      alert(`🔍 Información debug completa mostrada en consola (F12)\n\nResumen:\nID: ${reservation.reservationId}\nCreador: ${debug.userInfo?.creator?.name}\nÁrea: ${debug.areaInfo?.areaName}\nFecha: ${debug.dateProcessing?.original?.dateString}\nPuestos: ${debug.areaInfo?.requestedSeats}/${debug.areaInfo?.capacity}`);
    } else {
      alert(debugInfo);
    }
  };

  // ---- render -----------------------------------------------------------------

  return (
    <div className="container mx-auto px-3 py-4 md:px-4 md:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Reservaciones</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">Gestiona las reservaciones de espacios de trabajo</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={() => setShowMyReservationsOnly(!showMyReservationsOnly)}
            className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md font-medium text-sm transition-colors ${
              showMyReservationsOnly
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            disabled={isLoading}
          >
            <User className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="whitespace-nowrap">Mis Reservas</span>
          </button>

          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-sm"
            disabled={isLoading}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="whitespace-nowrap">Nueva Reservación</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Formulario de Reservación */}
      {showForm && (
        <ReservationForm
          editingReservation={editingReservation}
          initialData={formInitialData}
          onSubmitSuccess={() => {
            setShowForm(false);
            setEditingReservation(null);
            setFormInitialData(undefined);
          }}
          onCancel={handleCancel}
        />
      )}

      {/* Ordenador de Reservaciones */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Ordenar por:</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleSortChange('createdAt')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  sortBy === 'createdAt'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Fecha de creación"
              >
                📅 Creación {sortBy === 'createdAt' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>

              <button
                onClick={() => handleSortChange('date')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  sortBy === 'date'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Fecha de la reservación"
              >
                📆 Fecha {sortBy === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>

              <button
                onClick={() => handleSortChange('area')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  sortBy === 'area'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Área"
              >
                🏢 Área {sortBy === 'area' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>

              <button
                onClick={() => handleSortChange('team')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  sortBy === 'team'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Equipo"
              >
                👥 Equipo {sortBy === 'team' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Orden:</span>
            <span className="font-medium">
              {sortOrder === 'desc' ? 'Descendente (más reciente primero)' : 'Ascendente (más antiguo primero)'}
            </span>
          </div>
        </div>
      </div>

      {/* Filtros y Exportación */}
      <ReservationFilters
        reservations={reservations}
        onFilterChange={handleFilterChange}
        onLoadingChange={setIsLoading}
        areas={areas}
        showMyReservationsOnly={showMyReservationsOnly}
        onMyReservationsChange={setShowMyReservationsOnly}
      />

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
        ) : filteredReservations.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No hay reservaciones que coincidan con los filtros</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredReservations.map((reservation) => (
              <ReservationCard
                key={reservation._id}
                reservation={reservation}
                currentUser={currentUser}
                onView={handleViewReservation}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onShowDebug={showDebugInfo}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de Vista Completa de Reservación */}
      {viewingReservation && (
        <ReservationViewModal
          reservation={viewingReservation}
          onClose={handleCloseView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          currentUser={currentUser}
        />
      )}

      {/* Modal de Confirmación de Reserva */}
      {showConfirmationModal && confirmedReservation && (
        <ReservationConfirmationModal
          reservation={confirmedReservation}
          onClose={() => {
            setShowConfirmationModal(false);
            setConfirmedReservation(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
