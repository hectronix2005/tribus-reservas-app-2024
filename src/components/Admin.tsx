import React, { useState } from 'react';
import { Settings, Calendar, Users, BarChart3, Building2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User } from '../types';
import { DepartmentManagement } from './DepartmentManagement';
import { AdminSettingsTab } from './admin/AdminSettingsTab';
import { AdminReservationsTab } from './admin/AdminReservationsTab';
import { AdminReportsTab } from './admin/AdminReportsTab';


export function Admin() {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('settings');

  const tabs = [
    { id: 'settings', label: 'Configuración', icon: Settings },
    { id: 'reservations', label: 'Gestión de Reservas', icon: Calendar },
    { id: 'departments', label: 'Departamentos', icon: Building2 },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'reports', label: 'Reportes', icon: BarChart3 },
  ];

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
        {activeTab === 'settings' && <AdminSettingsTab />}

        {activeTab === 'reservations' && <AdminReservationsTab />}

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

        {activeTab === 'reports' && <AdminReportsTab />}
      </div>
    </div>
  );
}
