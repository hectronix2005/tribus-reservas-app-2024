import React, { useState } from 'react';
import { Building2, Plus, Edit, Trash2, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Area } from '../types';
import { areaService } from '../services/api';

export function Areas() {
  const { state, dispatch } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    capacity: 1,
    description: '',
    color: '#3b82f6',
    isMeetingRoom: false,
    isFullDayReservation: false
  });

  const colorOptions = [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingArea) {
        // Update existing area
        const updatedAreaData = {
          name: formData.name,
          capacity: formData.capacity,
          description: formData.description,
          color: formData.color,
          isMeetingRoom: formData.isMeetingRoom,
          isFullDayReservation: formData.isFullDayReservation
        };
        
        console.log('🔄 Actualizando área:', editingArea.id, updatedAreaData);
        const response = await areaService.updateArea(editingArea.id, updatedAreaData);
        console.log('✅ Área actualizada:', response);
        
        // Update local state with the response from backend
        const updatedArea: Area = {
          ...editingArea,
          ...response
        };
        dispatch({ type: 'UPDATE_AREA', payload: updatedArea });
      } else {
        // Create new area
        const newAreaData = {
          name: formData.name,
          capacity: formData.capacity,
          description: formData.description,
          color: formData.color,
          isMeetingRoom: formData.isMeetingRoom,
          isFullDayReservation: formData.isFullDayReservation
        };
        
        console.log('🔄 Creando nueva área:', newAreaData);
        const response = await areaService.createArea(newAreaData);
        console.log('✅ Área creada:', response);
        
        // Add to local state with the response from backend
        const newArea: Area = {
          ...response,
          id: response._id || response.id
        };
        dispatch({ type: 'ADD_AREA', payload: newArea });
      }

      // Reset form
      setFormData({
        name: '',
        capacity: 1,
        description: '',
        color: '#3b82f6',
        isMeetingRoom: false
      });
      setShowForm(false);
      setEditingArea(null);
    } catch (error) {
      console.error('❌ Error en operación de área:', error);
      alert('Error al guardar el área. Por favor, inténtalo de nuevo.');
    }
  };

  const handleEdit = (area: Area) => {
    setEditingArea(area);
    setFormData({
      name: area.name,
      capacity: area.capacity,
      description: area.description || '',
      color: area.color,
      isMeetingRoom: area.isMeetingRoom,
      isFullDayReservation: area.isFullDayReservation || false
    });
    setShowForm(true);
  };

  const handleDelete = async (areaId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta área? Esta acción no se puede deshacer.')) {
      try {
        console.log('🔄 Eliminando área:', areaId);
        await areaService.deleteArea(areaId);
        console.log('✅ Área eliminada:', areaId);
        
        // Remove from local state
        dispatch({ type: 'DELETE_AREA', payload: areaId });
      } catch (error) {
        console.error('❌ Error eliminando área:', error);
        alert('Error al eliminar el área. Por favor, inténtalo de nuevo.');
      }
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      capacity: 1,
      description: '',
      color: '#3b82f6',
      isMeetingRoom: false,
      isFullDayReservation: false
    });
    setShowForm(false);
    setEditingArea(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Áreas</h1>
          <p className="text-gray-600">Administra las áreas de trabajo y sus capacidades</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Área</span>
        </button>
      </div>

      {/* Areas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {state.areas.map((area) => {
          const reservationsCount = state.reservations.filter(
            r => r.areaId === area.id && r.status === 'confirmed'
          ).length;
          
          return (
            <div key={area.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: area.color }}
                  >
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{area.name}</h3>
                    <p className="text-sm text-gray-500">{area.description}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(area)}
                    className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(area.id)}
                    className="p-1 text-gray-400 hover:text-danger-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>Capacidad:</span>
                  </span>
                  <span className="font-medium">{area.capacity} {area.isMeetingRoom ? 'personas' : 'puestos'}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Tipo:</span>
                  <span className={`font-medium ${area.isMeetingRoom ? 'text-primary-600' : 'text-secondary-600'}`}>
                    {area.isMeetingRoom ? 'Sala de Juntas' : 'Área de Trabajo'}
                  </span>
                </div>

                {area.isFullDayReservation && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Reserva:</span>
                    <span className="font-medium text-orange-600">
                      Día completo
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Reservas activas:</span>
                  <span className="font-medium text-primary-600">{reservationsCount}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Color:</span>
                  <div 
                    className="w-4 h-4 rounded border border-gray-300"
                    style={{ backgroundColor: area.color }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingArea ? 'Editar Área' : 'Nueva Área'}
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
                    Nombre del Área
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field"
                    placeholder="Ej: Sala de Reuniones A"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacidad (puestos)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="input-field"
                    rows={3}
                    placeholder="Descripción del área..."
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isMeetingRoom"
                    checked={formData.isMeetingRoom}
                    onChange={(e) => setFormData(prev => ({ ...prev, isMeetingRoom: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="isMeetingRoom" className="text-sm font-medium text-gray-700">
                    Es una sala de juntas (se reserva completa)
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isFullDayReservation"
                    checked={formData.isFullDayReservation}
                    onChange={(e) => setFormData(prev => ({ ...prev, isFullDayReservation: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="isFullDayReservation" className="text-sm font-medium text-gray-700">
                    Se reserva por día completo (no por horas)
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color del Área
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${
                          formData.color === color 
                            ? 'border-gray-900 scale-110' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
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
                    {editingArea ? 'Actualizar' : 'Crear'} Área
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {state.areas.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay áreas configuradas</h3>
          <p className="text-gray-500 mb-6">
            Comienza creando las áreas de trabajo para poder gestionar las reservas.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            Crear Primera Área
          </button>
        </div>
      )}
    </div>
  );
}
