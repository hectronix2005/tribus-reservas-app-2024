import React, { useState } from 'react';
import { User, Lock, Save, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { userService } from '../services/api';

export function UserProfile() {
  const { state, dispatch } = useApp();
  const currentUser = state.auth.currentUser;
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setSaveError('Usuario no autenticado');
      return;
    }

    // Validaciones
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setSaveError('Las contraseñas nuevas no coinciden');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setSaveError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      // Llamar al servicio para cambiar la contraseña
      await userService.changePassword(currentUser.id, passwordData.currentPassword, passwordData.newPassword);
      
      setSaveSuccess(true);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setIsChangingPassword(false);
      
      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      
      console.log('✅ Contraseña cambiada exitosamente');
    } catch (error) {
      console.error('❌ Error cambiando contraseña:', error);
      setSaveError('Error al cambiar la contraseña. Verifique que la contraseña actual sea correcta.');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (!currentUser) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">Usuario no autenticado</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="text-gray-600">Gestiona tu información personal y configuración</p>
      </div>

      {/* Información del Usuario */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Personal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={currentUser.name}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usuario
            </label>
            <input
              type="text"
              value={currentUser.username}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={currentUser.email}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol
            </label>
            <input
              type="text"
              value={currentUser.role === 'admin' ? 'Administrador' : 'Usuario'}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Cambio de Contraseña */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Cambiar Contraseña</h3>
          <button
            onClick={() => setIsChangingPassword(!isChangingPassword)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            <Lock className="w-4 h-4" />
            <span>{isChangingPassword ? 'Cancelar' : 'Cambiar Contraseña'}</span>
          </button>
        </div>

        {isChangingPassword && (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* Contraseña Actual */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña Actual
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ingrese su contraseña actual"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPasswords.current ? (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Nueva Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ingrese la nueva contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPasswords.new ? (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Mínimo 6 caracteres
              </p>
            </div>

            {/* Confirmar Nueva Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Confirme la nueva contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Mensajes de Estado */}
            {saveSuccess && (
              <div className="flex items-center space-x-2 text-success-600">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Contraseña cambiada exitosamente</span>
              </div>
            )}
            {saveError && (
              <div className="flex items-center space-x-2 text-danger-600">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{saveError}</span>
              </div>
            )}

            {/* Botón de Guardar */}
            <div className="flex justify-end">
              <button
                type="submit"
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
                    <span>Cambiar Contraseña</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Información Adicional */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de la Cuenta</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado de la Cuenta
            </label>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${currentUser.isActive ? 'bg-success-500' : 'bg-danger-500'}`}></div>
              <span className="text-sm text-gray-600">
                {currentUser.isActive ? 'Activa' : 'Inactiva'}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Último Acceso
            </label>
            <span className="text-sm text-gray-600">
              {currentUser.lastLogin ? new Date(currentUser.lastLogin).toLocaleDateString('es-ES') : 'No disponible'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
