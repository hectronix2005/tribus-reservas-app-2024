import React, { useState } from 'react';
import { Users, Eye, EyeOff, LogIn, Mail, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LoginCredentials } from '../types';
import { getCurrentDateString } from '../utils/dateUtils';
import { ForgotPassword } from './ForgotPassword';
import { authService, userService, ApiError } from '../services/api';
import { saveAuthState } from '../utils/storage';

interface LoginProps {
  onBackClick?: () => void;
}

export function Login({ onBackClick }: LoginProps = {}) {
  const { state, dispatch } = useApp();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      console.log('Intentando login con backend:', credentials);

      // Intentar login con el backend
      const response = await authService.login(credentials.username, credentials.password);

      if (!response.token) {
        console.error('❌ No se recibió token del backend. Response:', response);
        setError('Error de autenticación: No se recibió token');
        return;
      }

      // Guardar estado de autenticación usando la utilidad robusta
      saveAuthState({
        currentUser: response.user,
        isAuthenticated: true,
        token: response.token
      });

      // Establecer usuario autenticado en el estado de la aplicación
      dispatch({ type: 'SET_CURRENT_USER', payload: response.user });
      dispatch({ type: 'SET_AUTHENTICATED', payload: true });

      console.log('✅ Login exitoso, sesión establecida');
    
    // Cargar usuarios desde MongoDB después del login exitoso
    try {
      const users = await userService.getAllUsers();
      dispatch({ type: 'SET_USERS', payload: users });
    } catch (error) {
      console.error('Error cargando usuarios después del login:', error);
    }
    
    console.log('Login exitoso:', response.user);
      
    } catch (error) {
      console.error('Error en login:', error);
      
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setError('Usuario o contraseña incorrectos');
        } else if (error.status === 404) {
          setError('Usuario no encontrado');
        } else {
          setError(error.message || 'Error de autenticación');
        }
      } else {
        setError('Error de conexión con el servidor');
      }
    }
  };

  if (showForgotPassword) {
    return <ForgotPassword onBackToLogin={() => setShowForgotPassword(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {onBackClick && (
        <div className="absolute top-4 left-4">
          <button
            onClick={onBackClick}
            className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 transition"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Volver al inicio</span>
          </button>
        </div>
      )}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-lg overflow-hidden">
            <img 
              src="/images/tribus-logo.svg" 
              alt="Logo" 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback si la imagen no carga
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center hidden">
              <span className="text-white font-bold text-2xl">T</span>
            </div>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sistema de Reservas
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Inicia sesión para acceder al sistema
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
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
        </div>
      </div>
    </div>
  );
}
