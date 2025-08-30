import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, FileText, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { templateService } from '../services/api';
import { ReservationTemplate } from '../types';

export function UserTemplates() {
  const { state, dispatch } = useApp();
  const currentUser = state.auth.currentUser;
  
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReservationTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    groupName: '',
    contactPerson: currentUser?.name || '',
    contactEmail: currentUser?.email || '',
    contactPhone: '',
    notes: ''
  });

  // Filtrar plantillas del usuario actual (múltiples criterios para mayor robustez)
  const userTemplates = state.templates.filter(template => {
    // Criterio principal: email de contacto coincide con el usuario actual
    const emailMatch = template.contactEmail === currentUser?.email;
    
    // Criterio secundario: si existe createdBy, verificar que coincida con el ID del usuario
    const createdByMatch = template.createdBy && template.createdBy === currentUser?.id;
    
    // Criterio terciario: si existe userId, verificar que coincida con el ID del usuario
    const userIdMatch = template.userId && template.userId === currentUser?.id;
    
    // Mostrar plantilla si coincide con cualquiera de los criterios
    const isUserTemplate = emailMatch || createdByMatch || userIdMatch;
    
    // Debug: Log para diagnosticar problemas de filtrado
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Filtrado de plantilla:', {
        templateName: template.name,
        templateEmail: template.contactEmail,
        templateCreatedBy: template.createdBy,
        templateUserId: template.userId,
        currentUserEmail: currentUser?.email,
        currentUserId: currentUser?.id,
        emailMatch,
        createdByMatch,
        userIdMatch,
        isUserTemplate
      });
    }
    
    return isUserTemplate;
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  // Actualizar formulario cuando cambie el usuario
  useEffect(() => {
    if (currentUser && !showForm) {
      setFormData(prev => ({
        ...prev,
        contactPerson: currentUser.name,
        contactEmail: currentUser.email
      }));
    }
  }, [currentUser, showForm]);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const templates = await templateService.getAllTemplates();
      dispatch({ type: 'SET_TEMPLATES', payload: templates });
    } catch (error) {
      console.error('Error cargando plantillas:', error);
      setError('Error al cargar las plantillas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('Usuario no autenticado');
      return;
    }

    // Validaciones
    if (!formData.name.trim()) {
      setError('El nombre de la plantilla es requerido');
      return;
    }

    if (!formData.groupName.trim()) {
      setError('El nombre del equipo es requerido');
      return;
    }

    if (!currentUser?.email) {
      setError('No se puede identificar tu email de contacto');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const templateData = {
        ...formData,
        contactPerson: formData.contactPerson || currentUser.name,
        contactEmail: currentUser.email, // Siempre usar el email del usuario logueado
        createdBy: currentUser.id, // Agregar el ID del usuario creador
        userId: currentUser.id, // Para compatibilidad
        isActive: true
      };

      if (editingTemplate) {
        // Actualizar plantilla existente
        await templateService.updateTemplate(editingTemplate.id, templateData);
        setSuccess('Plantilla actualizada exitosamente');
      } else {
        // Crear nueva plantilla
        await templateService.createTemplate(templateData);
        setSuccess('Plantilla creada exitosamente');
      }

      // Recargar plantillas
      await loadTemplates();
      
      // Limpiar formulario
      setFormData({
        name: '',
        description: '',
        groupName: '',
        contactPerson: currentUser?.name || '',
        contactEmail: currentUser?.email || '',
        contactPhone: '',
        notes: ''
      });
      
      setShowForm(false);
      setEditingTemplate(null);
      
      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error guardando plantilla:', error);
      setError('Error al guardar la plantilla');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (template: ReservationTemplate) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      groupName: template.groupName,
      contactPerson: template.contactPerson,
      contactEmail: currentUser?.email || '', // Siempre usar el email del usuario logueado
      contactPhone: template.contactPhone || '',
      notes: template.notes || ''
    });
    setEditingTemplate(template);
    setShowForm(true);
    setError(null);
  };

  const handleDelete = async (templateId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta plantilla?')) {
      return;
    }

    try {
      setIsLoading(true);
      await templateService.deleteTemplate(templateId);
      await loadTemplates();
      setSuccess('Plantilla eliminada exitosamente');
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Error eliminando plantilla:', error);
      setError('Error al eliminar la plantilla');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      description: '',
      groupName: '',
      contactPerson: currentUser?.name || '',
      contactEmail: currentUser?.email || '',
      contactPhone: '',
      notes: ''
    });
    setShowForm(false);
    setEditingTemplate(null);
    setError(null);
  };

  if (!currentUser) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">Usuario no autenticado</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Plantillas</h1>
          <p className="text-gray-600">Gestiona tus plantillas de reservación personalizadas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Plantilla</span>
        </button>
      </div>

      {/* Mensajes de Estado */}
      {success && (
        <div className="bg-success-50 border border-success-200 rounded-md p-4">
          <div className="flex items-center space-x-2 text-success-600">
            <span className="text-sm font-medium">{success}</span>
          </div>
        </div>
      )}
      {error && (
        <div className="bg-danger-50 border border-danger-200 rounded-md p-4">
          <div className="flex items-center space-x-2 text-danger-600">
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
            </h3>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la Plantilla *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ej: Reunión Semanal"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Equipo *
                </label>
                <input
                  type="text"
                  value={formData.groupName}
                  onChange={(e) => setFormData({...formData, groupName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ej: Equipo de Desarrollo"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Persona de Contacto
                </label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder={currentUser.name}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email de Contacto *
                </label>
                <input
                  type="email"
                  value={currentUser?.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                  placeholder="Tu email de contacto"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usando tu email de cuenta: {currentUser?.email}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono (opcional)
                </label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="+57 300 123 4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={3}
                placeholder="Descripción de la plantilla..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas Adicionales
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={2}
                placeholder="Notas adicionales para las reservaciones..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`flex items-center space-x-2 px-6 py-2 rounded-md font-medium transition-colors duration-200 ${
                  isLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{editingTemplate ? 'Actualizar' : 'Crear'} Plantilla</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Plantillas */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Mis Plantillas ({userTemplates.length})</h3>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">Cargando plantillas...</span>
            </div>
          </div>
                 ) : userTemplates.length === 0 ? (
           <div className="text-center py-8">
             <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
             <p className="text-gray-500">No tienes plantillas creadas</p>
             <p className="text-sm text-gray-400">Crea tu primera plantilla para facilitar tus reservaciones</p>
             {state.templates.length > 0 && (
               <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                 <p className="text-sm text-blue-700">
                   <strong>Nota:</strong> Se encontraron {state.templates.length} plantillas en el sistema, 
                   pero ninguna coincide con tu cuenta ({currentUser?.email}).
                 </p>
                 <p className="text-xs text-blue-600 mt-1">
                   Las plantillas se filtran por tu email de contacto o ID de usuario.
                 </p>
               </div>
             )}
           </div>
        ) : (
          <div className="space-y-4">
            {userTemplates.map((template) => (
              <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{template.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        template.isActive 
                          ? 'bg-success-100 text-success-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    
                    {template.description && (
                      <p className="text-gray-600 mb-2">{template.description}</p>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-500">
                      <div>
                        <span className="font-medium">Equipo:</span> {template.groupName}
                      </div>
                      <div>
                        <span className="font-medium">Contacto:</span> {template.contactPerson}
                      </div>
                      <div>
                        <span className="font-medium">Email:</span> {template.contactEmail}
                      </div>
                      {template.contactPhone && (
                        <div>
                          <span className="font-medium">Teléfono:</span> {template.contactPhone}
                        </div>
                      )}
                    </div>
                    
                                         {template.notes && (
                       <div className="mt-2 text-sm text-gray-500">
                         <span className="font-medium">Notas:</span> {template.notes}
                       </div>
                     )}
                     
                     <div className="mt-2 text-xs text-gray-400">
                       <span className="font-medium">Creada:</span> {new Date(template.createdAt).toLocaleDateString('es-ES', {
  timeZone: 'America/Bogota'
})}
                       {template.createdBy && template.createdBy === currentUser?.id && (
                         <span className="ml-2 text-primary-600">✓ Tu plantilla</span>
                       )}
                     </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                      title="Editar plantilla"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-2 text-gray-400 hover:text-danger-600 transition-colors"
                      title="Eliminar plantilla"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
