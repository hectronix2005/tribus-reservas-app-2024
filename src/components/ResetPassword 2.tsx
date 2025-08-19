import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ResetPasswordProps {
  token?: string;
  onBackToLogin: () => void;
}

export function ResetPassword({ token, onBackToLogin }: ResetPasswordProps) {
  const { state, dispatch } = useApp();
  const [passwords, setPasswords] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (passwords.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (passwords.password !== passwords.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);

    // Simular delay de procesamiento
    await new Promise(resolve => setTimeout(resolve, 1500));

    // En una aplicación real, aquí se validaría el token y se actualizaría la contraseña
    // Por ahora, simulamos que el token es válido y actualizamos la contraseña del usuario admin
    try {
      // Buscar usuario por token (en este caso simulamos que es el admin)
      const user = state.users.find(u => u.username === 'admin');
      
      if (user) {
        const updatedUser = { ...user, password: passwords.password };
        dispatch({ type: 'UPDATE_USER', payload: updatedUser });
        setIsSubmitted(true);
      } else {
        setError('Token inválido o expirado');
      }
    } catch (err) {
      setError('Error al restablecer la contraseña');
    }

    setIsLoading(false);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Contraseña Actualizada
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Tu contraseña ha sido restablecida exitosamente
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mb-4">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ¡Listo!
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Tu contraseña ha sido actualizada. Ya puedes iniciar sesión con tu nueva contraseña.
              </p>
              <button
                onClick={onBackToLogin}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Ir al Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
            <Lock className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Restablecer Contraseña
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Ingresa tu nueva contraseña
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-md flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Nueva Contraseña
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwords.password}
                  onChange={(e) => setPasswords(prev => ({ ...prev, password: e.target.value }))}
                  className="input-field pr-10"
                  placeholder="Ingresa tu nueva contraseña"
                  disabled={isLoading}
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
              <p className="mt-1 text-xs text-gray-500">
                Mínimo 6 caracteres
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmar Contraseña
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="input-field pr-10"
                  placeholder="Confirma tu nueva contraseña"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Actualizando...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Actualizar Contraseña
                  </>
                )}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={onBackToLogin}
                className="text-sm text-primary-600 hover:text-primary-500 flex items-center justify-center mx-auto"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Volver al Login
              </button>
            </div>
          </form>

          {/* Información de demostración */}
          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> En esta versión de demostración, el token se simula automáticamente. 
              En una aplicación real, el token vendría del enlace del email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
