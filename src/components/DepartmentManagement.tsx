import React, { useState, useEffect } from 'react';
import { departmentService } from '../services/api';
import { Department } from '../types';
import { useApp } from '../context/AppContext';

interface DepartmentFormData {
  name: string;
  description: string;
}

export function DepartmentManagement() {
  const { state } = useApp();
  const { currentUser } = state.auth;
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState<DepartmentFormData>({
    name: '',
    description: ''
  });

  // Verificar permisos
  const canManageDepartments = currentUser?.role === 'admin' || currentUser?.role === 'user';

  useEffect(() => {
    if (canManageDepartments) {
      loadDepartments();
    }
  }, [canManageDepartments]);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      const data = await departmentService.getAllDepartments(currentUser.id, currentUser.role);
      setDepartments(data);
    } catch (err) {
      console.error('Error cargando departamentos:', err);
      setError(err instanceof Error ? err.message : 'Error cargando departamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('Usuario no autenticado');
      return;
    }

    try {
      setError(null);

      if (editingDepartment) {
        // Actualizar departamento existente
        await departmentService.updateDepartment(editingDepartment._id, {
          name: formData.name,
          description: formData.description,
          userId: currentUser.id,
          userRole: currentUser.role
        });
      } else {
        // Crear nuevo departamento
        await departmentService.createDepartment({
          name: formData.name,
          description: formData.description,
          userId: currentUser.id,
          userRole: currentUser.role
        });
      }

      // Recargar lista y limpiar formulario
      await loadDepartments();
      handleCancel();
      
      // Notificar a otros componentes que los departamentos han cambiado
      window.dispatchEvent(new CustomEvent('departmentsUpdated'));
    } catch (err) {
      console.error('Error guardando departamento:', err);
      setError(err instanceof Error ? err.message : 'Error guardando departamento');
    }
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      description: department.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (department: Department) => {
    if (!currentUser) {
      setError('Usuario no autenticado');
      return;
    }

    if (!window.confirm(`¿Está seguro de que desea eliminar el departamento "${department.name}"?`)) {
      return;
    }

    try {
      setError(null);
      await departmentService.deleteDepartment(department._id, currentUser.id, currentUser.role);
      await loadDepartments();
      
      // Notificar a otros componentes que los departamentos han cambiado
      window.dispatchEvent(new CustomEvent('departmentsUpdated'));
    } catch (err) {
      console.error('Error eliminando departamento:', err);
      setError(err instanceof Error ? err.message : 'Error eliminando departamento');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingDepartment(null);
    setFormData({
      name: '',
      description: ''
    });
    setError(null);
  };

  const handleToggleStatus = async (department: Department) => {
    if (!currentUser) {
      setError('Usuario no autenticado');
      return;
    }

    try {
      setError(null);
      await departmentService.updateDepartment(department._id, {
        isActive: !department.isActive,
        userId: currentUser.id,
        userRole: currentUser.role
      });
      await loadDepartments();
      
      // Notificar a otros componentes que los departamentos han cambiado
      window.dispatchEvent(new CustomEvent('departmentsUpdated'));
    } catch (err) {
      console.error('Error actualizando estado del departamento:', err);
      setError(err instanceof Error ? err.message : 'Error actualizando departamento');
    }
  };

  if (!canManageDepartments) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Acceso Denegado</h3>
              <p className="mt-1 text-sm text-gray-500">
                No tiene permisos para gestionar departamentos. Solo los usuarios con rol 'admin' o 'user' pueden acceder a esta funcionalidad.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Departamentos</h1>
              <p className="mt-2 text-gray-600">
                Administre los departamentos de la organización
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Departamento
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="mb-8 bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingDepartment ? 'Editar Departamento' : 'Nuevo Departamento'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Departamento *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ej: Recursos Humanos, Tecnología, Ventas..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Descripción del departamento (opcional)"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {editingDepartment ? 'Actualizar' : 'Crear'} Departamento
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Departments List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Departamentos</h2>
          </div>
          
          {loading ? (
            <div className="p-6 text-center">
              <div className="inline-flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Cargando departamentos...
              </div>
            </div>
          ) : departments.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No hay departamentos registrados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Creado por
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {departments.map((department) => (
                    <tr key={department._id} className={!department.isActive ? 'bg-gray-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {department.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {department.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          department.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {department.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {department.createdBy.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(department.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(department)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleToggleStatus(department)}
                            className={`${
                              department.isActive 
                                ? 'text-yellow-600 hover:text-yellow-900' 
                                : 'text-green-600 hover:text-green-900'
                            }`}
                          >
                            {department.isActive ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            onClick={() => handleDelete(department)}
                            className="text-red-600 hover:text-red-900"
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
          )}
        </div>
      </div>
    </div>
  );
}
