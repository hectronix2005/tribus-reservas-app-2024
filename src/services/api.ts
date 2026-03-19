import { getAuthToken as getStoredAuthToken } from '../utils/storage';

// Use relative URL for both local development and production deployment
const API_BASE_URL = '/api';

// Debug logging for API configuration
console.log('🔧 API Configuration:', {
  hostname: window.location.hostname,
  API_BASE_URL: API_BASE_URL,
  isLocal: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
});

// Interfaz para las respuestas de la API
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Interfaz para Departamento
interface Department {
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

// Clase para manejar errores de la API
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Función para obtener el token de autenticación (usando la utilidad robusta)
const getAuthToken = (): string | null => {
  return getStoredAuthToken();
};

// Función para hacer requests HTTP
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  // Obtener token de autenticación si está disponible
  const token = getAuthToken();

  // Debug: Verificar si el token se obtiene correctamente
  if (!token) {
    console.warn('⚠️ No se encontró token de autenticación. Verificando storage...');
    console.log('📦 sessionStorage authToken:', sessionStorage.getItem('authToken'));
    console.log('📦 sessionStorage tribus-auth:', sessionStorage.getItem('tribus-auth'));
  }

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  console.log(`📡 API Request: ${options.method || 'GET'} ${endpoint}`, {
    hasToken: !!token,
    tokenPreview: token ? token.substring(0, 20) + '...' : 'NO TOKEN',
    hasBody: !!config.body,
    bodyPreview: config.body && typeof config.body === 'string' ? config.body.substring(0, 100) + '...' : 'HAS BODY'
  });

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

      // Si el error es 401 o 403, solo emitir un evento para que la aplicación maneje el cierre de sesión
      // NO recargar la página automáticamente, dejar que el componente decida qué hacer
      if (response.status === 401 || response.status === 403) {
        if (errorMessage.toLowerCase().includes('token') ||
            errorMessage.toLowerCase().includes('autorizado') ||
            errorMessage.toLowerCase().includes('acceso denegado')) {
          console.warn('🔐 Token inválido o acceso denegado detectado. Lanzando error para que el componente lo maneje...');

          // Emitir evento personalizado para notificar a los componentes
          window.dispatchEvent(new CustomEvent('auth:sessionExpired', {
            detail: { status: response.status, message: errorMessage }
          }));
        }
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
    return apiRequest<{ success: boolean; message: string }>('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, newPassword: string) {
    return apiRequest<{ success: boolean; message: string }>('/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },
};

// Servicios de usuarios con protocolo automático
export const userService = {
  async getAllUsers() {
    const users = await apiRequest<any[]>('/users');
    console.log('📋 Usuarios recibidos del backend:', users.map(u => ({
      id: u._id || u.id,
      name: u.name,
      cedula: u.cedula,
      cedulaType: typeof u.cedula
    })));
    
    // Transformar _id a id para compatibilidad con el frontend
    const transformedUsers = users.map(user => ({
      ...user,
      id: user._id || user.id
    }));
    
    console.log('📋 Usuarios transformados:', transformedUsers.map(u => ({
      id: u.id,
      name: u.name,
      cedula: u.cedula,
      cedulaType: typeof u.cedula
    })));
    
    return transformedUsers;
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
    console.log('🔍 Cédula en userData:', userData.cedula);
    
    try {
      const response = await apiRequest<{ user: any }>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
      
      console.log('✅ Usuario actualizado exitosamente en MongoDB Atlas:', response.user);
      console.log('🔍 Cédula en respuesta del servidor:', response.user.cedula);
      
      // Transformar _id a id para compatibilidad con el frontend
      const transformedUser = {
        ...response.user,
        id: response.user._id || response.user.id
      };
      
      console.log('🔍 Usuario transformado:', transformedUser);
      
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
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
      const response = await apiRequest<any>('/users/change-password', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          currentPassword,
          newPassword
        }),
      });
      return response;
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      throw error;
    }
  },

