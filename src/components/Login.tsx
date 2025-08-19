import React, { useState } from 'react';
import { Users, Eye, EyeOff, LogIn, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LoginCredentials } from '../types';
import { getCurrentDateString } from '../utils/dateUtils';
import { ForgotPassword } from './ForgotPassword';
import { UserDebug } from './UserDebug';

export function Login() {
  const { state, dispatch } = useApp();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    console.log('Intentando login con:', credentials);
    console.log('Usuarios disponibles:', state.users);

    // Buscar usuario por username
    const user = state.users.find(u => 
      u.username === credentials.username && 
      u.password === credentials.password &&
      u.isActive
    );

    console.log('Usuario encontrado:', user);

    if (user) {
      // Actualizar último login
      const updatedUser = { ...user, lastLogin: getCurrentDateString() };
      dispatch({ type: 'UPDATE_USER', payload: updatedUser });
      
      // Establecer usuario autenticado
      dispatch({ type: 'SET_CURRENT_USER', payload: user });
      dispatch({ type: 'SET_AUTHENTICATED', payload: true });
    } else {
      // Verificar qué está fallando
      const userByUsername = state.users.find(u => u.username === credentials.username);
      if (!userByUsername) {
        setError('Usuario no encontrado');
      } else if (userByUsername.password !== credentials.password) {
        setError('Contraseña incorrecta');
      } else if (!userByUsername.isActive) {
        setError('Usuario inactivo');
      } else {
        setError('Usuario o contraseña incorrectos');
      }
    }
  };

  if (showForgotPassword) {
    return <ForgotPassword onBackToLogin={() => setShowForgotPassword(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
            <Users className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          TRIBUS - Sistema de Reservas
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Inicia sesión para acceder al sistema
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            <UserDebug />
            {error && (
              <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Usuario
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                  className="input-field"
                  placeholder="Ingresa tu usuario"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  className="input-field pr-10"
                  placeholder="Ingresa tu contraseña"
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
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-primary-600 hover:text-primary-500 flex items-center justify-end ml-auto"
                >
                  <Mail className="w-4 h-4 mr-1" />
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Iniciar Sesión
              </button>
            </div>
          </form>

          {/* Información de usuarios de prueba */}
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Usuarios de Prueba:</h4>
            <div className="space-y-1 text-xs text-gray-600">
              <div><strong>Admin:</strong> admin / admin123</div>
              <div><strong>Usuario:</strong> usuario / user123</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
