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
  isActive: boolean; // Si el área está activa o no
  // Campos legacy para compatibilidad
  isMeetingRoom?: boolean;
  isFullDayReservation?: boolean;
}

export interface Reservation {
  _id: string;
  reservationId?: string; // ID único legible para identificación fácil
  userId: string | { _id: string; name: string; username: string };
  userName: string;
  area: string; // Nombre del área (usado en la API)
  date: string;
  startTime: string;
  endTime: string;
  teamName: string;
  requestedSeats: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  notes: string;
  createdAt: string;
  updatedAt: string;
  // Información del usuario que creó la reserva (auditoría)
  createdBy?: {
    userId: string;
    userName: string;
    userEmail: string;
    userRole: 'superadmin' | 'admin' | 'lider' | 'colaborador';
  };
  // Colaboradores incluidos en la reserva
  colaboradores?: Array<{
    _id: string;
    name: string;
    username: string;
    email: string;
  }>;
  // Nombres de asistentes
  attendees?: string[];
  // Campo debug detallado para análisis y troubleshooting
  debug?: {
    // Información básica del sistema
    systemInfo?: {
      createdAt: string;
      timezone: string;
      userAgent: string;
      version: string;
      serverTime: string;
      requestId: string;
    };
    
    // Datos de entrada originales
    inputData?: {
      raw: {
        userId: string;
        userName: string;
        area: string;
        date: string;
        startTime: string;
        endTime: string;
        teamName: string;
        requestedSeats: number;
        notes: string;
        colaboradores: any[];
        attendees: string[];
      };
      processed: {
        finalRequestedSeats: number;
        validColaboradores: any[];
        reservationDate: string;
        areaInfo: any;
      };
    };
    
    // Información del usuario que crea la reserva
    userInfo?: {
      creator: {
        id: string;
        name: string;
        email: string;
        username: string;
        role: string;
        cedula: string | null;
      };
      collaborators: Array<{
        id: string;
        name: string;
        role: string;
      }>;
    };
    
    // Procesamiento de fechas detallado
    dateProcessing?: {
      original: {
        dateString: string;
        startTimeString: string;
        endTimeString: string;
      };
      parsed: {
        year: number;
        month: number;
        day: number;
        hours: number;
        minutes: number;
      };
      utc: {
        reservationDate: string;
        localTime: string;
        utcOffset: number;
        timezone: string;
      };
      validation: {
        isOfficeDay: boolean;
        isWithinOfficeHours: boolean;
        isFutureDate: boolean;
        dayOfWeek: number;
        dayName: string;
      };
    };
    
    // Información del área y capacidad
    areaInfo?: {
      areaName: string;
      areaType: string;
      capacity: number;
      requestedSeats: number;
      availableSeats: number;
      utilizationRate: string;
    };
    
    // Validaciones realizadas
    validations?: {
      requiredFields: {
        [key: string]: boolean;
      };
      businessRules: {
        [key: string]: boolean;
      };
      capacityValidation: {
        [key: string]: any;
      };
    };
    
    // Información de la reserva generada
    reservationInfo?: {
      reservationId: string;
      duration: {
        startTime: string;
        endTime: string;
        durationMinutes: number;
        durationHours: number;
      };
      participants: {
        total: number;
        collaborators: number;
        attendees: number;
        creator: number;
      };
    };
    
    // Metadatos adicionales
    metadata?: {
      ipAddress: string;
      referer: string;
      acceptLanguage: string;
      contentType: string;
      requestMethod: string;
      requestUrl: string;
      timestamp: number;
    };
  };
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
  _id?: string; // MongoDB ObjectId
  name: string;
  email: string;
  username: string;
  password: string; // En producción debería estar hasheada
  cedula: string;
  employeeId: string;
  role: 'superadmin' | 'admin' | 'lider' | 'colaborador';
  department?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface Department {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdBy: {
    _id: string;
    name: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
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
  notes?: string;
}

export interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  category: 'Networking' | 'Ahorro' | 'Tecnología' | 'Productividad' | 'Emprendimiento' | 'Coworking' | 'Otro';
  image: string;
  keywords: string[];
  readTime: string;
  published: boolean;
  publishedAt?: string;
  views: number;
  createdBy: {
    userId: string;
    userName: string;
  };
  lastModifiedBy?: {
    userId: string;
    userName: string;
    modifiedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