  async updateProfile(userId: string, profileData: any) {
    try {
      const response = await apiRequest<any>(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });
      return response;
    } catch (error) {
      console.error('Error actualizando perfil:', error);
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

  async createArea(areaData: any, userId: string, userRole: string) {
    const response = await apiRequest<any>('/areas', {
      method: 'POST',
      body: JSON.stringify({ ...areaData, userId, userRole }),
    });
    return {
      ...response,
      area: {
        ...response.area,
        id: response.area._id || response.area.id
      }
    };
  },

  async updateArea(id: string, areaData: any, userId: string, userRole: string) {
    const response = await apiRequest<any>(`/areas/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...areaData, userId, userRole }),
    });
    return {
      ...response,
      area: {
        ...response.area,
        id: response.area._id || response.area.id
      }
    };
  },

  async deleteArea(id: string, userId: string, userRole: string) {
    return apiRequest<any>(`/areas/${id}?userId=${userId}&userRole=${userRole}`, {
      method: 'DELETE',
    });
  }
};


// Servicios de reservas con protocolo automático
export const reservationService = {
  async getAllReservations(filters?: {
    startDate?: string;
    endDate?: string;
    area?: string;
    status?: string;
  }) {
    try {
      let url = '/reservations';
      if (filters) {
        const params = new URLSearchParams();
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.area) params.append('area', filters.area);
        if (filters.status) params.append('status', filters.status);
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
      }
      const reservations = await apiRequest<any[]>(url);
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
      console.log('🔍 [reservationService.createReservation] Datos recibidos:', reservationData);
      console.log('🔍 [reservationService.createReservation] Verificando campos:', {
        userId: reservationData.userId,
        userName: reservationData.userName,
        area: reservationData.area,
        date: reservationData.date,
        startTime: reservationData.startTime,
        endTime: reservationData.endTime,
        teamName: reservationData.teamName
      });

      const stringifiedData = JSON.stringify(reservationData);
      console.log('🔍 [reservationService.createReservation] Datos stringificados:', stringifiedData);

      const response = await apiRequest<any>('/reservations', {
        method: 'POST',
        body: stringifiedData,
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

// ==================== SERVICIOS DE DEPARTAMENTOS ====================

export const departmentService = {
  // Obtener todos los departamentos activos
  async getDepartments(): Promise<Department[]> {
    try {
      console.log('🔄 departmentService.getDepartments() - Iniciando petición...');
      console.log('🔗 URL:', `${API_BASE_URL}/departments`);

      const response = await fetch(`${API_BASE_URL}/departments`);

      console.log('📡 Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Datos de departamentos recibidos:', data);

      return data;
    } catch (error) {
      console.error('❌ Error obteniendo departamentos:', error);
      throw error;
    }
  },

  // Obtener todos los departamentos (incluyendo inactivos) - solo para admin/user
  async getAllDepartments(userId: string, userRole: string): Promise<Department[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/departments/all?userId=${userId}&userRole=${userRole}`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error obteniendo todos los departamentos:', error);
      throw error;
    }
  },

  // Crear nuevo departamento - solo para admin/user
  async createDepartment(departmentData: { name: string; description?: string; userId: string; userRole: string }): Promise<Department> {
    try {
      const response = await fetch(`${API_BASE_URL}/departments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(departmentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creando departamento:', error);
      throw error;
    }
  },

  // Actualizar departamento - solo para admin/user
  async updateDepartment(id: string, departmentData: { name?: string; description?: string; isActive?: boolean; userId: string; userRole: string }): Promise<Department> {
    try {
      const response = await fetch(`${API_BASE_URL}/departments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(departmentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error actualizando departamento:', error);
      throw error;
    }
  },

  // Eliminar departamento (marcar como inactivo) - solo para admin/user
  async deleteDepartment(id: string, userId: string, userRole: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/departments/${id}?userId=${userId}&userRole=${userRole}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error eliminando departamento:', error);
      throw error;
    }
  },

  async updateReservationStatus() {
    try {
      const response = await apiRequest<any>('/reservations/update-status', {
        method: 'POST',
      });
      return response;
    } catch (error) {
      console.error('Error actualizando estados de reservaciones:', error);
      throw error;
    }
  }
};

// Servicio para configuración de coworking
export const coworkingService = {
  // Obtener configuración (pública)
  async getSettings() {
    try {
      const response = await apiRequest<any>('/coworking-settings', {
        method: 'GET',
      });
      return response;
    } catch (error) {
      console.error('Error obteniendo configuración de coworking:', error);
      throw error;
    }
  },

  // Actualizar configuración (solo superadmin)
  async updateSettings(settings: any) {
    try {
      // Obtener token de autenticación explícitamente para debugging
      const token = getAuthToken();
      if (!token) {
        console.error('❌ No hay token de autenticación disponible');
        throw new ApiError(401, 'No autorizado - Por favor inicia sesión nuevamente');
      }

      console.log('🔍 FRONTEND: Enviando settings al backend:', {
        hasHomeContent: !!settings?.homeContent,
        hasSpaces: !!settings?.homeContent?.spaces,
        spacesCount: settings?.homeContent?.spaces?.length,
        firstSpace: settings?.homeContent?.spaces?.[0]
      });

      const response = await apiRequest<any>('/coworking-settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      return response;
    } catch (error) {
      console.error('Error actualizando configuración de coworking:', error);
      throw error;
    }
  }
};

// ==========================================
// SERVICIO DE FORMULARIOS DE CONTACTO
// ==========================================

export const contactFormsService = {
  // Crear nuevo formulario de contacto (público, sin autenticación)
  async create(formData: {
    name: string;
    email: string;
    phone: string;
    countryCode?: string;
    company?: string;
    message: string;
    interestedIn?: string;
  }) {
    try {
      const response = await fetch(`${API_BASE_URL}/contact-forms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(response.status, data.error || 'Error al enviar el formulario');
      }

      return data;
    } catch (error) {
      console.error('Error creando formulario de contacto:', error);
      throw error;
    }
  },

  // Obtener todos los formularios (requiere autenticación admin/superadmin)
  async getAll(params?: { status?: string; limit?: number; offset?: number }) {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const url = `/contact-forms${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      // El token de seguridad y autenticación se agregan automáticamente por apiRequest
      const response = await apiRequest<any>(url, {
        method: 'GET',
      });
      return response;
    } catch (error) {
      console.error('Error obteniendo formularios de contacto:', error);
      throw error;
    }
  },

  // Actualizar estado de formulario (requiere autenticación admin/superadmin)
  async update(id: string, updates: {
    status?: 'new' | 'contacted' | 'in_progress' | 'completed' | 'archived';
    notes?: string;
    assignedTo?: string | null;
  }) {
    try {
      // El token de seguridad y autenticación se agregan automáticamente por apiRequest
      const response = await apiRequest<any>(`/contact-forms/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return response;
    } catch (error) {
      console.error('Error actualizando formulario de contacto:', error);
      throw error;
    }
  },

  // Eliminar formulario (requiere autenticación superadmin)
  async delete(id: string) {
    try {
      // El token de seguridad y autenticación se agregan automáticamente por apiRequest
      const response = await apiRequest<any>(`/contact-forms/${id}`, {
        method: 'DELETE',
      });
      return response;
    } catch (error) {
      console.error('Error eliminando formulario de contacto:', error);
      throw error;
    }
  }
};

// ==========================================
// SERVICIO DE BLOG
// ==========================================

export const blogService = {
  // Obtener todos los posts (solo Super Admin)
  async getAll() {
    try {
      const response = await apiRequest<any>('/blog-posts', {
        method: 'GET',
      });
      return response;
    } catch (error) {
      console.error('Error obteniendo blog posts:', error);
      throw error;
    }
  },

  // Obtener posts publicados (público)
  async getPublished() {
    try {
      const response = await fetch(`${API_BASE_URL}/blog-posts/published`);
      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(response.status, data.error || 'Error al obtener artículos publicados');
      }

      return data;
    } catch (error) {
      console.error('Error obteniendo blog posts publicados:', error);
      throw error;
    }
  },

  // Obtener un post por slug (público si está publicado)
  async getBySlug(slug: string) {
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {};

      // Si hay token, agregarlo para poder ver posts no publicados (Super Admin)
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/blog-posts/${slug}`, { headers });
      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(response.status, data.error || 'Error al obtener el artículo');
      }

      return data;
    } catch (error) {
      console.error('Error obteniendo blog post por slug:', error);
      throw error;
    }
  },

  // Crear nuevo post (solo Super Admin)
  async create(postData: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    author?: string;
    category: string;
    image?: string;
    keywords?: string[];
    readTime?: string;
  }) {
    try {
      const response = await apiRequest<any>('/blog-posts', {
        method: 'POST',
        body: JSON.stringify(postData),
      });
      return response;
    } catch (error) {
      console.error('Error creando blog post:', error);
      throw error;
    }
  },

  // Actualizar post (solo Super Admin)
  async update(id: string, postData: {
    title?: string;
    slug?: string;
    excerpt?: string;
    content?: string;
    author?: string;
    category?: string;
    image?: string;
    keywords?: string[];
    readTime?: string;
  }) {
    try {
      const response = await apiRequest<any>(`/blog-posts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(postData),
      });
      return response;
    } catch (error) {
      console.error('Error actualizando blog post:', error);
      throw error;
    }
  },

  // Eliminar post (solo Super Admin)
  async delete(id: string) {
    try {
      const response = await apiRequest<any>(`/blog-posts/${id}`, {
        method: 'DELETE',
      });
      return response;
    } catch (error) {
      console.error('Error eliminando blog post:', error);
      throw error;
    }
  },

  // Publicar/Despublicar post (solo Super Admin)
  async togglePublish(id: string, published: boolean) {
    try {
      const response = await apiRequest<any>(`/blog-posts/${id}/publish`, {
        method: 'PATCH',
        body: JSON.stringify({ published }),
      });
      return response;
    } catch (error) {
      console.error('Error cambiando estado de publicación:', error);
      throw error;
    }
  }
};

// ==========================================
// GENERIC API CLIENT
// ==========================================

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, data?: any) => apiRequest<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined
  }),
  put: <T>(endpoint: string, data?: any) => apiRequest<T>(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined
  }),
  delete: <T>(endpoint: string, data?: any) => apiRequest<T>(endpoint, {
    method: 'DELETE',
    body: data ? JSON.stringify(data) : undefined
  })
};

export { ApiError };
