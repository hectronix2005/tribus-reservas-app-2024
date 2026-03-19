import React, { useState, useEffect } from 'react';
import { Calendar, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp } from '../../context/AppContext';
import { formatDateInBogota } from '../../utils/unifiedDateUtils';
import { reservationService, userService } from '../../services/api';

export function AdminReservationsTab() {
  const { state, dispatch } = useApp();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  });
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);

  useEffect(() => {
    console.log('🔄 Cargando reservaciones para Admin...');
    console.log('📊 Estado actual de reservaciones:', state.reservations);

    if (state.reservations.length === 0) {
      loadReservations();
    }
  }, []);

  const loadReservations = async () => {
    try {
      setIsLoadingReservations(true);
      console.log('🔄 Iniciando carga de reservaciones...');

      const reservations = await reservationService.getAllReservations();
      console.log('✅ Reservaciones cargadas:', reservations);

      dispatch({ type: 'SET_RESERVATIONS', payload: reservations });
    } catch (error) {
      console.error('❌ Error cargando reservaciones:', error);
    } finally {
      setIsLoadingReservations(false);
    }
  };

  const handleReservationStatusChange = (reservationId: string, status: 'confirmed' | 'cancelled') => {
    const reservation = state.reservations.find(r => r._id === reservationId);
    if (reservation) {
      const updatedReservation = { ...reservation, status };
      dispatch({ type: 'UPDATE_RESERVATION', payload: updatedReservation });
    }
  };

  const handleDeleteReservation = (reservationId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta reserva?')) {
      dispatch({ type: 'DELETE_RESERVATION', payload: reservationId });
    }
  };

  const getReservationsByDateRange = (start: string, end: string) => {
    console.log('🔍 Filtrando reservaciones:', {
      totalReservations: state.reservations.length,
      startDate: start,
      endDate: end,
      reservations: state.reservations
    });

    const filtered = state.reservations.filter(r => {
      const reservationDate = new Date(r.date);
      const startObj = new Date(start);
      const endObj = new Date(end);
      const isInRange = reservationDate >= startObj && reservationDate <= endObj;

      console.log('📅 Reservación:', {
        id: r._id,
        date: r.date,
        reservationDate: reservationDate.toISOString(),
        start: startObj.toISOString(),
        end: endObj.toISOString(),
        isInRange
      });

      return isInRange;
    });

    console.log('✅ Reservaciones filtradas:', filtered.length);
    return filtered;
  };

  const handleStartDateChange = (date: string) => {
    setIsFiltering(true);
    setStartDate(date);
    setTimeout(() => setIsFiltering(false), 300);
  };

  const handleEndDateChange = (date: string) => {
    setIsFiltering(true);
    setEndDate(date);
    setTimeout(() => setIsFiltering(false), 300);
  };

  const getStatusBadge = (status: string) => {
    if (!status || status === 'undefined' || status === 'null') {
      console.warn('getStatusBadge recibió un status inválido:', { status, type: typeof status });
    }

    const statusConfig = {
      confirmed: { label: 'Confirmada', class: 'badge-success' },
      pending: { label: 'Pendiente', class: 'badge-warning' },
      cancelled: { label: 'Cancelada', class: 'badge-danger' },
      active: { label: 'Activa', class: 'badge-success' },
      inactive: { label: 'Inactiva', class: 'badge-secondary' },
      admin: { label: 'Administrador', class: 'badge-warning' },
      user: { label: 'Usuario', class: 'badge-info' },
      lider: { label: 'Lider', class: 'badge-info' },
      colaborador: { label: 'Colaborador', class: 'badge-secondary' }
    };
    const config = statusConfig[status as keyof typeof statusConfig];

    if (!config) {
      console.warn(`Estado no reconocido: ${status}`, {
        status,
        type: typeof status,
        availableStatuses: Object.keys(statusConfig)
      });
      return <span className="badge badge-secondary">{status || 'Desconocido'}</span>;
    }

    return <span className={`badge ${config.class}`}>{config.label}</span>;
  };

  const exportReservations = async () => {
    const [allReservations, allUsers] = await Promise.all([
      reservationService.getAllReservations(),
      userService.getAllUsers(),
    ]);
    const filteredReservations = allReservations.filter((r: any) => {
      const d = r.date.split('T')[0];
      return d >= startDate && d <= endDate;
    });

    const rows: string[][] = [];

    rows.push([
      'ID Reserva',
      'Estado',
      'Área',
      'Nombre de Equipo',
      'Puestos Solicitados',
      'Fecha',
      'Hora Inicio',
      'Hora Fin',
      'Duración (min)',
      'Nombre',
      'ID de Empleado',
      'Email',
      'Departamento',
      'Rol',
      'Responsable',
      'Fecha Creación',
      'Notas'
    ]);

    filteredReservations.forEach(r => {
      const area = state.areas.find(a => a.name === r.area);
      const isHotDesk = area?.category === 'HOT_DESK';

      let durationMinutes = 0;
      if (!isHotDesk && r.startTime && r.endTime) {
        const start = new Date(`2000-01-01T${r.startTime}`);
        const end = new Date(`2000-01-01T${r.endTime}`);
        durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
      }

      const userId = !r.userId ? null : typeof r.userId === 'string' ? r.userId : r.userId._id;
      const responsableUser = allUsers.find((u: any) => u._id === userId || u.id === userId);
      const responsableName = responsableUser?.name || r.userName || 'N/A';
      const createdAt = r.createdAt ? new Date(r.createdAt).toLocaleString('es-ES') : 'N/A';

      const baseData = [
        r._id || r.reservationId || '',
        r.status,
        r.area,
        r.teamName,
        r.requestedSeats.toString(),
        r.date.split('T')[0],
        isHotDesk ? '' : r.startTime,
        isHotDesk ? '' : r.endTime,
        isHotDesk ? '' : durationMinutes.toString(),
      ];

      const participants: Array<{ name: string; employeeId: string; email: string; department: string; rol: string }> = [];

      participants.push({
        name: responsableName,
        employeeId: responsableUser?.employeeId || 'N/A',
        email: responsableUser?.email || 'N/A',
        department: responsableUser?.department || 'N/A',
        rol: 'Responsable',
      });

      const attendees: string[] = r.attendees || [];
      (r.colaboradores || []).forEach((collab: any, idx: number) => {
        const collabId = typeof collab === 'string' ? collab : collab._id;
        const collabUser = allUsers.find((u: any) => u._id === collabId || u.id === collabId);
        const attendeeName = attendees[idx] || null;
        participants.push({
          name: collabUser?.name || (typeof collab === 'object' ? collab.name : null) || attendeeName || 'N/A',
          employeeId: collabUser?.employeeId || 'N/A',
          email: collabUser?.email || (typeof collab === 'object' ? collab.email : null) || 'N/A',
          department: collabUser?.department || 'N/A',
          rol: 'Colaborador',
        });
      });

      participants.forEach(p => {
        rows.push([
          ...baseData,
          p.name,
          p.employeeId,
          p.email,
          p.department,
          p.rol,
          responsableName,
          createdAt,
          r.notes || '',
        ]);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);

    ws['!cols'] = [
      { wch: 28 }, // ID Reserva
      { wch: 13 }, // Estado
      { wch: 20 }, // Área
      { wch: 22 }, // Nombre de Equipo
      { wch: 10 }, // Puestos Solicitados
      { wch: 12 }, // Fecha
      { wch: 11 }, // Hora Inicio
      { wch: 11 }, // Hora Fin
      { wch: 13 }, // Duración (min)
      { wch: 26 }, // Nombre
      { wch: 16 }, // ID de Empleado
      { wch: 30 }, // Email
      { wch: 22 }, // Departamento
      { wch: 14 }, // Rol
      { wch: 26 }, // Responsable
      { wch: 20 }, // Fecha Creación
      { wch: 35 }, // Notas
    ];

    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    ws['!autofilter'] = { ref: ws['!ref'] as string };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reservas');
    XLSX.writeFile(wb, `reservas_${startDate}_${endDate}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Gestión de Reservas</h3>
          <p className="text-sm text-gray-600">
            Administra todas las reservas del sistema
          </p>
        </div>
        <button
          onClick={exportReservations}
          className="btn-secondary flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Excel</span>
        </button>
      </div>

      <div className="card">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Filtrar por rango de fechas
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Las reservaciones se filtran automáticamente al cambiar las fechas
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-500">
                {getReservationsByDateRange(startDate, endDate).length} de {state.reservations.length} reservaciones
              </span>
              <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                {isFiltering ? (
                  <>
                    <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    Filtrando...
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    Filtrado automático activo
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Fecha inicial
              </label>
              <input
                type="date"
                value={startDate || ''}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Fecha final
              </label>
              <input
                type="date"
                value={endDate || ''}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {(isFiltering || isLoadingReservations) && (
            <div className="flex items-center justify-center py-4 bg-blue-50 border-b border-blue-200">
              <div className="flex items-center gap-2 text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">
                  {isLoadingReservations ? 'Cargando reservaciones...' : 'Actualizando filtros...'}
                </span>
              </div>
            </div>
          )}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grupo/Área
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Área de Trabajo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Puestos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha/Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registrado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getReservationsByDateRange(startDate, endDate).map((reservation) => (
                <tr key={reservation._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {reservation.teamName || 'Sin grupo'}
                      </div>
                      {reservation.notes && (
                        <div className="text-sm text-gray-500">{reservation.notes}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{reservation.area || 'Sin área'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {state.areas.find(a => a.name === reservation.area)?.isMeetingRoom
                        ? `${reservation.requestedSeats || 0} personas (sala completa)`
                        : `${reservation.requestedSeats || 0} puestos`
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {reservation.date ? formatDateInBogota(reservation.date, 'dd/MM/yyyy') : 'Sin fecha'}
                    </div>
                    {/* Solo mostrar horario si NO es Hot Desk */}
                    {(() => {
                      const area = state.areas.find(a => a.name === reservation.area);
                      const isHotDesk = area?.category === 'HOT_DESK';
                      if (isHotDesk) return null;
                      return (
                        <div className="text-sm text-gray-500">
                          {reservation.startTime || 'Sin hora'} - {reservation.endTime || 'N/A'}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(reservation.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {reservation.createdAt ? new Date(reservation.createdAt).toLocaleString('es-ES', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {reservation.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleReservationStatusChange(reservation._id, 'confirmed')}
                            className="text-success-600 hover:text-success-900"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => handleReservationStatusChange(reservation._id, 'cancelled')}
                            className="text-danger-600 hover:text-danger-900"
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                      {reservation.status === 'confirmed' && (
                        <button
                          onClick={() => handleReservationStatusChange(reservation._id, 'cancelled')}
                          className="text-danger-600 hover:text-danger-900"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteReservation(reservation._id)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isLoadingReservations ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-500">Cargando reservaciones...</p>
          </div>
        ) : state.reservations.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">No hay reservaciones en el sistema</p>
            <button
              onClick={loadReservations}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Reintentar carga
            </button>
          </div>
        ) : getReservationsByDateRange(startDate, endDate).length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">No hay reservaciones en el rango seleccionado</p>
            <p className="text-xs text-gray-400">
              Rango: {new Date(startDate).toLocaleDateString('es-ES')} - {new Date(endDate).toLocaleDateString('es-ES')}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
