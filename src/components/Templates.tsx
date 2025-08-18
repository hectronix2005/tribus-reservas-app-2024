import React, { useState } from 'react';
import { FileText, Plus, Edit, Trash2, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ReservationTemplate } from '../types';
import { getCurrentDateString } from '../utils/dateUtils';

export function Templates() {
  const { state, dispatch } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReservationTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    groupName: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingTemplate) {
      // Update existing template
      const updatedTemplate: ReservationTemplate = {
        ...editingTemplate,
        name: formData.name,
        description: formData.description,
        groupName: formData.groupName,
        contactPerson: formData.contactPerson,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        notes: formData.notes
      };
      dispatch({ type: 'UPDATE_TEMPLATE', payload: updatedTemplate });
    } else {
      // Create new template
      const newTemplate: ReservationTemplate = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        groupName: formData.groupName,
        contactPerson: formData.contactPerson,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        notes: formData.notes,
        isActive: true,
        createdAt: getCurrentDateString()
      };
      dispatch({ type: 'ADD_TEMPLATE', payload: newTemplate });
    }

    // Reset form
    setFormData({
      name: '',
      description: '',
      groupName: '',
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
      notes: ''
    });
    setShowForm(false);
    setEditingTemplate(null);
  };

  const handleEdit = (template: ReservationTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      groupName: template.groupName,
      contactPerson: template.contactPerson,
      contactEmail: template.contactEmail,
      contactPhone: template.contactPhone,
      notes: template.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = (templateId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta plantilla? Esta acción no se puede deshacer.')) {
      dispatch({ type: 'DELETE_TEMPLATE', payload: templateId });
    }
  };

  const handleToggleActive = (template: ReservationTemplate) => {
    const updatedTemplate = { ...template, isActive: !template.isActive };
    dispatch({ type: 'UPDATE_TEMPLATE', payload: updatedTemplate });
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      description: '',
      groupName: '',
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
      notes: ''
    });
    setShowForm(false);
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plantillas de Reserva</h1>
          <p className="text-gray-600">Gestiona las plantillas para facilitar las reservas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Plantilla</span>
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {state.templates.map((template) => (
          <div key={template.id} className="card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-500">{template.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleToggleActive(template)}
                  className={`p-1 rounded transition-colors ${
                    template.isActive 
                      ? 'text-success-600 hover:text-success-700' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEdit(template)}
                  className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="p-1 text-gray-400 hover:text-danger-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Grupo:</span>
                <span className="font-medium">{template.groupName}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Contacto:</span>
                <span className="font-medium">{template.contactPerson}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium text-primary-600">{template.contactEmail}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Teléfono:</span>
                <span className="font-medium">{template.contactPhone}</span>
              </div>

              {template.notes && (
                <div className="text-sm">
                  <span className="text-gray-600">Notas:</span>
                  <p className="text-gray-900 mt-1">{template.notes}</p>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Estado:</span>
                <span className={`badge ${template.isActive ? 'badge-success' : 'badge-secondary'}`}>
                  {template.isActive ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
                </h3>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la Plantilla
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field"
                    placeholder="Ej: Equipo de Desarrollo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="input-field"
                    placeholder="Descripción de la plantilla..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Grupo/Área
                  </label>
                  <input
                    type="text"
                    value={formData.groupName}
                    onChange={(e) => setFormData(prev => ({ ...prev, groupName: e.target.value }))}
                    className="input-field"
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
                    onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                    className="input-field"
                    placeholder="Nombre completo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                    className="input-field"
                    placeholder="email@empresa.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                    className="input-field"
                    placeholder="+1234567890"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="input-field"
                    rows={3}
                    placeholder="Notas adicionales..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-success flex-1"
                  >
                    {editingTemplate ? 'Actualizar' : 'Crear'} Plantilla
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {state.templates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay plantillas configuradas</h3>
          <p className="text-gray-500 mb-6">
            Crea plantillas para facilitar el proceso de reservas.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            Crear Primera Plantilla
          </button>
        </div>
      )}
    </div>
  );
}
