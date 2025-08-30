import React, { useState, useEffect } from 'react';
import { Settings, Calendar, Users, Clock, BarChart3, FileText, Download, Save, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ReservationTemplate, User } from '../types';
import { formatDateInBogota } from '../utils/dateUtils';
import { syncAdminSettings, getAdminSettings } from '../services/adminService';


export function Admin() {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('settings');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

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

  const tabs = [
    { id: 'settings', label: 'Configuración', icon: Settings },
    { id: 'reservations', label: 'Gestión de Reservas', icon: Calendar },
    { id: 'templates', label: 'Plantillas', icon: FileText },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'reports', label: 'Reportes', icon: BarChart3 },
  ];

  const handleSettingsUpdate = (settings: typeof state.adminSettings) => {
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
    const reservation = state.reservations.find(r => r.id === reservationId);
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
    const csvContent = [
      ['ID', 'Área', 'Grupo', 'Puestos', 'Fecha', 'Hora', 'Contacto', 'Email', 'Teléfono', 'Estado', 'Notas'],
      ...state.reservations.map(r => [
        r.id,
        r.areaName,
        r.groupName,
        r.requestedSeats.toString(),
        r.date,
        r.time,
        r.contactPerson,
        r.contactEmail,
        r.contactPhone,
        r.status,
        r.notes || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
            a.download = `reservas_${formatDateInBogota(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getReservationsByDate = (date: string) => {
    return state.reservations.filter(r => r.date === date);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { label: 'Confirmada', class: 'badge-success' },
      pending: { label: 'Pendiente', class: 'badge-warning' },
      cancelled: { label: 'Cancelada', class: 'badge-danger' },
      active: { label: 'Activa', class: 'badge-success' },
      inactive: { label: 'Inactiva', class: 'badge-secondary' },
      admin: { label: 'Administrador', class: 'badge-warning' },
      user: { label: 'Usuario', class: 'badge-info' }
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <span className={`badge ${config.class}`}>{config.label}</span>;
  };

  const handleToggleTemplateStatus = (template: ReservationTemplate) => {
    const updatedTemplate = { ...template, isActive: !template.isActive };
    dispatch({ type: 'UPDATE_TEMPLATE', payload: updatedTemplate });
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta plantilla?')) {
      dispatch({ type: 'DELETE_TEMPLATE', payload: templateId });
    }
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
                        value={state.adminSettings.officeHours.start}
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
                        value={state.adminSettings.officeHours.end}
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
                        value={state.adminSettings.businessHours.start}
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
                        value={state.adminSettings.businessHours.end}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filtrar por fecha
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input-field max-w-xs"
                />
              </div>

              <div className="overflow-x-auto">
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
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getReservationsByDate(selectedDate).map((reservation) => (
                      <tr key={reservation.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {reservation.groupName}
                            </div>
                            {reservation.notes && (
                              <div className="text-sm text-gray-500">{reservation.notes}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{reservation.areaName}</div>
                        </td>
                                                 <td className="px-6 py-4 whitespace-nowrap">
                           <div className="text-sm text-gray-900">
                             {state.areas.find(a => a.id === reservation.areaId)?.isMeetingRoom 
                               ? `${reservation.requestedSeats} personas (sala completa)`
                               : `${reservation.requestedSeats} puestos`
                             }
                           </div>
                         </td>
                                                 <td className="px-6 py-4 whitespace-nowrap">
                           <div className="text-sm text-gray-900">
                             {formatDateInBogota(reservation.date, 'dd/MM/yyyy')}
                           </div>
                           <div className="text-sm text-gray-500">
                             {reservation.time} - {(() => {
                               const [hours, minutes] = reservation.time.split(':').map(Number);
                               const totalMinutes = hours * 60 + minutes + reservation.duration;
                               const endHours = Math.floor(totalMinutes / 60);
                               const endMinutes = totalMinutes % 60;
                               return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
                             })()}
                           </div>
                         </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm text-gray-900">{reservation.contactPerson}</div>
                            <div className="text-sm text-gray-500">{reservation.contactEmail}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(reservation.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {reservation.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleReservationStatusChange(reservation.id, 'confirmed')}
                                  className="text-success-600 hover:text-success-900"
                                >
                                  Confirmar
                                </button>
                                <button
                                  onClick={() => handleReservationStatusChange(reservation.id, 'cancelled')}
                                  className="text-danger-600 hover:text-danger-900"
                                >
                                  Cancelar
                                </button>
                              </>
                            )}
                            {reservation.status === 'confirmed' && (
                              <button
                                onClick={() => handleReservationStatusChange(reservation.id, 'cancelled')}
                                className="text-danger-600 hover:text-danger-900"
                              >
                                Cancelar
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteReservation(reservation.id)}
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

              {getReservationsByDate(selectedDate).length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No hay reservas para esta fecha</p>
                </div>
              )}
            </div>
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
                          {getStatusBadge(user.role === 'admin' ? 'admin' : 'user')}
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

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Gestión de Plantillas</h3>
              <p className="text-sm text-gray-600">
                Administra las plantillas para facilitar las reservas
              </p>
            </div>

            <div className="card">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plantilla
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Grupo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contacto
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
                    {state.templates.map((template) => (
                      <tr key={template.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{template.name}</div>
                            <div className="text-sm text-gray-500">{template.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{template.groupName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm text-gray-900">{template.contactPerson}</div>
                            <div className="text-sm text-gray-500">{template.contactEmail}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(template.isActive ? 'active' : 'inactive')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleToggleTemplateStatus(template)}
                              className={`${
                                template.isActive 
                                  ? 'text-warning-600 hover:text-warning-900' 
                                  : 'text-success-600 hover:text-success-900'
                              }`}
                            >
                              {template.isActive ? 'Desactivar' : 'Activar'}
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
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

              {state.templates.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No hay plantillas configuradas</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reportes y Análisis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Utilización por Área</h4>
                  {state.areas.map((area) => {
                    const areaReservations = state.reservations.filter(
                      r => r.areaId === area.id && r.status === 'confirmed'
                    );
                    
                    // Para salas de juntas, calculamos utilización basada en tiempo reservado del día
                    // Para áreas de trabajo, calculamos por asientos reservados
                    const utilization = area.isMeetingRoom 
                      ? (() => {
                          if (areaReservations.length === 0) return 0;
                          
                          // Horario de oficina: 7 AM (420 min) a 6 PM (1080 min) = 660 minutos totales
                          const totalBusinessMinutes = 660;
                          const totalReservedMinutes = areaReservations.reduce((total, reservation) => {
                            return total + reservation.duration;
                          }, 0);
                          
                          return Math.min((totalReservedMinutes / totalBusinessMinutes) * 100, 100);
                        })()
                      : (() => {
                          const totalReserved = areaReservations.reduce(
                            (sum, r) => sum + r.requestedSeats, 0
                          );
                          return (totalReserved / area.capacity) * 100;
                        })();

                    return (
                      <div key={area.id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{area.name}</span>
                          <span className="font-medium">{utilization.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              utilization >= 90 ? 'bg-danger-500' :
                              utilization >= 70 ? 'bg-warning-500' : 'bg-success-500'
                            }`}
                            style={{ width: `${utilization}%` }}
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
                      <span className="text-sm text-gray-600">Confirmadas</span>
                      <span className="font-medium text-success-600">
                        {state.reservations.filter(r => r.status === 'confirmed').length}
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
                    <div className="text-sm text-gray-500">Descargar todas las reservas en CSV</div>
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
