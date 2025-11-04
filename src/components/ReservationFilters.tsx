import React, { useState, useEffect } from 'react';
import { Calendar, Download, Filter, X, User as UserIcon } from 'lucide-react';
import { reservationService } from '../services/api';
import { Reservation } from '../types';
import { createLocalDate, formatDateToString } from '../utils/unifiedDateUtils';
import { useApp } from '../context/AppContext';

interface ReservationFiltersProps {
  reservations: Reservation[];
  onFilterChange: (filteredReservations: Reservation[]) => void;
  onLoadingChange: (loading: boolean) => void;
  areas: Array<{ id: string; name: string; capacity: number; isMeetingRoom?: boolean; isFullDayReservation?: boolean }>;
  showMyReservationsOnly?: boolean;
  onMyReservationsChange?: (value: boolean) => void;
}

export function ReservationFilters({
  reservations,
  onFilterChange,
  onLoadingChange,
  areas,
  showMyReservationsOnly: externalShowMyReservations,
  onMyReservationsChange
}: ReservationFiltersProps) {
  const { state } = useApp();
  const currentUser = state.auth.currentUser;

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(''); // SIN FILTRO DE ESTADO POR DEFECTO
  const [internalShowMyReservations, setInternalShowMyReservations] = useState(true); // ACTIVADO POR DEFECTO
  const [showFilters, setShowFilters] = useState(false);
  const [filtersApplied, setFiltersApplied] = useState(false);

  // Usar el estado externo si está disponible, de lo contrario usar el interno
  const showMyReservationsOnly = externalShowMyReservations !== undefined ? externalShowMyReservations : internalShowMyReservations;
  const setShowMyReservationsOnly = onMyReservationsChange || setInternalShowMyReservations;

  // Cargar todas las reservaciones al inicio y aplicar filtros por defecto
  useEffect(() => {
    // Solo ejecutar cuando currentUser esté disponible (si el filtro "Mis Reservas" está activo)
    if (showMyReservationsOnly && !currentUser) {
      console.log('⏳ Esperando a que currentUser esté disponible...');
      return;
    }

    const loadAllReservations = async () => {
      try {
        onLoadingChange(true);
        const allReservations = await reservationService.getAllReservations();

        // Aplicar filtros por defecto: "Mis Reservas"
        let filtered = allReservations;

        // Filtrar por usuario si está activo
        if (showMyReservationsOnly && currentUser) {
          filtered = filtered.filter((reservation: Reservation) => {
            return reservation.createdBy?.userId === currentUser.id ||
                   reservation.createdBy?.userId === currentUser._id ||
                   reservation.userId === currentUser.id ||
                   reservation.userId === currentUser._id;
          });
          console.log('✅ Filtro "Mis Reservas" aplicado:', {
            total: allReservations.length,
            filtradas: filtered.length,
            userId: currentUser.id
          });
        }

        // Filtrar por estado si está seleccionado
        if (selectedStatus) {
          filtered = filtered.filter((reservation: Reservation) => {
            return reservation.status === selectedStatus;
          });
        }

        onFilterChange(filtered);
      } catch (error) {
        console.error('Error cargando todas las reservaciones:', error);
        onFilterChange(reservations);
      } finally {
        onLoadingChange(false);
      }
    };

    loadAllReservations();
  }, [showMyReservationsOnly, selectedStatus, currentUser]);

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
      
      // Marcar que los filtros están aplicados
      setFiltersApplied(true);
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
    setSelectedStatus(''); // Sin filtro de estado por defecto
    setShowMyReservationsOnly(true); // Regresar al filtro de mis reservas por defecto
    setFiltersApplied(false);
    try {
      onLoadingChange(true);
      const allReservations = await reservationService.getAllReservations();

      // Aplicar filtro por defecto: "Mis Reservas" (todas las reservas del usuario)
      let filtered = allReservations;

      if (currentUser) {
        filtered = filtered.filter((reservation: Reservation) => {
          return reservation.createdBy?.userId === currentUser.id ||
                 reservation.createdBy?.userId === currentUser._id ||
                 reservation.userId === currentUser.id ||
                 reservation.userId === currentUser._id;
        });
      }

      onFilterChange(filtered);
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

    // Aplicar filtro "Mis Reservas" si está activo
    if (showMyReservationsOnly && currentUser) {
      filtered = filtered.filter(reservation => {
        return reservation.createdBy?.userId === currentUser.id ||
               reservation.createdBy?.userId === currentUser._id ||
               reservation.userId === currentUser.id ||
               reservation.userId === currentUser._id;
      });
    }

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
          {/* Filtro "Mis Reservas" - Prominente y activado por defecto */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={showMyReservationsOnly}
                onChange={(e) => setShowMyReservationsOnly(e.target.checked)}
                className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
              />
              <div className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-blue-600" />
                <span className="text-base font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                  Mis Reservas
                </span>
              </div>
              <span className="ml-auto text-sm text-gray-600 bg-white px-3 py-1 rounded-full border border-gray-200">
                {showMyReservationsOnly ? 'Activo' : 'Inactivo'}
              </span>
            </label>
            <p className="mt-2 text-sm text-gray-600 ml-8">
              Mostrar solo las reservas que has creado
            </p>
          </div>

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
          {(showMyReservationsOnly || startDate || endDate || selectedArea || selectedStatus) && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>Filtros activos:</strong>
                {showMyReservationsOnly && ` Mis Reservas`}
                {selectedStatus && ` | Estado: ${getStatusText(selectedStatus)}`}
                {startDate && ` | Desde: ${new Date(startDate).toLocaleDateString('es-ES')}`}
                {endDate && ` | Hasta: ${new Date(endDate).toLocaleDateString('es-ES')}`}
                {selectedArea && ` | Área: ${selectedArea}`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
