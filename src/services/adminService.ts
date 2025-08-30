import { AdminSettings } from '../types';

// Clave para localStorage
const ADMIN_SETTINGS_KEY = 'tribus_admin_settings';

// Función para cargar configuración desde localStorage
export const loadAdminSettings = (): AdminSettings | null => {
  try {
    const savedSettings = localStorage.getItem(ADMIN_SETTINGS_KEY);
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
    return null;
  } catch (error) {
    console.error('Error cargando configuración administrativa:', error);
    return null;
  }
};

// Función para guardar configuración en localStorage
export const saveAdminSettings = (settings: AdminSettings): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(settings));
      console.log('✅ Configuración administrativa guardada en localStorage');
      resolve();
    } catch (error) {
      console.error('❌ Error guardando configuración administrativa:', error);
      reject(error);
    }
  });
};

// Función para guardar configuración en el backend (simulada)
export const saveAdminSettingsToBackend = async (settings: AdminSettings): Promise<void> => {
  try {
    // Simular llamada al backend
    const response = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(settings)
    });

    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.status}`);
    }

    console.log('✅ Configuración administrativa guardada en el backend');
  } catch (error) {
    console.error('❌ Error guardando configuración en el backend:', error);
    throw error;
  }
};

// Función para cargar configuración desde el backend (simulada)
export const loadAdminSettingsFromBackend = async (): Promise<AdminSettings | null> => {
  try {
    // Simular llamada al backend
    const response = await fetch('/api/admin/settings', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.status}`);
    }

    const settings = await response.json();
    console.log('✅ Configuración administrativa cargada desde el backend');
    return settings;
  } catch (error) {
    console.error('❌ Error cargando configuración desde el backend:', error);
    return null;
  }
};

// Función para sincronizar configuración (localStorage + backend)
export const syncAdminSettings = async (settings: AdminSettings): Promise<void> => {
  try {
    // Guardar en localStorage primero
    await saveAdminSettings(settings);
    
    // Intentar guardar en el backend
    try {
      await saveAdminSettingsToBackend(settings);
    } catch (backendError) {
      console.warn('⚠️ No se pudo guardar en el backend, pero se guardó localmente:', backendError);
    }
    
    console.log('✅ Configuración administrativa sincronizada');
  } catch (error) {
    console.error('❌ Error sincronizando configuración:', error);
    throw error;
  }
};

// Función para obtener configuración (prioridad: backend > localStorage > default)
export const getAdminSettings = async (): Promise<AdminSettings> => {
  // Configuración por defecto
  const defaultSettings: AdminSettings = {
    maxReservationDays: 30,
    allowSameDayReservations: true,
    requireApproval: false,
    businessHours: {
      start: '07:00',
      end: '18:00'
    },
    officeDays: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    },
    officeHours: {
      start: '08:00',
      end: '18:00'
    }
  };

  try {
    // Intentar cargar desde el backend
    const backendSettings = await loadAdminSettingsFromBackend();
    if (backendSettings) {
      return backendSettings;
    }
  } catch (error) {
    console.warn('⚠️ No se pudo cargar desde el backend:', error);
  }

  // Intentar cargar desde localStorage
  const localSettings = loadAdminSettings();
  if (localSettings) {
    return localSettings;
  }

  // Usar configuración por defecto
  console.log('ℹ️ Usando configuración por defecto');
  return defaultSettings;
};
