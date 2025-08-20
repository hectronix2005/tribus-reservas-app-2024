import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Eye, EyeOff, Shield, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User as UserType } from '../types';
import { formatDateInBogota, getCurrentDateString } from '../utils/dateUtils';
import { userService, ApiError } from '../services/api';
import { ProtocolNotification } from './ProtocolNotification';

export function UserManagement() {
  const { state, dispatch } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });
  const [showValidation, setShowValidation] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    department: '',
    isActive: true
  });

  // Cargar usuarios del backend al montar el componente
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const users = await userService.getAllUsers();
      dispatch({ type: 'SET_USERS', payload: users });
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      setError('Error cargando usuarios del servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Activar validaciones solo cuando se intenta enviar
    setShowValidation(true);
    
    // Verificar si el formulario es válido antes de continuar
    const isValid = isFormValid();
    console.log('🔍 Validación del formulario:', {
      isValid,
      formData,
      editingUser: !!editingUser,
      validationErrors: getValidationErrors()
    });
    
    if (!isValid) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('🚀 Iniciando protocolo de creación/actualización de usuario...');
      
      if (editingUser) {
        // PROTOCOLO: Actualizar usuario existente
        console.log('📝 Protocolo: Actualizando usuario existente');
        
        const userData = {
          name: formData.name,
          email: formData.email,
          username: formData.username,
          role: formData.role,
          department: formData.department,
          isActive: formData.isActive
        };
        
        // Solo incluir password si se cambió
        if (formData.password) {
          (userData as any).password = formData.password;
        }
        
        // Paso 1: Actualizar en MongoDB Atlas
        const response = await userService.updateUser(editingUser.id, userData);
        
        // Paso 2: Actualizar estado local
        dispatch({ type: 'UPDATE_USER', payload: response.user });
        
        // Paso 3: Verificar sincronización
        await userService.verifyUserSync(response.user.id);
        
        console.log('✅ Protocolo completado: Usuario actualizado en MongoDB Atlas y estado local');
        
      } else {
        // PROTOCOLO: Crear nuevo usuario
        console.log('🆕 Protocolo: Creando nuevo usuario');
        
        const userData = {
          name: formData.name,
          email: formData.email,
          username: formData.username,
          password: formData.password,
          role: formData.role,
          department: formData.department,
          isActive: formData.isActive
        };
        
        // Paso 1: Crear en MongoDB Atlas
        const response = await userService.createUser(userData);
        
        // Paso 2: Actualizar estado local
        dispatch({ type: 'ADD_USER', payload: response.user });
        
        // Paso 3: Verificar sincronización
        await userService.verifyUserSync(response.user.id);
        
        console.log('✅ Protocolo completado: Usuario creado en MongoDB Atlas y estado local');
      }

      // Reset form
      setFormData({
        name: '',
        email: '',
        username: '',
        password: '',
        role: 'user',
        department: '',
        isActive: true
      });
      setShowForm(false);
      setEditingUser(null);
      setShowPassword(false);
      
      // Mostrar notificación de éxito
      setNotification({
        show: true,
        type: 'success',
        title: editingUser ? 'Usuario Actualizado' : 'Usuario Creado',
        message: editingUser 
          ? 'Usuario actualizado exitosamente en MongoDB Atlas' 
          : 'Usuario creado exitosamente en MongoDB Atlas'
      });
      
    } catch (error) {
      console.error('❌ Error en protocolo de usuario:', error);
      
      if (error instanceof ApiError) {
        if (error.status === 400) {
          setError('Error en los datos del usuario. Verifica que todos los campos sean válidos y que el email/nombre de usuario no exista.');
        } else if (error.status === 409) {
          setError('El nombre de usuario o email ya existe en el sistema');
        } else if (error.status === 401) {
          setError('No tienes permisos para realizar esta acción');
        } else if (error.status === 403) {
          setError('Acceso denegado. Verifica tus permisos de administrador');
        } else {
          setError(error.message || 'Error guardando usuario en el servidor');
        }
      } else {
        setError('Error de conexión con el servidor. Verifica tu conexión a internet.');
      }
      
      // Mostrar notificación de error
      setNotification({
        show: true,
        type: 'error',
        title: 'Error al Guardar Usuario',
        message: error instanceof ApiError ? error.message : 'Error de conexión con el servidor'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user: UserType) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      username: user.username,
      password: '', // No mostrar contraseña actual
      role: user.role,
      department: user.department || '',
      isActive: user.isActive
    });
    setShowForm(true);
    setShowValidation(false); // Resetear validaciones al editar
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.')) {
      try {
        console.log('🗑️ Protocolo: Eliminando usuario de MongoDB Atlas...');
        
        // Paso 1: Eliminar de MongoDB Atlas
        await userService.deleteUser(userId);
        
        // Paso 2: Actualizar estado local
        dispatch({ type: 'DELETE_USER', payload: userId });
        
        console.log('✅ Protocolo completado: Usuario eliminado de MongoDB Atlas y estado local');
        setNotification({
          show: true,
          type: 'success',
          title: 'Usuario Eliminado',
          message: 'Usuario eliminado exitosamente de MongoDB Atlas'
        });
        
      } catch (error) {
        console.error('❌ Error eliminando usuario:', error);
        setNotification({
          show: true,
          type: 'error',
          title: 'Error al Eliminar',
          message: 'Error eliminando usuario. Verifica la conexión con el servidor.'
        });
      }
    }
  };

  const handleToggleActive = async (user: UserType) => {
    try {
      console.log('🔄 Protocolo: Cambiando estado activo del usuario...');
      
      const updatedUser = { ...user, isActive: !user.isActive };
      
      // Paso 1: Actualizar en MongoDB Atlas
      await userService.updateUser(user.id, { isActive: updatedUser.isActive });
      
      // Paso 2: Actualizar estado local
      dispatch({ type: 'UPDATE_USER', payload: updatedUser });
      
      console.log('✅ Protocolo completado: Estado activo actualizado en MongoDB Atlas');
      
    } catch (error) {
      console.error('❌ Error cambiando estado activo:', error);
              setNotification({
          show: true,
          type: 'error',
          title: 'Error al Cambiar Estado',
          message: 'Error cambiando estado del usuario. Verifica la conexión con el servidor.'
        });
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      email: '',
      username: '',
      password: '',
      role: 'user',
      department: '',
      isActive: true
    });
    setShowForm(false);
    setEditingUser(null);
    setShowPassword(false);
    setShowValidation(false); // Resetear validaciones
  };

  const validatePassword = (password: string) => {
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    if (!/[A-Z]/.test(password)) return 'La contraseña debe contener al menos una mayúscula';
    if (!/[a-z]/.test(password)) return 'La contraseña debe contener al menos una minúscula';
    if (!/[0-9]/.test(password)) return 'La contraseña debe contener al menos un número';
    return null;
  };

  const isFormValid = () => {
    // Validar campos requeridos
    if (!formData.name.trim()) return false;
    if (!formData.email.trim()) return false;
    if (!formData.username.trim()) return false;
    if (!editingUser && !formData.password.trim()) return false; // Contraseña requerida solo para nuevos usuarios
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return false;
    
    // Validar contraseña si se está creando un nuevo usuario y se ingresó una contraseña
    if (!editingUser && formData.password.trim() && validatePassword(formData.password)) {
      return false;
    }
    
    // Verificar que el username y email no existan ya (solo para nuevos usuarios)
    if (!editingUser) {
      const existingUser = state.users.find(user => 
        user.username.toLowerCase() === formData.username.toLowerCase() ||
        user.email.toLowerCase() === formData.email.toLowerCase()
      );
      if (existingUser) return false;
    }
    
    return true;
  };

  const getValidationErrors = () => {
    const errors: string[] = [];
    
    if (!formData.name.trim()) errors.push('El nombre es requerido');
    if (!formData.email.trim()) errors.push('El email es requerido');
    if (!formData.username.trim()) errors.push('El nombre de usuario es requerido');
    if (!editingUser && !formData.password.trim()) errors.push('La contraseña es requerida para nuevos usuarios');
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email.trim() && !emailRegex.test(formData.email)) {
      errors.push('El email no tiene un formato válido');
    }
    
    // Validar contraseña
    if (!editingUser && formData.password && validatePassword(formData.password)) {
      errors.push(validatePassword(formData.password)!);
    }
    
    // Verificar duplicados
    if (!editingUser) {
      const existingUser = state.users.find(user => 
        user.username.toLowerCase() === formData.username.toLowerCase() ||
        user.email.toLowerCase() === formData.email.toLowerCase()
      );
      if (existingUser) {
        errors.push('El nombre de usuario o email ya existe en el sistema');
      }
    }
    
    return errors;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600">Administra usuarios y permisos del sistema</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {state.users.map((user) => (
          <div key={user.id} className="card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  user.role === 'admin' ? 'bg-warning-100' : 'bg-primary-100'
                }`}>
                  {user.role === 'admin' ? (
                    <Shield className="w-4 h-4 text-warning-600" />
                  ) : (
                    <User className="w-4 h-4 text-primary-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{user.name}</h3>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleToggleActive(user)}
                  className={`p-1 rounded transition-colors ${
                    user.isActive 
                      ? 'text-success-600 hover:text-success-700' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Users className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEdit(user)}
                  className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(user.id)}
                  className="p-1 text-gray-400 hover:text-danger-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium text-primary-600">{user.email}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Rol:</span>
                <span className={`badge ${
                  user.role === 'admin' ? 'badge-warning' : 'badge-info'
                }`}>
                  {user.role === 'admin' ? 'Administrador' : 'Usuario'}
                </span>
              </div>

              {user.department && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Departamento:</span>
                  <span className="font-medium">{user.department}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Estado:</span>
                <span className={`badge ${user.isActive ? 'badge-success' : 'badge-secondary'}`}>
                  {user.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {user.lastLogin && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Último acceso:</span>
                  <span className="font-medium text-xs">
                    {formatDateInBogota(user.lastLogin, 'dd/MM/yyyy')}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h3>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Mostrar errores de validación solo cuando se intenta enviar */}
                {showValidation && getValidationErrors().length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <h4 className="text-sm font-medium text-red-800 mb-2">Errores de validación:</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {getValidationErrors().map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`input-field ${showValidation && !formData.name.trim() ? 'border-red-300 focus:border-red-500' : ''}`}
                    placeholder="Nombre completo"
                    required
                  />
                  {showValidation && !formData.name.trim() && (
                    <p className="text-xs text-red-600 mt-1">El nombre es requerido</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className={`input-field ${!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? 'border-red-300 focus:border-red-500' : ''}`}
                    placeholder="email@empresa.com"
                    required
                  />
                  {!formData.email.trim() && (
                    <p className="text-xs text-red-600 mt-1">El email es requerido</p>
                  )}
                  {formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                    <p className="text-xs text-red-600 mt-1">El email no es válido</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de Usuario <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className={`input-field ${!formData.username.trim() ? 'border-red-300 focus:border-red-500' : ''}`}
                    placeholder="usuario"
                    required
                  />
                  {!formData.username.trim() && (
                    <p className="text-xs text-red-600 mt-1">El nombre de usuario es requerido</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editingUser ? (
                      'Nueva Contraseña (dejar en blanco para mantener)'
                    ) : (
                      <>
                        Contraseña <span className="text-red-500">*</span>
                      </>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className={`input-field pr-10 ${!editingUser && !formData.password.trim() ? 'border-red-300 focus:border-red-500' : ''}`}
                      placeholder={editingUser ? 'Nueva contraseña' : 'Contraseña'}
                      required={!editingUser}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {!editingUser && !formData.password.trim() && (
                    <p className="text-xs text-red-600 mt-1">La contraseña es requerida para nuevos usuarios</p>
                  )}
                  {formData.password && validatePassword(formData.password) && (
                    <p className="text-xs text-danger-600 mt-1">
                      {validatePassword(formData.password)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rol
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
                    className="input-field"
                    required
                  >
                    <option value="user">Usuario</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departamento (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    className="input-field"
                    placeholder="Departamento"
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                    Usuario activo
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isLoading}
                    className={`btn-secondary flex-1 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !isFormValid()}
                    className={`btn-success flex-1 ${
                      isLoading || !isFormValid() ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoading ? (
                      <span className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Procesando...</span>
                      </span>
                    ) : (
                      <span>{editingUser ? 'Actualizar' : 'Crear'} Usuario</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {state.users.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay usuarios configurados</h3>
          <p className="text-gray-500 mb-6">
            Crea usuarios para permitir el acceso al sistema.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            Crear Primer Usuario
          </button>
        </div>
      )}

      {/* Protocol Notification */}
      <ProtocolNotification
        show={notification.show}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() => setNotification(prev => ({ ...prev, show: false }))}
      />
    </div>
  );
}
