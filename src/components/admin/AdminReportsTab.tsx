import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp } from '../../context/AppContext';
import { reservationService, userService } from '../../services/api';

export function AdminReportsTab() {
  const { state } = useApp();

  const [reportStartDate, setReportStartDate] = useState(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    date.setMonth(0, 1);
    return date.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    return date.toISOString().split('T')[0];
  });

  const exportReservations = async () => {
    try {
    const [allReservations, allUsers] = await Promise.all([
      reservationService.getAllReservations(),
      userService.getAllUsers(),
    ]);
    console.log('📊 Export debug:', {
      allReservations: allReservations?.length,
      allUsers: allUsers?.length,
      reportStartDate,
      reportEndDate,
      sampleDate: allReservations?.[0]?.date,
    });
    const filteredReservations = (allReservations || []).filter((r: any) => {
      const d = (r.date || '').split('T')[0];
      return d >= reportStartDate && d <= reportEndDate;
    });
    console.log('📊 filteredReservations:', filteredReservations.length);

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
    XLSX.writeFile(wb, `reservas_${reportStartDate}_${reportEndDate}.xlsx`);
    console.log('✅ Excel generado con', rows.length - 1, 'filas de datos');
    } catch (err: any) {
      console.error('❌ Error en export:', err);
      alert('Error al exportar: ' + (err?.message || err));
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros de fecha para reportes */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros de Reporte</h3>
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha inicial
            </label>
            <input
              type="date"
              value={reportStartDate || ''}
              onChange={(e) => setReportStartDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha final
            </label>
            <input
              type="date"
              value={reportEndDate || ''}
              onChange={(e) => setReportEndDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="text-sm text-gray-600">
            {(() => {
              const start = new Date(reportStartDate);
              const end = new Date(reportEndDate);
              const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              return `${days} día${days !== 1 ? 's' : ''} seleccionado${days !== 1 ? 's' : ''}`;
            })()}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Reportes y Análisis</h3>

        {/* Debug info - Oculto en producción */}
        {false && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
            <div className="font-medium text-blue-900 mb-1">Información de depuración:</div>
            <div className="text-blue-700">
              • Total de reservas en sistema: {state.reservations.length}
              <br />
              • Reservas completadas: {state.reservations.filter(r => r.status === 'completed').length}
              <br />
              • Rango seleccionado: {reportStartDate} a {reportEndDate}
              <br />
              • Reservas en rango: {state.reservations.filter(r => {
                if (r.status !== 'completed') return false;
                const reservationDateStr = r.date.split('T')[0];
                return reservationDateStr >= reportStartDate && reservationDateStr <= reportEndDate;
              }).length}
              <br />
              • Muestra de fechas de reservas completadas:
              <br />
              {state.reservations
                .filter(r => r.status === 'completed')
                .slice(0, 5)
                .map((r, i) => (
                  <div key={i} className="ml-4 text-xs">
                    - {r.area}: {r.date} (formato: {r.date.split('T')[0]})
                  </div>
                ))
              }
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Utilización por Área</h4>
            <p className="text-xs text-gray-500">
              Áreas de trabajo: Asientos reservados / Asientos totales disponibles<br />
              Salas de reuniones: Horas reservadas / Horas totales disponibles
            </p>
            {state.areas.map((area) => {
              const areaReservations = state.reservations.filter(r => {
                if (r.area !== area.name || r.status !== 'completed') return false;

                const reservationDateStr = r.date.split('T')[0];
                const startDateStr = reportStartDate;
                const endDateStr = reportEndDate;

                const isInRange = reservationDateStr >= startDateStr && reservationDateStr <= endDateStr;

                if (area.name === 'Hot Desk / Zona Abierta' && isInRange) {
                  console.log('📊 Reserva encontrada:', {
                    area: r.area,
                    date: r.date,
                    reservationDateStr,
                    startDateStr,
                    endDateStr,
                    isInRange
                  });
                }

                return isInRange;
              });

              const start = new Date(reportStartDate);
              const end = new Date(reportEndDate);
              let workDays = 0;
              for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dayOfWeek = d.getDay();
                if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                  workDays++;
                }
              }

              const totalBusinessHours = 11;
              const totalAvailableHours = totalBusinessHours * workDays;

              let utilization = 0;
              let totalReserved = 0;
              let totalAvailable = 0;

              if (area.isMeetingRoom) {
                totalAvailable = totalAvailableHours;

                if (areaReservations.length > 0 && workDays > 0) {
                  totalReserved = areaReservations.reduce((total, reservation) => {
                    const resStart = new Date(`2000-01-01T${reservation.startTime}`);
                    const resEnd = new Date(`2000-01-01T${reservation.endTime}`);
                    const durationHours = (resEnd.getTime() - resStart.getTime()) / (1000 * 60 * 60);
                    return total + durationHours;
                  }, 0);

                  utilization = Math.min((totalReserved / totalAvailable) * 100, 100);
                }
              } else {
                totalAvailable = area.capacity * workDays;

                if (areaReservations.length > 0 && workDays > 0) {
                  const seatsByDay: { [key: string]: Set<number> } = {};

                  areaReservations.forEach(reservation => {
                    const dateKey = reservation.date.split('T')[0];
                    if (!seatsByDay[dateKey]) {
                      seatsByDay[dateKey] = new Set();
                    }
                    for (let i = 0; i < reservation.requestedSeats; i++) {
                      seatsByDay[dateKey].add(i);
                    }
                  });

                  totalReserved = Object.values(seatsByDay).reduce((total, seats) => {
                    return total + seats.size;
                  }, 0);

                  utilization = Math.min((totalReserved / totalAvailable) * 100, 100);
                }
              }

              return (
                <div key={area.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{area.name}</span>
                    <div className="text-right">
                      <span className="font-medium">{utilization.toFixed(1)}%</span>
                      <div className="text-xs text-gray-500">
                        {area.isMeetingRoom
                          ? `${totalReserved.toFixed(1)} / ${totalAvailable} hrs`
                          : `${Math.round(totalReserved)} / ${Math.round(totalAvailable)} asientos`
                        }
                      </div>
                      <div className="text-xs text-gray-400">
                        {areaReservations.length} reserva{areaReservations.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        utilization >= 90 ? 'bg-danger-500' :
                        utilization >= 70 ? 'bg-warning-500' : 'bg-success-500'
                      }`}
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Reservas por Estado</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Completadas</span>
                <span className="font-medium text-success-600">
                  {state.reservations.filter(r => r.status === 'completed').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pendientes</span>
                <span className="font-medium text-warning-600">
                  {state.reservations.filter(r => r.status === 'pending').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Canceladas</span>
                <span className="font-medium text-danger-600">
                  {state.reservations.filter(r => r.status === 'cancelled').length}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 mt-6">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Reservas por Departamento</h4>
            <p className="text-xs text-gray-500">
              Reservas completadas en el rango de fechas seleccionado
            </p>
            <div className="space-y-3">
              {(() => {
                const completedReservations = state.reservations.filter(r => {
                  if (r.status !== 'completed') return false;
                  const reservationDateStr = r.date.split('T')[0];
                  return reservationDateStr >= reportStartDate && reservationDateStr <= reportEndDate;
                });

                const byDepartment: { [key: string]: number } = {};
                completedReservations.forEach(r => {
                  const userId = !r.userId ? null : typeof r.userId === 'string' ? r.userId : r.userId._id;
                  const user = state.users.find(u => u._id === userId || u.id === userId);
                  const dept = user?.department || 'Sin departamento';
                  byDepartment[dept] = (byDepartment[dept] || 0) + 1;
                });

                const sortedDepartments = Object.entries(byDepartment)
                  .sort(([, a], [, b]) => b - a);

                if (sortedDepartments.length === 0) {
                  return (
                    <div className="text-sm text-gray-500 text-center py-4">
                      No hay reservas completadas en el rango seleccionado
                    </div>
                  );
                }

                return sortedDepartments.map(([department, count]) => (
                  <div key={department} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{department}</span>
                    <span className="font-medium text-primary-600">{count}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={exportReservations}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-6 h-6 text-primary-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">Exportar Excel</div>
              <div className="text-sm text-gray-500">Descargar reservas del rango seleccionado en CSV detallado</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
