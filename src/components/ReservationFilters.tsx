import React, { useState } from 'react';
import { Calendar, Download, Filter, X } from 'lucide-react';
import { reservationService } from '../services/api';
import { Reservation } from '../types';
import { createLocalDate, formatDateToString } from '../utils/unifiedDateUtils';

interface ReservationFiltersProps {
  reservations: Reservation[];
  onFilterChange: (filteredReservations: Reservation[]) => void;
  onLoadingChange: (loading: boolean) => void;
  areas: Array<{ id: string; name: string; capacity: number; isMeetingRoom?: boolean; isFullDayReservation?: boolean }>;
}

export function ReservationFilters({ reservations, onFilterChange, onLoadingChange, areas }: ReservationFiltersProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Función para filtrar reservaciones
  const applyFilters = async () => {
    try {
      onLoadingChange(true);
      
      const filters: any = {};
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (selectedArea) filters.area = selectedArea;
      if (selectedStatus) filters.status = selectedStatus;
      
      const filteredReservations = await reservationService.getAllReservations(filters);
      onFilterChange(filteredReservations);
    } catch (error) {
      console.error('Error aplicando filtros:', error);
      // En caso de error, mostrar todas las reservaciones
      onFilterChange(reservations);
    } finally {
      onLoadingChange(false);
    }
  };

  // Función para limpiar filtros
  const clearFilters = async () => {
    setStartDate('');
    setEndDate('');
    setSelectedArea('');
    setSelectedStatus('');
    try {
      onLoadingChange(true);
      const allReservations = await reservationService.getAllReservations();
      onFilterChange(allReservations);
    } catch (error) {
      console.error('Error limpiando filtros:', error);
      onFilterChange(reservations);
    } finally {
      onLoadingChange(false);
    }
  };

  // Función para exportar a CSV
  const exportToCSV = () => {
    const filteredReservations = getFilteredReservations();
    
    if (filteredReservations.length === 0) {
      alert('No hay reservaciones para exportar');
      return;
    }

    // Crear encabezados del CSV
    const headers = [
      'ID',
      'Área',
      'Fecha',
      'Hora Inicio',
      'Hora Fin',
      'Solicitante',
      'Equipo',
      'Email',
      'Teléfono',
      'Puestos',
      'Estado',
      'Notas',
      'Fecha Creación'
    ];

    // Crear filas del CSV
    const rows = filteredReservations.map(reservation => [
      reservation._id,
      reservation.area,
      formatDateToString(createLocalDate(reservation.date)),
      reservation.startTime,
      reservation.endTime,
      reservation.teamName,
      reservation.requestedSeats,
      getStatusText(reservation.status),
      reservation.notes,
      new Date(reservation.createdAt).toLocaleDateString('es-ES')
    ]);

    // Combinar encabezados y filas
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    // Crear y descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reservaciones_${startDate || 'todas'}_${endDate || 'hoy'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Función para obtener reservaciones filtradas
  const getFilteredReservations = () => {
    let filtered = [...reservations];

    if (startDate) {
      filtered = filtered.filter(reservation => {
        const reservationDate = createLocalDate(reservation.date);
        const start = createLocalDate(startDate);
        return reservationDate >= start;
      });
    }

    if (endDate) {
      filtered = filtered.filter(reservation => {
        const reservationDate = createLocalDate(reservation.date);
        const end = createLocalDate(endDate);
        return reservationDate <= end;
      });
    }

    if (selectedArea) {
      filtered = filtered.filter(reservation => reservation.area === selectedArea);
    }

    if (selectedStatus) {
      filtered = filtered.filter(reservation => reservation.status === selectedStatus);
    }

    return filtered;
  };

  // Función para obtener texto del estado
  const getStatusText = (status: string) => {
    const statusMap = {
      active: 'Activa',
      cancelled: 'Cancelada',
      completed: 'Completada'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const filteredCount = getFilteredReservations().length;

  return (
    <div className="bg-white rounded-lg shadow-md mb-6">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filtros y Exportación</h3>
            <span className="text-sm text-gray-500">
              ({filteredCount} de {reservations.length} reservaciones)
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center gap-2"
            >
              {showFilters ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
              {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
            </button>
            <button
              onClick={exportToCSV}
              className="btn-primary flex items-center gap-2"
              disabled={filteredCount === 0}
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro de fecha inicial */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicial
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Filtro de fecha final */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Final
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Filtro de área */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Área
              </label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Todas las áreas</option>
                {areas.map(area => (
                  <option key={area.id} value={area.name}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro de estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Todos los estados</option>
                <option value="active">Activa</option>
                <option value="cancelled">Cancelada</option>
                <option value="completed">Completada</option>
              </select>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={applyFilters}
              className="btn-primary flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Aplicar Filtros
            </button>
            <button
              onClick={clearFilters}
              className="btn-secondary flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Limpiar Filtros
            </button>
          </div>

          {/* Información del filtro activo */}
          {(startDate || endDate || selectedArea || selectedStatus) && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>Filtros activos:</strong>
                {startDate && ` Desde: ${new Date(startDate).toLocaleDateString('es-ES')}`}
                {endDate && ` Hasta: ${new Date(endDate).toLocaleDateString('es-ES')}`}
                {selectedArea && ` Área: ${selectedArea}`}
                {selectedStatus && ` Estado: ${getStatusText(selectedStatus)}`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
