import React, { useState, useEffect, useMemo } from 'react';
import { Users, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User as UserType, Department } from '../types';
import { formatDateInBogota } from '../utils/unifiedDateUtils';
import { userService, departmentService, ApiError } from '../services/api';
import { ProtocolNotification } from './ProtocolNotification';
import { UserForm } from './users/UserForm';
import { UserFilters } from './users/UserFilters';
import { UserTable } from './users/UserTable';

export function UserManagement() {
  const { state, dispatch } = useApp();
  const currentUser = state.auth.currentUser;
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });
  const [showValidation, setShowValidation] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    cedula: '',
    employeeId: '',
    role: 'lider' as 'superadmin' | 'admin' | 'lider' | 'colaborador',
    department: '',
    isActive: true
  });

  // Cargar usuarios y departamentos del backend al montar el componente
  useEffect(() => {
    loadUsers();
    loadDepartments();
  }, []);

  // Escuchar cambios en departamentos desde otros componentes
  useEffect(() => {
    const handleDepartmentsUpdate = () => {
      loadDepartments();
    };

    window.addEventListener('departmentsUpdated', handleDepartmentsUpdate);
    return () => {
      window.removeEventListener('departmentsUpdated', handleDepartmentsUpdate);
    };
  }, []);

  // Monitorear cambios en formData para debugging
  useEffect(() => {
    console.log('📝 Estado actual del formulario:', formData);
  }, [formData]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const users = await userService.getAllUsers();
      dispatch({ type: 'SET_USERS', payload: users });
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      setError('Error cargando usuarios del servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const data = await departmentService.getDepartments();
      setDepartments(data);
    } catch (error) {
      console.error('Error cargando departamentos:', error);
    }
  };

  // Filtrar usuarios basado en los filtros activos
  const filteredUsers = useMemo(() => {
    return state.users.filter(user => {
      // Filtro de búsqueda (nombre, email, username, cédula)
      const matchesSearch = searchTerm === '' ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.cedula && user.cedula.includes(searchTerm));

      // Filtro de rol
      const matchesRole = filterRole === 'all' || user.role === filterRole;

      // Filtro de estado
      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'active' && user.isActive) ||
        (filterStatus === 'inactive' && !user.isActive);

      // Filtro de departamento
      const matchesDepartment = filterDepartment === 'all' || user.department === filterDepartment;

      return matchesSearch && matchesRole && matchesStatus && matchesDepartment;
    });
  }, [state.users, searchTerm, filterRole, filterStatus, filterDepartment]);

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🚀 INICIO: handleSubmit ejecutándose');
    console.log('📝 Estado actual del formulario al inicio:', formData);
    console.log('🔍 Verificación de campos al inicio:', {
      name: formData.name,
      email: formData.email,
      username: formData.username,
      password: formData.password,
      role: formData.role
    });
    e.preventDefault();
    setError(null);

    // Activar validaciones solo cuando se intenta enviar
    setShowValidation(true);

    // Verificar si el formulario es válido antes de continuar
    const isValid = isFormValid();
    console.log('🔍 Validación del formulario:', {
      isValid,
      formData,
      editingUser: !!editingUser,
      validationErrors: getValidationErrors()
    });

    if (!isValid) {
      console.log('❌ Formulario no válido, deteniendo envío');
      setIsLoading(false);
      return;
    }

    // Verificar que los datos no estén vacíos
    console.log('🔍 Verificación final de datos:', {
      name: formData.name.trim(),
      email: formData.email.trim(),
      username: formData.username.trim(),
      password: formData.password.trim(),
      role: formData.role
    });

    try {
      setIsLoading(true);
      console.log('🚀 Iniciando protocolo de creación/actualización de usuario...');

      if (editingUser) {
        // PROTOCOLO: Actualizar usuario existente
        console.log('📝 Protocolo: Actualizando usuario existente');

        const userData = {
          name: formData.name,
          email: formData.email,
          username: formData.username,
          cedula: formData.cedula.trim(),
          employeeId: formData.employeeId.trim(),
          role: formData.role,
          department: formData.department,
          isActive: formData.isActive
        };

        // Validar que la cédula no esté vacía
        if (!formData.cedula.trim()) {
          console.error('❌ Error: Cédula vacía detectada');
          setError('La cédula es obligatoria');
          setIsLoading(false);
          return;
        }

        console.log('📝 Datos para actualizar usuario existente:', userData);
        console.log('🔍 Cédula en actualización:', {
          cedula: formData.cedula,
          cedulaTrimmed: formData.cedula.trim(),
          cedulaLength: formData.cedula.trim().length,
          cedulaType: typeof formData.cedula,
          cedulaIsEmpty: formData.cedula.trim() === '',
          cedulaIsUndefined: formData.cedula === undefined,
          cedulaIsNull: formData.cedula === null
        });

        // Solo incluir password si se cambió
        if (formData.password) {
          (userData as any).password = formData.password;
        }

        // Paso 1: Actualizar en MongoDB Atlas
        const response = await userService.updateUser(editingUser.id, userData);

        // Paso 2: Actualizar estado local
        dispatch({ type: 'UPDATE_USER', payload: response.user });

        // Paso 3: Verificar sincronización
        await userService.verifyUserSync(response.user.id);

        console.log('✅ Protocolo completado: Usuario actualizado en MongoDB Atlas y estado local');

      } else {
        // PROTOCOLO: Crear nuevo usuario
        console.log('🆕 Protocolo: Creando nuevo usuario');

        // Verificar que los datos no estén vacíos antes de enviar
        if (!formData.name.trim() || !formData.email.trim() || !formData.username.trim() || !formData.password.trim() || !formData.cedula.trim() || !formData.employeeId.trim()) {
          console.error('❌ Error: Datos vacíos detectados antes del envío');
          setError('Todos los campos requeridos deben estar llenos, incluyendo la cédula y el ID de empleado');
          setIsLoading(false);
          return;
        }

        const userData = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          username: formData.username.trim(),
          password: formData.password.trim(),
          cedula: formData.cedula.trim(),
          employeeId: formData.employeeId.trim(),
          role: formData.role,
          department: formData.department.trim(),
          isActive: formData.isActive
        };

        console.log('📤 Datos que se van a enviar al backend:', userData);
        console.log('🔍 Cédula específicamente:', {
          cedula: formData.cedula,
          cedulaTrimmed: formData.cedula.trim(),
          cedulaLength: formData.cedula.trim().length
        });

        console.log('🔍 Validación de datos antes del envío:', {
          name: formData.name.trim(),
          email: formData.email.trim(),
          username: formData.username.trim(),
          password: formData.password.trim(),
          role: formData.role,
          department: formData.department.trim(),
          isActive: formData.isActive
        });

        // Verificación adicional antes del envío
        console.log('🔍 Verificación final antes de enviar:', {
          userDataKeys: Object.keys(userData),
          userDataValues: Object.values(userData),
          userDataStringified: JSON.stringify(userData),
          formDataKeys: Object.keys(formData),
          formDataValues: Object.values(formData)
        });

        // Paso 1: Crear en MongoDB Atlas
        const response = await userService.createUser(userData);

        // Paso 2: Actualizar estado local
        dispatch({ type: 'ADD_USER', payload: response.user });

        // Paso 3: Verificar sincronización
        await userService.verifyUserSync(response.user.id);

        console.log('✅ Protocolo completado: Usuario creado en MongoDB Atlas y estado local');
      }

      // Reset form
      setFormData({
        name: '',
        email: '',
        username: '',
        password: '',
        cedula: '',
        employeeId: '',
        role: 'lider',
        department: '',
        isActive: true
      });
      setShowForm(false);
      setEditingUser(null);
      setShowPassword(false);
      setShowValidation(false); // Resetear validaciones al completar exitosamente

      // Mostrar notificación de éxito
      setNotification({
        show: true,
        type: 'success',
        title: editingUser ? 'Usuario Actualizado' : 'Usuario Creado',
        message: editingUser
          ? 'Usuario actualizado exitosamente en MongoDB Atlas'
          : 'Usuario creado exitosamente en MongoDB Atlas'
      });

    } catch (error) {
      console.error('❌ Error en protocolo de usuario:', error);

      if (error instanceof ApiError) {
        if (error.status === 400) {
          // Usar el mensaje específico del backend en lugar del genérico
          setError(error.message || 'Error en los datos del usuario. Verifica que todos los campos sean válidos.');
        } else if (error.status === 409) {
          setError('El nombre de usuario o email ya existe en el sistema');
        } else if (error.status === 401) {
          setError('No tienes permisos para realizar esta acción');
        } else if (error.status === 403) {
          setError('Acceso denegado. Verifica tus permisos de administrador');
        } else {
          setError(error.message || 'Error guardando usuario en el servidor');
        }
      } else {
        setError('Error de conexión con el servidor. Verifica tu conexión a internet.');
      }

      // Mostrar notificación de error
      setNotification({
        show: true,
        type: 'error',
        title: 'Error al Guardar Usuario',
        message: error instanceof ApiError ? error.message : 'Error de conexión con el servidor'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user: UserType) => {
    console.log('🔍 Editando usuario:', {
      id: user.id,
      name: user.name,
      cedula: user.cedula,
      cedulaType: typeof user.cedula,
      cedulaIsNull: user.cedula === null,
      cedulaIsUndefined: user.cedula === undefined
    });

    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      username: user.username,
      password: '', // No mostrar contraseña actual
      cedula: user.cedula || '',
      employeeId: user.employeeId || '',
      role: user.role,
      department: user.department || '',
      isActive: user.isActive
    });
    setShowForm(true);
    setShowValidation(false); // Resetear validaciones al editar
  };

  const handleDelete = async (userId: string) => {
    if (!userId || userId === 'undefined') {
      setNotification({
        show: true,
        type: 'error',
        title: 'Error',
        message: 'ID de usuario inválido'
      });
      return;
    }

    if (!currentUser) {
      setNotification({
        show: true,
        type: 'error',
        title: 'Error',
        message: 'Debe iniciar sesión para eliminar usuarios'
      });
      return;
    }

    if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
      setNotification({
        show: true,
        type: 'error',
        title: 'Error',
        message: 'Solo los administradores pueden eliminar usuarios'
      });
      return;
    }

    if (window.confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.')) {
      try {
        console.log('🗑️ Protocolo: Eliminando usuario de MongoDB Atlas...');

        // Paso 1: Eliminar de MongoDB Atlas
        await userService.deleteUser(userId, currentUser.id);

        // Paso 2: Actualizar estado local
        dispatch({ type: 'DELETE_USER', payload: userId });

        console.log('✅ Protocolo completado: Usuario eliminado de MongoDB Atlas y estado local');
        setNotification({
          show: true,
          type: 'success',
          title: 'Usuario Eliminado',
          message: 'Usuario eliminado exitosamente de MongoDB Atlas'
        });

      } catch (error) {
        console.error('❌ Error eliminando usuario:', error);
        setNotification({
          show: true,
          type: 'error',
          title: 'Error al Eliminar',
          message: 'Error eliminando usuario. Verifica la conexión con el servidor.'
        });
      }
    }
  };

  const handleToggleActive = async (user: UserType) => {
    try {
      console.log('🔄 Protocolo: Cambiando estado activo del usuario...');

      const updatedUser = { ...user, isActive: !user.isActive };

      // Paso 1: Actualizar en MongoDB Atlas
      await userService.updateUser(user.id, { isActive: updatedUser.isActive });

      // Paso 2: Actualizar estado local
      dispatch({ type: 'UPDATE_USER', payload: updatedUser });

      console.log('✅ Protocolo completado: Estado activo actualizado en MongoDB Atlas');

    } catch (error) {
      console.error('❌ Error cambiando estado activo:', error);
      setNotification({
        show: true,
        type: 'error',
        title: 'Error al Cambiar Estado',
        message: 'Error cambiando estado del usuario. Verifica la conexión con el servidor.'
      });
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      email: '',
      username: '',
      password: '',
      cedula: '',
      employeeId: '',
      role: 'lider',
      department: '',
      isActive: true
    });
    setShowForm(false);
    setEditingUser(null);
    setShowPassword(false);
    setShowValidation(false); // Resetear validaciones
  };

  const validatePassword = (password: string) => {
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    if (!/[A-Z]/.test(password)) return 'La contraseña debe contener al menos una mayúscula';
    if (!/[a-z]/.test(password)) return 'La contraseña debe contener al menos una minúscula';
    if (!/[0-9]/.test(password)) return 'La contraseña debe contener al menos un número';
    return null;
  };

  const isFormValid = () => {
    // Validar campos requeridos
    if (!formData.name.trim()) return false;
    if (!formData.email.trim()) return false;
    if (!formData.username.trim()) return false;
    if (!formData.cedula.trim()) return false; // Cédula es obligatoria
    if (!formData.employeeId.trim()) return false; // ID de empleado es obligatorio
    if (!formData.department.trim()) return false; // Departamento es obligatorio
    if (!editingUser && !formData.password.trim()) return false; // Contraseña requerida solo para nuevos usuarios

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return false;

    // Validar contraseña si se está creando un nuevo usuario y se ingresó una contraseña
    if (!editingUser && formData.password.trim() && validatePassword(formData.password)) {
      return false;
    }

    // Verificar que el username, email y cédula no existan ya (solo para nuevos usuarios)
    if (!editingUser) {
      const existingUser = state.users.find(user =>
        user.username.toLowerCase() === formData.username.toLowerCase() ||
        user.email.toLowerCase() === formData.email.toLowerCase() ||
        user.cedula === formData.cedula ||
        user.employeeId === formData.employeeId
      );
      if (existingUser) return false;
    }

    return true;
  };

  const getValidationErrors = () => {
    const errors: string[] = [];

    if (!formData.name.trim()) errors.push('El nombre es requerido');
    if (!formData.email.trim()) errors.push('El email es requerido');
    if (!formData.username.trim()) errors.push('El nombre de usuario es requerido');
    if (!formData.cedula.trim()) errors.push('La cédula es requerida');
    if (!formData.employeeId.trim()) errors.push('El ID de empleado es requerido');
    if (!formData.department.trim()) errors.push('El departamento es requerido');
    if (!editingUser && !formData.password.trim()) errors.push('La contraseña es requerida para nuevos usuarios');

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email.trim() && !emailRegex.test(formData.email)) {
      errors.push('El email no tiene un formato válido');
    }

    // Validar contraseña
    if (!editingUser && formData.password && validatePassword(formData.password)) {
      errors.push(validatePassword(formData.password)!);
    }

    // Verificar duplicados
    if (!editingUser) {
      const existingUser = state.users.find(user =>
        user.username.toLowerCase() === formData.username.toLowerCase() ||
        user.email.toLowerCase() === formData.email.toLowerCase() ||
        user.cedula === formData.cedula ||
        user.employeeId === formData.employeeId
      );
      if (existingUser) {
        errors.push('El nombre de usuario, email, cédula o ID de empleado ya existe en el sistema');
      }
    }

    return errors;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600">Administra usuarios y permisos del sistema</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setShowValidation(false); // Resetear validaciones al abrir formulario
          }}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Search and Filters */}
      <UserFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterRole={filterRole}
        setFilterRole={setFilterRole}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterDepartment={filterDepartment}
        setFilterDepartment={setFilterDepartment}
        departments={departments}
        totalUsers={state.users.length}
        filteredCount={filteredUsers.length}
      />

      {/* Users Table */}
      <UserTable
        filteredUsers={filteredUsers}
        currentUser={currentUser}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
        formatDateInBogota={formatDateInBogota}
      />

      {/* Form Modal */}
      {showForm && (
        <UserForm
          formData={formData}
          setFormData={setFormData}
          editingUser={editingUser}
          departments={departments}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          showValidation={showValidation}
          isLoading={isLoading}
          onSubmit={handleSubmit}
          onClose={handleCancel}
        />
      )}

      {/* Empty State */}
      {state.users.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay usuarios configurados</h3>
          <p className="text-gray-500 mb-6">
            Crea usuarios para permitir el acceso al sistema.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            Crear Primer Usuario
          </button>
        </div>
      )}

      {/* Protocol Notification */}
      <ProtocolNotification
        show={notification.show}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() => setNotification(prev => ({ ...prev, show: false }))}
      />
    </div>
  );
}
