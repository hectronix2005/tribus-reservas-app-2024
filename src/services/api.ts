const API_BASE_URL = 'https://tribus-backend-api-2024-c417f649c911.herokuapp.com/api';

// Interfaz para las respuestas de la API
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Clase para manejar errores de la API
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Función para hacer requests HTTP
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Agregar token de autenticación si existe
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`,
    };
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Error de conexión con el servidor');
  }
}

// Servicios de autenticación
export const authService = {
  async login(username: string, password: string) {
    return apiRequest<{ token: string; user: any }>('/users/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async register(userData: any) {
    return apiRequest<{ user: any }>('/users/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async getProfile() {
    return apiRequest<any>('/users/profile');
  },

  async forgotPassword(email: string) {
    return apiRequest<{ message: string }>('/users/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
};

// Servicios de usuarios
export const userService = {
  async getAllUsers() {
    return apiRequest<any[]>('/users');
  },

  async getUserById(id: string) {
    return apiRequest<any>(`/users/${id}`);
  },

  async createUser(userData: any) {
    return apiRequest<{ user: any }>('/users/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async updateUser(id: string, userData: any) {
    return apiRequest<{ user: any }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  async deleteUser(id: string) {
    return apiRequest<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  },
};

// Servicios de reservas (placeholder para futuras implementaciones)
export const reservationService = {
  async getAllReservations() {
    return apiRequest<any[]>('/reservations');
  },

  async createReservation(reservationData: any) {
    return apiRequest<{ reservation: any }>('/reservations', {
      method: 'POST',
      body: JSON.stringify(reservationData),
    });
  },

  async updateReservation(id: string, reservationData: any) {
    return apiRequest<{ reservation: any }>(`/reservations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(reservationData),
    });
  },

  async deleteReservation(id: string) {
    return apiRequest<{ message: string }>(`/reservations/${id}`, {
      method: 'DELETE',
    });
  },
};

// Servicios de áreas (placeholder para futuras implementaciones)
export const areaService = {
  async getAllAreas() {
    return apiRequest<any[]>('/areas');
  },

  async createArea(areaData: any) {
    return apiRequest<{ area: any }>('/areas', {
      method: 'POST',
      body: JSON.stringify(areaData),
    });
  },

  async updateArea(id: string, areaData: any) {
    return apiRequest<{ area: any }>(`/areas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(areaData),
    });
  },

  async deleteArea(id: string) {
    return apiRequest<{ message: string }>(`/areas/${id}`, {
      method: 'DELETE',
    });
  },
};

// Servicios de plantillas (placeholder para futuras implementaciones)
export const templateService = {
  async getAllTemplates() {
    return apiRequest<any[]>('/templates');
  },

  async createTemplate(templateData: any) {
    return apiRequest<{ template: any }>('/templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
  },

  async updateTemplate(id: string, templateData: any) {
    return apiRequest<{ template: any }>(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(templateData),
    });
  },

  async deleteTemplate(id: string) {
    return apiRequest<{ message: string }>(`/templates/${id}`, {
      method: 'DELETE',
    });
  },
};

// Función para verificar si el backend está disponible
export const checkBackendHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
};

export { ApiError };
