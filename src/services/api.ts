const API_BASE_URL = 'https://tribus-reservas-app-2024.herokuapp.com/api';

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

// Función para obtener el token de autenticación
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    // Intentar obtener token de sessionStorage primero, luego de localStorage
    return sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
  }
  return null;
};

// Función para hacer requests HTTP
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Obtener token de autenticación si está disponible
  const token = getAuthToken();
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  // El nuevo backend no requiere autenticación para crear usuarios
  // Los datos se guardan directamente en MongoDB

  try {
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      try {
        const errorData = await response.json();
        
        // Extraer mensaje de error del backend
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.details) {
          errorMessage = errorData.details;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
      }
      
      throw new ApiError(response.status, errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.log('🚨 Network Error:', error);
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

// Servicios de usuarios con protocolo automático
export const userService = {
  async getAllUsers() {
    const users = await apiRequest<any[]>('/users');
    // Transformar _id a id para compatibilidad con el frontend
    return users.map(user => ({
      ...user,
      id: user._id || user.id
    }));
  },

  async getUserById(id: string) {
    const user = await apiRequest<any>(`/users/${id}`);
    // Transformar _id a id para compatibilidad con el frontend
    return {
      ...user,
      id: user._id || user.id
    };
  },

  async createUser(userData: any) {
    console.log('🔄 Creando usuario en MongoDB Atlas...', userData);
    console.log('🔍 Detalle de userData:', {
      name: userData.name,
      email: userData.email,
      username: userData.username,
      password: userData.password ? '***' : 'undefined',
      role: userData.role,
      department: userData.department,
      isActive: userData.isActive
    });
    console.log('🔍 Verificación de campos vacíos:', {
      nameEmpty: !userData.name || userData.name.trim() === '',
      emailEmpty: !userData.email || userData.email.trim() === '',
      usernameEmpty: !userData.username || userData.username.trim() === '',
      passwordEmpty: !userData.password || userData.password.trim() === '',
      roleEmpty: !userData.role
    });
    
    try {
      console.log('🔍 ANTES DE ENVIAR AL BACKEND:', {
        userData,
        userDataStringified: JSON.stringify(userData),
        userDataLength: JSON.stringify(userData).length,
        userDataKeys: Object.keys(userData),
        userDataValues: Object.values(userData)
      });
      
      const response = await apiRequest<{ user: any }>('/users/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      
      console.log('✅ Usuario creado exitosamente en MongoDB Atlas:', response.user);
      
      // Transformar _id a id para compatibilidad con el frontend
      const transformedUser = {
        ...response.user,
        id: response.user._id || response.user.id
      };
      
      return { user: transformedUser };
    } catch (error) {
      console.error('❌ Error creando usuario:', error);
      throw error;
    }
  },

  async updateUser(id: string, userData: any) {
    console.log('🔄 Actualizando usuario en MongoDB Atlas...', { id, userData });
    
    try {
      const response = await apiRequest<{ user: any }>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
      
      console.log('✅ Usuario actualizado exitosamente en MongoDB Atlas:', response.user);
      
      // Transformar _id a id para compatibilidad con el frontend
      const transformedUser = {
        ...response.user,
        id: response.user._id || response.user.id
      };
      
      return { user: transformedUser };
    } catch (error) {
      console.error('❌ Error actualizando usuario:', error);
      throw error;
    }
  },

  async deleteUser(id: string, adminUserId: string) {
    console.log('🔄 Eliminando usuario de MongoDB Atlas...', { id, adminUserId });
    
    try {
      const response = await apiRequest<{ message: string }>(`/users/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ adminUserId }),
      });
      
      console.log('✅ Usuario eliminado exitosamente de MongoDB Atlas:', response.message);
      
      return response;
    } catch (error) {
      console.error('❌ Error eliminando usuario:', error);
      throw error;
    }
  },

  // Función para verificar la sincronización con MongoDB
  async verifyUserSync(userId: string) {
    try {
      const user = await this.getUserById(userId);
      console.log('✅ Usuario sincronizado correctamente:', user);
      return user;
    } catch (error) {
      console.error('❌ Error verificando sincronización:', error);
      throw error;
    }
  }
};

// Servicios de áreas
export const areaService = {
  async getAllAreas() {
    const areas = await apiRequest<any[]>('/areas');
    return areas.map(area => ({
      ...area,
      id: area._id || area.id
    }));
  },

  async getAreaById(id: string) {
    const area = await apiRequest<any>(`/areas/${id}`);
    return {
      ...area,
      id: area._id || area.id
    };
  },

  async createArea(areaData: any) {
    const response = await apiRequest<any>('/areas', {
      method: 'POST',
      body: JSON.stringify(areaData),
    });
    return {
      ...response,
      area: {
        ...response.area,
        id: response.area._id || response.area.id
      }
    };
  },

  async updateArea(id: string, areaData: any) {
    const response = await apiRequest<any>(`/areas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(areaData),
    });
    return {
      ...response,
      area: {
        ...response.area,
        id: response.area._id || response.area.id
      }
    };
  },

  async deleteArea(id: string) {
    return apiRequest<any>(`/areas/${id}`, {
      method: 'DELETE',
    });
  }
};

// Servicios de templates
export const templateService = {
  async getAllTemplates() {
    return apiRequest<any[]>('/templates');
  },

  async getTemplateById(id: string) {
    return apiRequest<any>(`/templates/${id}`);
  },

  async createTemplate(templateData: any) {
    return apiRequest<any>('/templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
  },

  async updateTemplate(id: string, templateData: any) {
    return apiRequest<any>(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(templateData),
    });
  },

  async deleteTemplate(id: string) {
    return apiRequest<any>(`/templates/${id}`, {
      method: 'DELETE',
    });
  }
};

// Servicios de reservas con protocolo automático
export const reservationService = {
  async getAllReservations() {
    try {
      const reservations = await apiRequest<any[]>('/reservations');
      return reservations;
    } catch (error) {
      console.error('Error obteniendo reservaciones:', error);
      throw error;
    }
  },

  async getReservationsByUser(userId: string) {
    try {
      const reservations = await apiRequest<any[]>(`/reservations/user/${userId}`);
      return reservations;
    } catch (error) {
      console.error('Error obteniendo reservaciones del usuario:', error);
      throw error;
    }
  },

  async createReservation(reservationData: any) {
    try {
      const response = await apiRequest<any>('/reservations', {
        method: 'POST',
        body: JSON.stringify(reservationData),
      });
      return response;
    } catch (error) {
      console.error('Error creando reservación:', error);
      throw error;
    }
  },

  async updateReservation(id: string, reservationData: any) {
    try {
      const response = await apiRequest<any>(`/reservations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(reservationData),
      });
      return response;
    } catch (error) {
      console.error('Error actualizando reservación:', error);
      throw error;
    }
  },

  async deleteReservation(id: string, userId: string) {
    try {
      const response = await apiRequest<any>(`/reservations/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ userId }),
      });
      return response;
    } catch (error) {
      console.error('Error eliminando reservación:', error);
      throw error;
    }
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
