import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { Area, Reservation, AdminSettings, DailyCapacity, ReservationTemplate, User, AuthState } from '../types';
import { getCurrentDateString } from '../utils/dateUtils';
import { userService, areaService, templateService, reservationService } from '../services/api';

interface AppState {
  areas: Area[];
  reservations: Reservation[];
  templates: ReservationTemplate[];
  users: User[];
  auth: AuthState;
  adminSettings: AdminSettings;
  selectedDate: string;
  isLoading: boolean;
  error: string | null;
}

type AppAction =
  | { type: 'SET_AREAS'; payload: Area[] }
  | { type: 'ADD_AREA'; payload: Area }
  | { type: 'UPDATE_AREA'; payload: Area }
  | { type: 'DELETE_AREA'; payload: string }
  | { type: 'SET_RESERVATIONS'; payload: Reservation[] }
  | { type: 'ADD_RESERVATION'; payload: Reservation }
  | { type: 'UPDATE_RESERVATION'; payload: Reservation }
  | { type: 'DELETE_RESERVATION'; payload: string }
  | { type: 'SET_TEMPLATES'; payload: ReservationTemplate[] }
  | { type: 'ADD_TEMPLATE'; payload: ReservationTemplate }
  | { type: 'UPDATE_TEMPLATE'; payload: ReservationTemplate }
  | { type: 'DELETE_TEMPLATE'; payload: string }
  | { type: 'SET_USERS'; payload: User[] }
  | { type: 'ADD_USER'; payload: User }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'DELETE_USER'; payload: string }
  | { type: 'SET_CURRENT_USER'; payload: User | null }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_AUTH_LOADING'; payload: boolean }
  | { type: 'SET_AUTH_ERROR'; payload: string | null }
  | { type: 'LOGOUT' }
  | { type: 'SET_ADMIN_SETTINGS'; payload: AdminSettings }
  | { type: 'SET_SELECTED_DATE'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// Estado inicial - todos los datos se cargarán desde MongoDB
const initialState: AppState = {
  areas: [], // Se cargarán desde MongoDB
  reservations: [],
  templates: [], // Se cargarán desde MongoDB
  users: [], // Se cargarán desde MongoDB
  auth: {
    currentUser: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
  },
  adminSettings: {
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
  },
  selectedDate: getCurrentDateString(),
  isLoading: false,
  error: null
};

// Variables globales para mantener datos durante la sesión - se cargarán desde MongoDB
let sessionUsers: User[] = [];
let sessionAreas: Area[] = [];
let sessionTemplates: ReservationTemplate[] = [];

// Función para cargar áreas desde MongoDB
const loadAreasFromMongoDB = async () => {
  try {
    const areas = await areaService.getAllAreas();
    sessionAreas = areas;
    return areas;
  } catch (error) {
    console.error('Error cargando áreas desde MongoDB:', error);
    return [];
  }
};

// Función para cargar templates desde MongoDB
const loadTemplatesFromMongoDB = async () => {
  try {
    const templates = await templateService.getAllTemplates();
    sessionTemplates = templates;
    return templates;
  } catch (error) {
    console.error('Error cargando templates desde MongoDB:', error);
    return [];
  }
};

// Función para cargar reservaciones desde MongoDB
const loadReservationsFromMongoDB = async () => {
  try {
    const reservations = await reservationService.getAllReservations();
    return reservations;
  } catch (error) {
    console.error('Error cargando reservaciones desde MongoDB:', error);
    return [];
  }
};

// Función para debuggear datos
const debugData = () => {
  console.log('=== DEBUG DATOS ===');
  console.log('sessionUsers:', sessionUsers);
  console.log('sessionAreas:', sessionAreas);
  console.log('sessionTemplates:', sessionTemplates);
  console.log('==================');
};

function appReducer(state: AppState, action: AppAction): AppState {
  let newState: AppState;

  switch (action.type) {
    case 'SET_AREAS':
      newState = { ...state, areas: action.payload };
      break;
    case 'ADD_AREA':
      newState = { ...state, areas: [...state.areas, action.payload] };
      break;
    case 'UPDATE_AREA':
      newState = {
        ...state,
        areas: state.areas.map(area =>
          area.id === action.payload.id ? action.payload : area
        )
      };
      break;
    case 'DELETE_AREA':
      newState = {
        ...state,
        areas: state.areas.filter(area => area.id !== action.payload)
      };
      break;
    case 'SET_RESERVATIONS':
      newState = { ...state, reservations: action.payload };
      break;
    case 'ADD_RESERVATION':
      newState = { ...state, reservations: [...state.reservations, action.payload] };
      break;
    case 'UPDATE_RESERVATION':
      newState = {
        ...state,
        reservations: state.reservations.map(reservation =>
          reservation.id === action.payload.id ? action.payload : reservation
        )
      };
      break;
    case 'DELETE_RESERVATION':
      newState = {
        ...state,
        reservations: state.reservations.filter(
          reservation => reservation.id !== action.payload
        )
      };
      break;
    case 'SET_TEMPLATES':
      newState = { ...state, templates: action.payload };
      break;
    case 'ADD_TEMPLATE':
      newState = { ...state, templates: [...state.templates, action.payload] };
      break;
    case 'UPDATE_TEMPLATE':
      newState = {
        ...state,
        templates: state.templates.map(template =>
          template.id === action.payload.id ? action.payload : template
        )
      };
      break;
    case 'DELETE_TEMPLATE':
      newState = {
        ...state,
        templates: state.templates.filter(template => template.id !== action.payload)
      };
      break;
    case 'SET_USERS':
      sessionUsers = action.payload;
      console.log('SET_USERS - sessionUsers actualizado:', sessionUsers);
      newState = { ...state, users: action.payload };
      break;
    case 'ADD_USER':
      sessionUsers = [...sessionUsers, action.payload];
      console.log('ADD_USER - Usuario agregado:', action.payload);
      console.log('ADD_USER - sessionUsers actualizado:', sessionUsers);
      newState = { ...state, users: sessionUsers };
      break;
    case 'UPDATE_USER':
      sessionUsers = sessionUsers.map(user =>
        user.id === action.payload.id ? action.payload : user
      );
      console.log('UPDATE_USER - Usuario actualizado:', action.payload);
      console.log('UPDATE_USER - sessionUsers actualizado:', sessionUsers);
      newState = { ...state, users: sessionUsers };
      break;
    case 'DELETE_USER':
      sessionUsers = sessionUsers.filter(user => user.id !== action.payload);
      console.log('DELETE_USER - Usuario eliminado ID:', action.payload);
      console.log('DELETE_USER - sessionUsers actualizado:', sessionUsers);
      newState = { ...state, users: sessionUsers };
      break;
    case 'SET_CURRENT_USER':
      newState = { ...state, auth: { ...state.auth, currentUser: action.payload } };
      // Guardar estado de autenticación en sessionStorage
      try {
        if (typeof window !== 'undefined') {
          const authData = {
            currentUser: action.payload,
            isAuthenticated: newState.auth.isAuthenticated
          };
          sessionStorage.setItem('tribus-auth', JSON.stringify(authData));
          console.log('💾 Sesión guardada en sessionStorage:', authData);
        }
      } catch (error) {
        console.error('❌ Error guardando sesión:', error);
      }
      break;
    case 'SET_AUTHENTICATED':
      newState = { ...state, auth: { ...state.auth, isAuthenticated: action.payload } };
      // Guardar estado de autenticación en sessionStorage
      try {
        if (typeof window !== 'undefined') {
          const authData = {
            currentUser: newState.auth.currentUser,
            isAuthenticated: action.payload
          };
          sessionStorage.setItem('tribus-auth', JSON.stringify(authData));
          console.log('💾 Estado de autenticación guardado en sessionStorage:', authData);
        }
      } catch (error) {
        console.error('❌ Error guardando sesión:', error);
      }
      break;
    case 'SET_AUTH_LOADING':
      newState = { ...state, auth: { ...state.auth, isLoading: action.payload } };
      break;
    case 'SET_AUTH_ERROR':
      newState = { ...state, auth: { ...state.auth, error: action.payload } };
      break;
    case 'LOGOUT':
      newState = { 
        ...state, 
        auth: { 
          currentUser: null, 
          isAuthenticated: false, 
          isLoading: false, 
          error: null 
        } 
      };
      // Limpiar sessionStorage al hacer logout
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('tribus-auth');
        }
      } catch (error) {
        console.error('❌ Error limpiando sesión:', error);
      }
      break;
    case 'SET_ADMIN_SETTINGS':
      newState = { ...state, adminSettings: action.payload };
      break;
    case 'SET_SELECTED_DATE':
      newState = { ...state, selectedDate: action.payload };
      break;
    case 'SET_LOADING':
      newState = { ...state, isLoading: action.payload };
      break;
    case 'SET_ERROR':
      newState = { ...state, error: action.payload };
      break;
    case 'SET_AREAS':
      newState = { ...state, areas: action.payload };
      break;
    case 'SET_TEMPLATES':
      newState = { ...state, templates: action.payload };
      break;
    default:
      newState = state;
  }

  // Todo se maneja desde MongoDB

  return newState;
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  getDailyCapacity: (date: string) => DailyCapacity[];
  getAreaById: (id: string) => Area | undefined;
  getReservationsByDate: (date: string) => Reservation[];
  getTemplateById: (id: string) => ReservationTemplate | undefined;
  isTimeSlotAvailable: (areaId: string, date: string, time: string, duration: number) => boolean;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Cargar estado inicial desde MongoDB y restaurar sesión
  const loadInitialState = (): AppState => {
    // Intentar restaurar el estado de autenticación desde sessionStorage
    try {
      if (typeof window !== 'undefined') {
        const savedAuth = sessionStorage.getItem('tribus-auth');
        const token = sessionStorage.getItem('authToken');
        console.log('🔍 Debug sessionStorage:', {
          savedAuth: savedAuth ? 'exists' : 'not found',
          token: token ? 'exists' : 'not found',
          savedAuthContent: savedAuth
        });
        
        if (savedAuth && token) {
          const authData = JSON.parse(savedAuth);
          console.log('🔄 Restaurando sesión desde sessionStorage:', authData);
          return {
            ...initialState,
            auth: {
              ...initialState.auth,
              currentUser: authData.currentUser,
              isAuthenticated: authData.isAuthenticated,
              isLoading: false,
              error: null
            }
          };
        } else {
          console.log('⚠️ No se encontró sesión completa en sessionStorage');
        }
      }
    } catch (error) {
      console.error('❌ Error restaurando sesión:', error);
    }
    
    return initialState;
  };

  const [state, dispatch] = useReducer(appReducer, loadInitialState());

  // Verificar y restaurar sesión al inicializar
  useEffect(() => {
    const checkAndRestoreSession = async () => {
      try {
        // Verificar que el token existe en sessionStorage
        const token = sessionStorage.getItem('authToken');
        const savedAuth = sessionStorage.getItem('tribus-auth');
        
        console.log('🔍 Verificando sesión al inicializar:', {
          hasToken: !!token,
          hasSavedAuth: !!savedAuth,
          currentAuthState: {
            isAuthenticated: state.auth.isAuthenticated,
            hasCurrentUser: !!state.auth.currentUser
          }
        });
        
        // Si hay token pero no hay usuario autenticado en el estado, restaurar la sesión
        if (token && savedAuth && !state.auth.isAuthenticated) {
          try {
            const authData = JSON.parse(savedAuth);
            console.log('🔄 Restaurando sesión desde sessionStorage:', authData);
            
            dispatch({ type: 'SET_CURRENT_USER', payload: authData.currentUser });
            dispatch({ type: 'SET_AUTHENTICATED', payload: authData.isAuthenticated });
            
            console.log('✅ Sesión restaurada exitosamente');
          } catch (error) {
            console.error('❌ Error restaurando sesión:', error);
            // Si hay error al parsear, limpiar datos corruptos
            sessionStorage.removeItem('tribus-auth');
            sessionStorage.removeItem('authToken');
          }
        } else if (!token && state.auth.isAuthenticated) {
          // Si no hay token pero hay usuario autenticado, limpiar la sesión
          console.log('❌ Token no encontrado, limpiando sesión...');
          dispatch({ type: 'LOGOUT' });
        } else if (token && state.auth.isAuthenticated) {
          console.log('✅ Sesión válida, no se requiere acción');
        } else {
          console.log('ℹ️ No hay sesión activa');
        }
      } catch (error) {
        console.error('❌ Error verificando sesión:', error);
      }
    };

    // Ejecutar después de un pequeño delay para asegurar que el estado inicial se ha cargado
    setTimeout(checkAndRestoreSession, 100);
  }, [state.auth.isAuthenticated, state.auth.currentUser]);

  // Cargar datos desde MongoDB al inicializar
  useEffect(() => {
    const loadDataFromBackend = async () => {
      try {
        // Cargar usuarios
        const users = await userService.getAllUsers();
        dispatch({ type: 'SET_USERS', payload: users });
        sessionUsers = users;
        
        // Cargar áreas
        const areas = await loadAreasFromMongoDB();
        dispatch({ type: 'SET_AREAS', payload: areas });
        
        // Cargar templates
        const templates = await loadTemplatesFromMongoDB();
        dispatch({ type: 'SET_TEMPLATES', payload: templates });
        
        // Cargar reservaciones
        const reservations = await loadReservationsFromMongoDB();
        dispatch({ type: 'SET_RESERVATIONS', payload: reservations });
      } catch (error) {
        console.error('Error cargando datos desde MongoDB:', error);
        // Si falla, mantener arrays vacíos
        dispatch({ type: 'SET_USERS', payload: [] });
        dispatch({ type: 'SET_AREAS', payload: [] });
        dispatch({ type: 'SET_TEMPLATES', payload: [] });
        dispatch({ type: 'SET_RESERVATIONS', payload: [] });
        sessionUsers = [];
        sessionAreas = [];
        sessionTemplates = [];
      }
    };

    // Cargar datos al inicializar
    loadDataFromBackend();
    
    // Exponer las variables globales en window para acceso directo
    (window as any).sessionUsers = sessionUsers;
    (window as any).sessionAreas = sessionAreas;
    (window as any).sessionTemplates = sessionTemplates;
    
    // Debug inicial
    console.log('AppProvider - Datos iniciales:', {
      users: sessionUsers.length,
      areas: sessionAreas.length,
      templates: sessionTemplates.length
    });
  }, []);

  const getDailyCapacity = (date: string): DailyCapacity[] => {
    // Normalizar la fecha para comparación (convertir a formato YYYY-MM-DD)
    const normalizedDate = date.includes('T') ? date.split('T')[0] : date;
    
    console.log('🔍 getDailyCapacity DEBUG:', {
      inputDate: date,
      normalizedDate,
      totalReservations: state.reservations.length,
      totalAreas: state.areas.length
    });
    
    const reservationsForDate = state.reservations.filter(
      reservation => {
        // Normalizar la fecha de la reservación para comparación
        const reservationDate = reservation.date.includes('T') ? reservation.date.split('T')[0] : reservation.date;
        const matches = reservationDate === normalizedDate && reservation.status !== 'cancelled';
        
        if (reservation.area === 'Hot Desk' && date.includes('2025-09-09')) {
          console.log('🔍 Hot Desk reservation check:', {
            reservationDate,
            normalizedDate,
            area: reservation.area,
            status: reservation.status,
            requestedSeats: reservation.requestedSeats,
            matches
          });
        }
        
        return matches;
      }
    );
    
    console.log('🔍 Reservations for date:', {
      date,
      normalizedDate,
      reservationsForDate: reservationsForDate.length,
      hotDeskReservations: reservationsForDate.filter(r => r.area === 'Hot Desk')
    });

    return state.areas.map(area => {
      const areaReservations = reservationsForDate.filter(
        reservation => reservation.area === area.name
      );
      
      if (area.isMeetingRoom) {
        // Para salas de juntas, no calculamos capacidad por asientos
        // Solo mostramos las reservas del día
        return {
          areaId: area.id,
          areaName: area.name,
          totalCapacity: area.capacity,
          reservedSeats: 0, // No aplica para salas de juntas
          availableSeats: area.capacity, // Siempre disponible (se verifica por horario)
          reservations: areaReservations
        };
      } else {
        // Para áreas de trabajo, calculamos capacidad por asientos
        const reservedSeats = areaReservations.reduce(
          (total, reservation) => total + reservation.requestedSeats,
          0
        );

        const result = {
          areaId: area.id,
          areaName: area.name,
          totalCapacity: area.capacity,
          reservedSeats,
          availableSeats: area.capacity - reservedSeats,
          reservations: areaReservations
        };

        // Debug específico para Hot Desk
        if (area.name === 'Hot Desk' && date.includes('2025-09-09')) {
          console.log('🔍 Hot Desk capacity calculation:', {
            areaName: area.name,
            areaId: area.id,
            totalCapacity: area.capacity,
            areaReservations: areaReservations.length,
            reservations: areaReservations.map(r => ({
              requestedSeats: r.requestedSeats,
              status: r.status,
              date: r.date
            })),
            reservedSeats,
            availableSeats: result.availableSeats,
            result
          });
        }

        return result;
      }
    });
  };

  const getAreaById = (id: string): Area | undefined => {
    return state.areas.find(area => area.id === id);
  };

  const getReservationsByDate = (date: string): Reservation[] => {
    return state.reservations.filter(reservation => reservation.date === date);
  };

  const getTemplateById = (id: string): ReservationTemplate | undefined => {
    return state.templates.find(template => template.id === id);
  };

  const isTimeSlotAvailable = (areaId: string, date: string, time: string, duration: number): boolean => {
    // Debug temporal para verificar el problema
    console.log(`🔍 Verificando: ${time} por ${duration}min en área ${areaId} para fecha ${date}`);
    const reservationsForDate = state.reservations.filter(
      reservation => 
        reservation.areaId === areaId && 
        reservation.date === date && 
        reservation.status !== 'cancelled'
    );

    console.log(`📅 Reservas encontradas:`, reservationsForDate.map(r => `${r.time} (${r.duration}min)`));

    // Convertir tiempo de inicio a minutos desde medianoche
    const [requestedHours, requestedMinutes] = time.split(':').map(Number);
    const requestedStartMinutes = requestedHours * 60 + requestedMinutes;
    const requestedEndMinutes = requestedStartMinutes + duration;

    console.log(`⏰ Nueva reserva: ${time} = ${requestedStartMinutes}min - ${requestedEndMinutes}min`);

    for (const reservation of reservationsForDate) {
      // Convertir tiempo de reserva existente a minutos desde medianoche
      const [reservationHours, reservationMinutes] = reservation.time.split(':').map(Number);
      const reservationStartMinutes = reservationHours * 60 + reservationMinutes;
      const reservationEndMinutes = reservationStartMinutes + reservation.duration;

      console.log(`📋 Reserva existente: ${reservation.time} = ${reservationStartMinutes}min - ${reservationEndMinutes}min`);

      // Verificar si hay solapamiento
      // Hay conflicto si las reservas se solapan en cualquier punto
      const hasConflict = !(
        requestedEndMinutes <= reservationStartMinutes || // Nueva reserva termina antes de que empiece la existente
        requestedStartMinutes >= reservationEndMinutes    // Nueva reserva empieza después de que termine la existente
      );

      console.log(`🔍 ¿Hay conflicto? ${hasConflict}`);

      if (hasConflict) {
        console.log(`🚫 CONFLICTO: ${time} se solapa con ${reservation.time}`);
        return false; // Hay conflicto
      }
    }

    console.log(`✅ DISPONIBLE: ${time}`);
    return true; // No hay conflictos
  };

  const logout = () => {
    console.log('🚪 Iniciando logout...');
    
    // Limpiar sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('tribus-auth');
      sessionStorage.removeItem('authToken');
      console.log('🗑️ Datos de sesión removidos de sessionStorage');
    }
    
    // Resetear estado de autenticación
    dispatch({ type: 'LOGOUT' });
    console.log('✅ Logout completado');
  };

  const value: AppContextType = {
    state,
    dispatch,
    getDailyCapacity,
    getAreaById,
    getReservationsByDate,
    getTemplateById,
    isTimeSlotAvailable,
    logout
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
