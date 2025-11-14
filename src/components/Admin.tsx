import React, { useState, useEffect } from 'react';
import { Settings, Calendar, Users, Clock, BarChart3, FileText, Download, Save, CheckCircle, Building2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User } from '../types';
import { formatDateInBogota } from '../utils/dateUtils';
import { syncAdminSettings, getAdminSettings } from '../services/adminService';
import { reservationService } from '../services/api';
import { DepartmentManagement } from './DepartmentManagement';


export function Admin() {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('settings');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [reportStartDate, setReportStartDate] = useState(() => {
    // Usar mes actual con primer día del mes
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState(() => {
    // Usar fecha actual
    const date = new Date();
    return date.toISOString().split('T')[0];
  });

  // Cargar configuración al inicializar el componente
  useEffect(() => {
    const loadSettings = async () => {
      if (activeTab === 'settings') {
        setIsLoadingSettings(true);
        try {
          const savedSettings = await getAdminSettings();
          dispatch({ type: 'SET_ADMIN_SETTINGS', payload: savedSettings });
          console.log('✅ Configuración cargada:', savedSettings);
        } catch (error) {
          console.error('❌ Error cargando configuración:', error);
        } finally {
          setIsLoadingSettings(false);
        }
      }
    };

    loadSettings();
  }, [activeTab, dispatch]);

  // Cargar reservaciones cuando se active la pestaña de reservaciones
  useEffect(() => {
    if (activeTab === 'reservations') {
      console.log('🔄 Cargando reservaciones para Admin...');
      console.log('📊 Estado actual de reservaciones:', state.reservations);
      
      // Si no hay reservaciones cargadas, cargarlas
      if (state.reservations.length === 0) {
        loadReservations();
      }
    }
  }, [activeTab, state.reservations, dispatch]);

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

  const tabs = [
    { id: 'settings', label: 'Configuración', icon: Settings },
    { id: 'reservations', label: 'Gestión de Reservas', icon: Calendar },
    { id: 'departments', label: 'Departamentos', icon: Building2 },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'reports', label: 'Reportes', icon: BarChart3 },
  ];

  const handleSettingsUpdate = (settings: typeof state.adminSettings) => {
    // Solo mostrar logs en desarrollo para evitar spam
    if (process.env.NODE_ENV === 'development') {
      console.log('⚙️ Configuración de admin actualizada:', {
        previousSettings: {
          officeDays: state.adminSettings.officeDays,
          officeHours: state.adminSettings.officeHours,
          businessHours: state.adminSettings.businessHours
        },
        newSettings: {
          officeDays: settings.officeDays,
          officeHours: settings.officeHours,
          businessHours: settings.businessHours
        },
        changes: {
          officeDaysChanged: JSON.stringify(state.adminSettings.officeDays) !== JSON.stringify(settings.officeDays),
          officeHoursChanged: JSON.stringify(state.adminSettings.officeHours) !== JSON.stringify(settings.officeHours),
          businessHoursChanged: JSON.stringify(state.adminSettings.businessHours) !== JSON.stringify(settings.businessHours)
        }
      });
    }
    
    dispatch({ type: 'SET_ADMIN_SETTINGS', payload: settings });
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(false);
      
      // Guardar configuración usando el servicio
      await syncAdminSettings(state.adminSettings);
      
      setSaveSuccess(true);
      
      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      
      console.log('✅ Configuración guardada exitosamente:', state.adminSettings);
    } catch (error) {
      console.error('❌ Error guardando configuración:', error);
      setSaveError('Error al guardar la configuración. Por favor, inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
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

  const exportReservations = () => {
    // Usar las fechas del reporte superior
    const filteredReservations = state.reservations.filter(r => {
      const reservationDateStr = r.date.split('T')[0];
      return reservationDateStr >= reportStartDate && reservationDateStr <= reportEndDate;
    });

    // Encabezados detallados
    const csvContent = [
      [
        'ID Reserva',
        'Estado',
        'Área',
        'Nombre de Equipo',
        'Puestos Solicitados',
        'Fecha',
        'Hora Inicio',
        'Hora Fin',
        'Duración (min)',
        'Usuario',
        'ID de Empleado',
        'Email Usuario',
        'Departamento',
        'Creado Por',
        'Fecha Creación',
        'Fecha Actualización',
        'Notas'
      ],
      ...filteredReservations.map(r => {
        // Verificar si es Hot Desk
        const area = state.areas.find(a => a.name === r.area);
        const isHotDesk = area?.category === 'HOT_DESK';

        // Calcular duración solo si NO es Hot Desk
        let durationMinutes = 0;
        if (!isHotDesk && r.startTime && r.endTime) {
          const start = new Date(`2000-01-01T${r.startTime}`);
          const end = new Date(`2000-01-01T${r.endTime}`);
          durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
        }

        // Obtener información del usuario
        const userId = typeof r.userId === 'string' ? r.userId : r.userId._id;
        const user = state.users.find(u => u._id === userId || u.id === userId);
        const userName = user?.name || r.userName || 'N/A';
        const employeeId = user?.employeeId || 'N/A';
        const userEmail = user?.email || 'N/A';
        const department = user?.department || 'N/A';

        // Información de creación
        const createdBy = r.createdBy?.userName || userName;
        const createdAt = r.createdAt ? new Date(r.createdAt).toLocaleString('es-ES') : 'N/A';
        const updatedAt = r.updatedAt ? new Date(r.updatedAt).toLocaleString('es-ES') : 'N/A';

        return [
          r._id || r.reservationId || '',
          r.status,
          r.area,
          r.teamName,
          r.requestedSeats.toString(),
          r.date.split('T')[0],
          isHotDesk ? '' : r.startTime,  // Vacío si es Hot Desk
          isHotDesk ? '' : r.endTime,    // Vacío si es Hot Desk
          isHotDesk ? '' : durationMinutes.toString(),  // Vacío si es Hot Desk
          userName,
          employeeId,
          userEmail,
          department,
          createdBy,
          createdAt,
          updatedAt,
          r.notes || ''
        ];
      })
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservas_${reportStartDate}_${reportEndDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getReservationsByDateRange = (startDate: string, endDate: string) => {
    console.log('🔍 Filtrando reservaciones:', {
      totalReservations: state.reservations.length,
      startDate,
      endDate,
      reservations: state.reservations
    });
    
    const filtered = state.reservations.filter(r => {
      const reservationDate = new Date(r.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      const isInRange = reservationDate >= start && reservationDate <= end;
      
      console.log('📅 Reservación:', {
        id: r._id,
        date: r.date,
        reservationDate: reservationDate.toISOString(),
        start: start.toISOString(),
        end: end.toISOString(),
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
    // Simular un pequeño delay para mostrar el efecto de filtrado
    setTimeout(() => setIsFiltering(false), 300);
  };

  const handleEndDateChange = (date: string) => {
    setIsFiltering(true);
    setEndDate(date);
    // Simular un pequeño delay para mostrar el efecto de filtrado
    setTimeout(() => setIsFiltering(false), 300);
  };

  const getStatusBadge = (status: string) => {
    // Debug: Log del status recibido
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
    
    // Si no se encuentra la configuración, usar valores por defecto
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


  const handleToggleUserStatus = (user: User) => {
    const updatedUser = { ...user, isActive: !user.isActive };
    dispatch({ type: 'UPDATE_USER', payload: updatedUser });
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      dispatch({ type: 'DELETE_USER', payload: userId });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administración</h1>
        <p className="text-gray-600">Gestiona la configuración del sistema y las reservas</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {isLoadingSettings && (
              <div className="card">
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-600">Cargando configuración...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración del Sistema</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Días máximos para reservas anticipadas
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={state.adminSettings.maxReservationDays}
                    onChange={(e) => handleSettingsUpdate({
                      ...state.adminSettings,
                      maxReservationDays: parseInt(e.target.value)
                    })}
                    className="input-field max-w-xs"
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="allowSameDay"
                    checked={state.adminSettings.allowSameDayReservations}
                    onChange={(e) => handleSettingsUpdate({
                      ...state.adminSettings,
                      allowSameDayReservations: e.target.checked
                    })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="allowSameDay" className="text-sm font-medium text-gray-700">
                    Permitir reservas del mismo día
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="requireApproval"
                    checked={state.adminSettings.requireApproval}
                    onChange={(e) => handleSettingsUpdate({
                      ...state.adminSettings,
                      requireApproval: e.target.checked
                    })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="requireApproval" className="text-sm font-medium text-gray-700">
                    Requerir aprobación para nuevas reservas
                  </label>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Horarios de Oficina</h4>
                  
                  {/* Días de apertura */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Días de apertura
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { key: 'monday', label: 'Lunes' },
                        { key: 'tuesday', label: 'Martes' },
                        { key: 'wednesday', label: 'Miércoles' },
                        { key: 'thursday', label: 'Jueves' },
                        { key: 'friday', label: 'Viernes' },
                        { key: 'saturday', label: 'Sábado' },
                        { key: 'sunday', label: 'Domingo' }
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={key}
                            checked={state.adminSettings.officeDays[key as keyof typeof state.adminSettings.officeDays]}
                            onChange={(e) => handleSettingsUpdate({
                              ...state.adminSettings,
                              officeDays: {
                                ...state.adminSettings.officeDays,
                                [key]: e.target.checked
                              }
                            })}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <label htmlFor={key} className="text-sm text-gray-700">
                            {label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Horarios de oficina */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hora de apertura
                      </label>
                      <input
                        type="time"
                        value={state.adminSettings.officeHours.start || ''}
                        onChange={(e) => handleSettingsUpdate({
                          ...state.adminSettings,
                          officeHours: {
                            ...state.adminSettings.officeHours,
                            start: e.target.value
                          }
                        })}
                        className="input-field"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Horario actual: {state.adminSettings.officeHours.start}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hora de cierre
                      </label>
                      <input
                        type="time"
                        value={state.adminSettings.officeHours.end || ''}
                        onChange={(e) => handleSettingsUpdate({
                          ...state.adminSettings,
                          officeHours: {
                            ...state.adminSettings.officeHours,
                            end: e.target.value
                          }
                        })}
                        className="input-field"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Horario actual: {state.adminSettings.officeHours.end}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Configuración de Reservas</h4>
                <div className="grid grid-cols-2 gap-4">
                                     <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hora de inicio (reservas)
                     </label>
                     <input
                       type="time"
                       value={state.adminSettings.businessHours.start || ''}
                       onChange={(e) => handleSettingsUpdate({
                         ...state.adminSettings,
                         businessHours: {
                           ...state.adminSettings.businessHours,
                           start: e.target.value
                         }
                       })}
                       className="input-field"
                     />
                      <p className="text-xs text-gray-500 mt-1">
                        Horario actual: {state.adminSettings.businessHours.start}
                      </p>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hora de fin (reservas)
                     </label>
                     <input
                       type="time"
                       value={state.adminSettings.businessHours.end || ''}
                       onChange={(e) => handleSettingsUpdate({
                         ...state.adminSettings,
                         businessHours: {
                           ...state.adminSettings.businessHours,
                           end: e.target.value
                         }
                       })}
                       className="input-field"
                     />
                      <p className="text-xs text-gray-500 mt-1">
                        Horario actual: {state.adminSettings.businessHours.end}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Botón de Guardar y Mensajes de Estado */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {saveSuccess && (
                        <div className="flex items-center space-x-2 text-success-600">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">Configuración guardada exitosamente</span>
                        </div>
                      )}
                      {saveError && (
                        <div className="text-danger-600 text-sm">
                          {saveError}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleSaveSettings}
                      disabled={isSaving}
                      className={`flex items-center space-x-2 px-6 py-2 rounded-md font-medium transition-colors duration-200 ${
                        isSaving
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
                      }`}
                    >
                      {isSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Guardar Configuración</span>
                        </>
                      )}
                    </button>
                   </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas del Sistema</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Users className="w-8 h-8 text-primary-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{state.areas.length}</p>
                  <p className="text-sm text-gray-600">Áreas configuradas</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Calendar className="w-8 h-8 text-success-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{state.reservations.length}</p>
                  <p className="text-sm text-gray-600">Total de reservas</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Clock className="w-8 h-8 text-warning-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">
                    {state.reservations.filter(r => r.status === 'confirmed').length}
                  </p>
                  <p className="text-sm text-gray-600">Reservas confirmadas</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reservations Tab */}
        {activeTab === 'reservations' && (
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
                <span>Exportar CSV</span>
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
        )}

        {/* Departments Tab */}
        {activeTab === 'departments' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Gestión de Departamentos</h3>
              <p className="text-sm text-gray-600">
                Administra los departamentos de la organización
              </p>
            </div>
            <DepartmentManagement />
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Gestión de Usuarios</h3>
              <p className="text-sm text-gray-600">
                Administra usuarios y permisos del sistema
              </p>
            </div>

            <div className="card">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {state.users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">@{user.username}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(user.role === 'admin' ? 'admin' : user.role === 'lider' ? 'lider' : 'colaborador')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(user.isActive ? 'active' : 'inactive')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleToggleUserStatus(user)}
                              className={`${
                                user.isActive 
                                  ? 'text-warning-600 hover:text-warning-900' 
                                  : 'text-success-600 hover:text-success-900'
                              }`}
                            >
                              {user.isActive ? 'Desactivar' : 'Activar'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-danger-600 hover:text-danger-900"
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

              {state.users.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No hay usuarios configurados</p>
                </div>
              )}
            </div>
          </div>
        )}


        {/* Reports Tab */}
        {activeTab === 'reports' && (
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
                    // Filtrar reservas del rango de fechas seleccionado
                    const areaReservations = state.reservations.filter(r => {
                      if (r.area !== area.name || r.status !== 'completed') return false;

                      // Normalizar fechas para comparación (solo comparar YYYY-MM-DD)
                      const reservationDateStr = r.date.split('T')[0]; // Asegurar formato YYYY-MM-DD
                      const startDateStr = reportStartDate;
                      const endDateStr = reportEndDate;

                      const isInRange = reservationDateStr >= startDateStr && reservationDateStr <= endDateStr;

                      // Debug log (remover después)
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

                    // Calcular días laborables en el rango
                    const start = new Date(reportStartDate);
                    const end = new Date(reportEndDate);
                    let workDays = 0;
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                      const dayOfWeek = d.getDay();
                      // Contar solo días de lunes (1) a viernes (5)
                      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                        workDays++;
                      }
                    }

                    // Calcular utilización basada en el tipo de área
                    const totalBusinessHours = 11; // 11 horas por día (7 AM - 6 PM)
                    const totalAvailableHours = totalBusinessHours * workDays;

                    let utilization = 0;
                    let totalReserved = 0;
                    let totalAvailable = 0;

                    if (area.isMeetingRoom) {
                      // Para salas de juntas: horas reservadas / horas disponibles
                      totalAvailable = totalAvailableHours;

                      if (areaReservations.length > 0 && workDays > 0) {
                        totalReserved = areaReservations.reduce((total, reservation) => {
                          const start = new Date(`2000-01-01T${reservation.startTime}`);
                          const end = new Date(`2000-01-01T${reservation.endTime}`);
                          const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                          return total + durationHours;
                        }, 0);

                        utilization = Math.min((totalReserved / totalAvailable) * 100, 100);
                      }
                    } else {
                      // Para áreas de trabajo (Hot Desk): asientos reservados / asientos totales
                      // No considerar tiempo, solo cantidad de asientos en uso
                      totalAvailable = area.capacity * workDays;

                      if (areaReservations.length > 0 && workDays > 0) {
                        // Contar asientos únicos reservados por día
                        const seatsByDay: { [key: string]: Set<number> } = {};

                        areaReservations.forEach(reservation => {
                          const dateKey = reservation.date.split('T')[0];
                          if (!seatsByDay[dateKey]) {
                            seatsByDay[dateKey] = new Set();
                          }
                          // Agregar todos los asientos solicitados
                          for (let i = 0; i < reservation.requestedSeats; i++) {
                            seatsByDay[dateKey].add(i);
                          }
                        });

                        // Sumar total de asientos únicos por día
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
                      // Filtrar reservas completadas en el rango de fechas
                      const completedReservations = state.reservations.filter(r => {
                        if (r.status !== 'completed') return false;
                        const reservationDateStr = r.date.split('T')[0];
                        return reservationDateStr >= reportStartDate && reservationDateStr <= reportEndDate;
                      });

                      // Agrupar por departamento (usando el usuario que creó la reserva)
                      const byDepartment: { [key: string]: number } = {};
                      completedReservations.forEach(r => {
                        // Buscar el departamento del usuario que creó la reserva
                        const userId = typeof r.userId === 'string' ? r.userId : r.userId._id;
                        const user = state.users.find(u => u._id === userId || u.id === userId);
                        const dept = user?.department || 'Sin departamento';
                        byDepartment[dept] = (byDepartment[dept] || 0) + 1;
                      });

                      // Ordenar por cantidad de reservas (descendente)
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
                    <div className="font-medium text-gray-900">Exportar Reservas</div>
                    <div className="text-sm text-gray-500">Descargar reservas del rango seleccionado en CSV detallado</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
