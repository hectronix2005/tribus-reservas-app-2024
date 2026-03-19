import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { User as UserType, Department } from '../../types';

type FormData = {
  name: string;
  email: string;
  username: string;
  password: string;
  cedula: string;
  employeeId: string;
  role: 'superadmin' | 'admin' | 'lider' | 'colaborador';
  department: string;
  isActive: boolean;
};

interface UserFormProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  editingUser: UserType | null;
  departments: Department[];
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  showValidation: boolean;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

function validatePassword(password: string): string | null {
  if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
  if (!/[A-Z]/.test(password)) return 'La contraseña debe contener al menos una mayúscula';
  if (!/[a-z]/.test(password)) return 'La contraseña debe contener al menos una minúscula';
  if (!/[0-9]/.test(password)) return 'La contraseña debe contener al menos un número';
  return null;
}

function getValidationErrors(
  formData: FormData,
  editingUser: UserType | null,
  existingUsers: UserType[]
): string[] {
  const errors: string[] = [];

  if (!formData.name.trim()) errors.push('El nombre es requerido');
  if (!formData.email.trim()) errors.push('El email es requerido');
  if (!formData.username.trim()) errors.push('El nombre de usuario es requerido');
  if (!formData.cedula.trim()) errors.push('La cédula es requerida');
  if (!formData.employeeId.trim()) errors.push('El ID de empleado es requerido');
  if (!formData.department.trim()) errors.push('El departamento es requerido');
  if (!editingUser && !formData.password.trim()) errors.push('La contraseña es requerida para nuevos usuarios');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (formData.email.trim() && !emailRegex.test(formData.email)) {
    errors.push('El email no tiene un formato válido');
  }

  if (!editingUser && formData.password && validatePassword(formData.password)) {
    errors.push(validatePassword(formData.password)!);
  }

  if (!editingUser) {
    const existingUser = existingUsers.find(user =>
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
}

export function UserForm({
  formData,
  setFormData,
  editingUser,
  departments,
  showPassword,
  setShowPassword,
  showValidation,
  isLoading,
  onSubmit,
  onClose,
}: UserFormProps) {
  const { state } = useApp();
  const currentUser = state.auth.currentUser;
  const validationErrors = getValidationErrors(formData, editingUser, state.users);
  const isFormValid = validationErrors.length === 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Mostrar errores de validación solo cuando se intenta enviar */}
            {showValidation && validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <h4 className="text-sm font-medium text-red-800 mb-2">Errores de validación:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`input-field ${showValidation && !formData.name.trim() ? 'border-red-300 focus:border-red-500' : ''}`}
                placeholder="Nombre completo"
                required
              />
              {showValidation && !formData.name.trim() && (
                <p className="text-xs text-red-600 mt-1">El nombre es requerido</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className={`input-field ${!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? 'border-red-300 focus:border-red-500' : ''}`}
                placeholder="email@empresa.com"
                required
              />
              {!formData.email.trim() && (
                <p className="text-xs text-red-600 mt-1">El email es requerido</p>
              )}
              {formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                <p className="text-xs text-red-600 mt-1">El email no es válido</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de Usuario <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                className={`input-field ${!formData.username.trim() ? 'border-red-300 focus:border-red-500' : ''}`}
                placeholder="usuario"
                required
              />
              {!formData.username.trim() && (
                <p className="text-xs text-red-600 mt-1">El nombre de usuario es requerido</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Cédula <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.cedula}
                onChange={(e) => setFormData(prev => ({ ...prev, cedula: e.target.value }))}
                className={`input-field ${!formData.cedula.trim() ? 'border-red-300 focus:border-red-500' : ''}`}
                placeholder="12345678"
                required
              />
              {!formData.cedula.trim() && (
                <p className="text-xs text-red-600 mt-1">La cédula es requerida</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID de Empleado <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.employeeId}
                onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                className={`input-field ${!formData.employeeId.trim() ? 'border-red-300 focus:border-red-500' : ''}`}
                placeholder="EMP001"
                required
              />
              {!formData.employeeId.trim() && (
                <p className="text-xs text-red-600 mt-1">El ID de empleado es requerido</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {editingUser ? (
                  'Nueva Contraseña (dejar en blanco para mantener)'
                ) : (
                  <>
                    Contraseña <span className="text-red-500">*</span>
                  </>
                )}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className={`input-field pr-10 ${!editingUser && !formData.password.trim() ? 'border-red-300 focus:border-red-500' : ''}`}
                  placeholder={editingUser ? 'Nueva contraseña' : 'Contraseña'}
                  required={!editingUser}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {!editingUser && !formData.password.trim() && (
                <p className="text-xs text-red-600 mt-1">La contraseña es requerida para nuevos usuarios</p>
              )}
              {formData.password && validatePassword(formData.password) && (
                <p className="text-xs text-danger-600 mt-1">
                  {validatePassword(formData.password)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'superadmin' | 'admin' | 'lider' | 'colaborador' }))}
                className="input-field"
                required
              >
                <option value="lider">Lider</option>
                <option value="admin">Administrador</option>
                <option value="colaborador">Colaborador</option>
                {/* Solo superadmin puede asignar rol de Super Admin */}
                {currentUser?.role === 'superadmin' && (
                  <option value="superadmin">Super Admin</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Departamento <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                className={`input-field ${showValidation && !formData.department.trim() ? 'border-red-300 focus:border-red-500' : ''}`}
                required
              >
                <option value="">Seleccione un departamento</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
              {showValidation && !formData.department.trim() && (
                <p className="text-xs text-red-600 mt-1">El departamento es requerido</p>
              )}
              {departments.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  No hay departamentos disponibles. Contacte al administrador para crear departamentos.
                </p>
              )}
              {departments.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Seleccione el departamento al que pertenece este usuario. Los departamentos se gestionan en el panel de administración.
                </p>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Usuario activo
              </label>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className={`btn-secondary flex-1 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading || !isFormValid}
                onClick={() => {
                  console.log('🔘 CLICK: Botón Crear Usuario clickeado');
                  console.log('🔍 Estado del formulario al hacer clic:', formData);
                  console.log('🔍 isFormValid:', isFormValid);
                  console.log('🔍 isLoading:', isLoading);
                }}
                className={`btn-success flex-1 ${
                  isLoading || !isFormValid ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Procesando...</span>
                  </span>
                ) : (
                  <span>{editingUser ? 'Actualizar' : 'Crear'} Usuario</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
