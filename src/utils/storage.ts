/**
 * Utilidad robusta para manejo de sessionStorage
 * Proporciona almacenamiento confiable con respaldo en memoria
 */

import { User } from '../types';

// Almacenamiento en memoria como respaldo
let memoryStorage: { [key: string]: string } = {};

// Interfaz para el estado de autenticación
export interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  token?: string;
}

/**
 * Verifica si sessionStorage está disponible
 */
const isSessionStorageAvailable = (): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    const testKey = '__storage_test__';
    sessionStorage.setItem(testKey, 'test');
    sessionStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.warn('⚠️ sessionStorage no disponible, usando almacenamiento en memoria');
    return false;
  }
};

/**
 * Guarda un valor en sessionStorage con respaldo en memoria
 */
const setItem = (key: string, value: string): void => {
  try {
    // Intentar guardar en sessionStorage
    if (isSessionStorageAvailable()) {
      sessionStorage.setItem(key, value);
      console.log(`💾 Guardado en sessionStorage: ${key}`);
    }

    // Siempre guardar en memoria como respaldo
    memoryStorage[key] = value;
    console.log(`💾 Guardado en memoria: ${key}`);
  } catch (error) {
    console.error(`❌ Error guardando ${key}:`, error);
    // Si falla sessionStorage, usar solo memoria
    memoryStorage[key] = value;
  }
};

/**
 * Obtiene un valor de sessionStorage o memoria
 */
const getItem = (key: string): string | null => {
  try {
    // Primero intentar obtener de sessionStorage
    if (isSessionStorageAvailable()) {
      const sessionValue = sessionStorage.getItem(key);
      if (sessionValue) {
        // Sincronizar con memoria
        memoryStorage[key] = sessionValue;
        return sessionValue;
      }
    }

    // Si no está en sessionStorage, buscar en memoria
    const memoryValue = memoryStorage[key];
    if (memoryValue) {
      // Intentar sincronizar de vuelta a sessionStorage
      if (isSessionStorageAvailable()) {
        sessionStorage.setItem(key, memoryValue);
      }
      return memoryValue;
    }

    return null;
  } catch (error) {
    console.error(`❌ Error obteniendo ${key}:`, error);
    return memoryStorage[key] || null;
  }
};

/**
 * Elimina un valor de sessionStorage y memoria
 */
const removeItem = (key: string): void => {
  try {
    if (isSessionStorageAvailable()) {
      sessionStorage.removeItem(key);
    }
    delete memoryStorage[key];
    console.log(`🗑️ Eliminado: ${key}`);
  } catch (error) {
    console.error(`❌ Error eliminando ${key}:`, error);
  }
};

/**
 * Limpia todo el almacenamiento
 */
const clear = (): void => {
  try {
    if (isSessionStorageAvailable()) {
      sessionStorage.clear();
    }
    memoryStorage = {};
    console.log('🗑️ Almacenamiento limpiado');
  } catch (error) {
    console.error('❌ Error limpiando almacenamiento:', error);
  }
};

// ========== Funciones específicas para autenticación ==========

/**
 * Guarda el token JWT de forma robusta
 */
export const saveAuthToken = (token: string): void => {
  setItem('authToken', token);
  console.log('🔐 Token guardado:', token.substring(0, 20) + '...');
};

/**
 * Obtiene el token JWT
 */
export const getAuthToken = (): string | null => {
  const token = getItem('authToken');
  return token;
};

/**
 * Guarda el estado completo de autenticación
 */
export const saveAuthState = (authState: AuthState): void => {
  try {
    const stateString = JSON.stringify(authState);
    setItem('tribus-auth', stateString);

    // También guardar el token por separado para fácil acceso
    if (authState.token) {
      saveAuthToken(authState.token);
    }

    console.log('✅ Estado de autenticación guardado completo');
  } catch (error) {
    console.error('❌ Error guardando estado de autenticación:', error);
  }
};

/**
 * Obtiene el estado completo de autenticación
 */
export const getAuthState = (): AuthState | null => {
  try {
    const stateString = getItem('tribus-auth');
    const token = getAuthToken();

    if (!stateString) {
      return null;
    }

    const authState: AuthState = JSON.parse(stateString);

    // Asegurar que el token esté incluido
    if (token && !authState.token) {
      authState.token = token;
    }

    return authState;
  } catch (error) {
    console.error('❌ Error obteniendo estado de autenticación:', error);
    return null;
  }
};

/**
 * Limpia la sesión de autenticación
 */
export const clearAuthSession = (): void => {
  removeItem('authToken');
  removeItem('tribus-auth');
  console.log('🔓 Sesión de autenticación limpiada');
};

/**
 * Verifica si hay una sesión válida
 */
export const hasValidSession = (): boolean => {
  const token = getAuthToken();
  const authState = getAuthState();

  const isValid = !!(token && authState && authState.isAuthenticated && authState.currentUser);

  // Solo loguear si la sesión es válida (no mostrar logs en páginas públicas)
  if (isValid) {
    console.log('✅ Sesión válida verificada');
  }

  return isValid;
};

// Exportar objeto con todas las funciones
export const storage = {
  setItem,
  getItem,
  removeItem,
  clear,
  saveAuthToken,
  getAuthToken,
  saveAuthState,
  getAuthState,
  clearAuthSession,
  hasValidSession
};

export default storage;
