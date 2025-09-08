export interface Area {
  id: string;
  _id?: string; // MongoDB ObjectId
  name: string;
  capacity: number;
  description?: string;
  color: string;
  category: 'SALA' | 'HOT_DESK'; // Nueva categoría
  minReservationTime?: number; // Para SALAS: tiempo mínimo en minutos
  maxReservationTime?: number; // Para SALAS: tiempo máximo en minutos
  officeHours?: { // Para HOT DESK: horario de oficina
    start: string;
    end: string;
  };
  // Campos legacy para compatibilidad
  isMeetingRoom?: boolean;
  isFullDayReservation?: boolean;
}

export interface Reservation {
  id: string;
  areaId: string;
  areaName: string;
  groupName: string;
  requestedSeats: number;
  date: string;
  time: string;
  duration: number; // duración en minutos
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
  notes?: string;
  colaboradores?: string[]; // Array de IDs de usuarios colaboradores
  attendees?: string[]; // Array de nombres de asistentes
}

export interface DailyCapacity {
  areaId: string;
  areaName: string;
  totalCapacity: number;
  reservedSeats: number;
  availableSeats: number;
  reservations: Reservation[];
}

export interface AdminSettings {
  maxReservationDays: number;
  allowSameDayReservations: boolean;
  requireApproval: boolean;
  businessHours: {
    start: string;
    end: string;
  };
  officeDays: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  officeHours: {
    start: string;
    end: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  password: string; // En producción debería estar hasheada
  role: 'admin' | 'user' | 'colaborador';
  department?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface ReservationFormData {
  areaId: string;
  groupName: string;
  requestedSeats: number;
  date: string;
  time: string;
  duration: number; // duración en minutos
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  notes?: string;
}

export interface ReservationTemplate {
  id: string;
  name: string;
  description?: string;
  groupName: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  createdBy?: string; // ID del usuario que creó la plantilla
  userId?: string; // ID del usuario propietario (para compatibilidad)
}
