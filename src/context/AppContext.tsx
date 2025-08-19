import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { Area, Reservation, AdminSettings, DailyCapacity, ReservationTemplate, User, AuthState } from '../types';
import { getCurrentDateString } from '../utils/dateUtils';

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

// Usuarios predefinidos
const defaultUsers: User[] = [
  {
    id: '1',
    name: 'Administrador del Sistema',
    email: 'admin@tribus.com',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    department: 'IT',
    isActive: true,
    createdAt: getCurrentDateString()
  },
  {
    id: '2',
    name: 'Usuario General',
    email: 'usuario@tribus.com',
    username: 'usuario',
    password: 'user123',
    role: 'user',
    department: 'General',
    isActive: true,
    createdAt: getCurrentDateString()
  },
  {
    id: '3',
    name: 'Hector Neira',
    email: 'dneira@tribus.com',
    username: 'Dneira',
    password: 'dneira123',
    role: 'user',
    department: 'Desarrollo',
    isActive: true,
    createdAt: getCurrentDateString()
  }
];

const initialState: AppState = {
  areas: [
    {
      id: '1',
      name: 'Sala de Reuniones A',
      capacity: 20,
      description: 'Sala principal para reuniones de equipo',
      color: '#3b82f6',
      isMeetingRoom: true
    },
    {
      id: '2',
      name: 'Sala de Reuniones B',
      capacity: 15,
      description: 'Sala secundaria para reuniones pequeñas',
      color: '#10b981',
      isMeetingRoom: true
    },
    {
      id: '3',
      name: 'Área de Trabajo Colaborativo',
      capacity: 30,
      description: 'Espacio abierto para trabajo en equipo',
      color: '#f59e0b',
      isMeetingRoom: false
    },
    {
      id: '4',
      name: 'Sala de Capacitación',
      capacity: 25,
      description: 'Sala equipada para capacitaciones',
      color: '#8b5cf6',
      isMeetingRoom: true
    }
  ],
  reservations: [],
  templates: [
    {
      id: '1',
      name: 'Equipo de Desarrollo',
      description: 'Plantilla para el equipo de desarrollo',
      groupName: 'Equipo de Desarrollo',
      contactPerson: 'Juan Pérez',
      contactEmail: 'juan.perez@empresa.com',
      contactPhone: '+1234567890',
      notes: 'Reunión de planificación semanal',
      isActive: true,
      createdAt: getCurrentDateString()
    },
    {
      id: '2',
      name: 'Equipo de Marketing',
      description: 'Plantilla para el equipo de marketing',
      groupName: 'Equipo de Marketing',
      contactPerson: 'María García',
      contactEmail: 'maria.garcia@empresa.com',
      contactPhone: '+1234567891',
      notes: 'Revisión de campañas',
      isActive: true,
      createdAt: getCurrentDateString()
    },
    {
      id: '3',
      name: 'Reunión de Cliente',
      description: 'Plantilla para reuniones con clientes',
      groupName: 'Reunión de Cliente',
      contactPerson: 'Carlos López',
      contactEmail: 'carlos.lopez@empresa.com',
      contactPhone: '+1234567892',
      notes: 'Presentación de propuestas',
      isActive: true,
      createdAt: getCurrentDateString()
    }
  ],
  users: defaultUsers,
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
    }
  },
  selectedDate: getCurrentDateString(),
  isLoading: false,
  error: null
};

// Variable global para mantener usuarios durante la sesión
let sessionUsers: User[] = [...defaultUsers];

// Función para debuggear usuarios
const debugUsers = () => {
  console.log('=== DEBUG USUARIOS ===');
  console.log('sessionUsers:', sessionUsers);
  console.log('defaultUsers:', defaultUsers);
  console.log('localStorage:', localStorage.getItem('tribus-app-state'));
  console.log('=====================');
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
      break;
    case 'SET_AUTHENTICATED':
      newState = { ...state, auth: { ...state.auth, isAuthenticated: action.payload } };
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
    default:
      newState = state;
  }

  // Guardar en localStorage después de cada cambio
  try {
    localStorage.setItem('tribus-app-state', JSON.stringify(newState));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Cargar estado inicial
  const loadInitialState = (): AppState => {
    try {
      const savedState = localStorage.getItem('tribus-app-state');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        // Asegurar que los usuarios de sesión estén disponibles
        sessionUsers = parsedState.users || defaultUsers;
        return {
          ...parsedState,
          users: sessionUsers,
          auth: {
            currentUser: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          }
        };
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
    return initialState;
  };

  const [state, dispatch] = useReducer(appReducer, loadInitialState());

  // Asegurar que los usuarios de sesión estén siempre disponibles
  useEffect(() => {
    if (state.users.length === 0) {
      dispatch({ type: 'SET_USERS', payload: sessionUsers });
    }
    
    // Exponer la variable global en window para acceso directo
    (window as any).sessionUsers = sessionUsers;
    
    // Debug inicial
    console.log('AppProvider - Usuarios iniciales:', sessionUsers);
  }, [state.users.length]);

  const getDailyCapacity = (date: string): DailyCapacity[] => {
    const reservationsForDate = state.reservations.filter(
      reservation => reservation.date === date && reservation.status !== 'cancelled'
    );

    return state.areas.map(area => {
      const areaReservations = reservationsForDate.filter(
        reservation => reservation.areaId === area.id
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

        return {
          areaId: area.id,
          areaName: area.name,
          totalCapacity: area.capacity,
          reservedSeats,
          availableSeats: area.capacity - reservedSeats,
          reservations: areaReservations
        };
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

  const value: AppContextType = {
    state,
    dispatch,
    getDailyCapacity,
    getAreaById,
    getReservationsByDate,
    getTemplateById,
    isTimeSlotAvailable
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
