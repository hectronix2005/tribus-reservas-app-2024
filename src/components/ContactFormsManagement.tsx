import React, { useState, useEffect } from 'react';
import { Mail, Phone, User, Calendar, FileText, Check, X, Clock, Archive, Trash2, AlertCircle } from 'lucide-react';
import { contactFormsService } from '../services/api';

export function ContactFormsManagement() {
  const [contactForms, setContactForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadContactForms();
  }, [selectedStatus]);

  const loadContactForms = async () => {
    try {
      setLoading(true);
      const params = selectedStatus !== 'all' ? { status: selectedStatus } : {};
      const data = await contactFormsService.getAll(params);

      // Validar que la respuesta tenga la estructura esperada
      if (data && typeof data === 'object') {
        setContactForms(data.contactForms || []);
      } else {
        console.warn('Respuesta inesperada del servidor:', data);
        setContactForms([]);
      }
    } catch (error: any) {
      console.error('Error cargando formularios:', error);

      // Si es un error de autenticación (401/403), mostrar mensaje específico SIN cerrar sesión
      if (error.status === 401 || error.status === 403) {
        setMessage({
          type: 'error',
          text: 'No tienes permisos para ver los mensajes de contacto. Por favor contacta con el administrador.'
        });
        // Establecer array vacío para evitar errores de renderizado
        setContactForms([]);
      } else if (error.status === 404) {
        setMessage({ type: 'error', text: 'No se encontró el endpoint de formularios' });
        setContactForms([]);
      } else if (error.status >= 500) {
        setMessage({ type: 'error', text: 'Error del servidor. Por favor intenta más tarde.' });
        setContactForms([]);
      } else {
        setMessage({
          type: 'error',
          text: error.message || 'Error al cargar los formularios de contacto'
        });
        setContactForms([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (formId: string, newStatus: string) => {
    try {
      await contactFormsService.update(formId, { status: newStatus as any });
      setMessage({ type: 'success', text: 'Estado actualizado exitosamente' });
      loadContactForms();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error actualizando estado:', error);
      setMessage({ type: 'error', text: 'Error al actualizar el estado' });
    }
  };

  const handleAddNotes = async (formId: string) => {
    try {
      await contactFormsService.update(formId, { notes });
      setMessage({ type: 'success', text: 'Notas guardadas exitosamente' });
      setNotes('');
      setShowDetail(false);
      setSelectedForm(null);
      loadContactForms();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error guardando notas:', error);
      setMessage({ type: 'error', text: 'Error al guardar las notas' });
    }
  };

  const handleDelete = async (formId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este formulario?')) return;

    try {
      await contactFormsService.delete(formId);
      setMessage({ type: 'success', text: 'Formulario eliminado exitosamente' });
      loadContactForms();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error eliminando formulario:', error);
      setMessage({ type: 'error', text: 'Error al eliminar el formulario' });
    }
  };

  const openDetail = (form: any) => {
    setSelectedForm(form);
    setNotes(form.notes || '');
    setShowDetail(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      new: { label: 'Nuevo', className: 'bg-blue-100 text-blue-700', icon: Mail },
      contacted: { label: 'Contactado', className: 'bg-yellow-100 text-yellow-700', icon: Phone },
      in_progress: { label: 'En Progreso', className: 'bg-purple-100 text-purple-700', icon: Clock },
      completed: { label: 'Completado', className: 'bg-green-100 text-green-700', icon: Check },
      archived: { label: 'Archivado', className: 'bg-gray-100 text-gray-700', icon: Archive }
    };

    const config = statusConfig[status] || statusConfig.new;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && contactForms.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando formularios...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mensajes de Contacto</h2>
          <p className="text-gray-600 mt-1">Gestiona los formularios de contacto recibidos</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Total: {contactForms.length}</span>
        </div>
      </div>

      {/* Success/Error Messages */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'all', label: 'Todos' },
          { value: 'new', label: 'Nuevos' },
          { value: 'contacted', label: 'Contactados' },
          { value: 'in_progress', label: 'En Progreso' },
          { value: 'completed', label: 'Completados' },
          { value: 'archived', label: 'Archivados' }
        ].map(filter => (
          <button
            key={filter.value}
            onClick={() => setSelectedStatus(filter.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedStatus === filter.value
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Contact Forms List */}
      {contactForms.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No hay formularios de contacto</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {contactForms.map((form) => (
            <div key={form._id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{form.name}</h3>
                    {getStatusBadge(form.status)}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {form.email}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {form.countryCode} {form.phone}
                    </div>
                    {form.company && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {form.company}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {formatDate(form.createdAt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Message Preview */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700 line-clamp-3">{form.message}</p>
              </div>

              {/* Action Buttons - Todos los estados siempre disponibles */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => openDetail(form)}
                  className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <FileText className="w-4 h-4 inline mr-1" />
                  Ver Detalles
                </button>

                <button
                  onClick={() => handleUpdateStatus(form._id, 'new')}
                  disabled={form.status === 'new'}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Mail className="w-4 h-4 inline mr-1" />
                  Nuevo
                </button>

                <button
                  onClick={() => handleUpdateStatus(form._id, 'contacted')}
                  disabled={form.status === 'contacted'}
                  className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Phone className="w-4 h-4 inline mr-1" />
                  Contactado
                </button>

                <button
                  onClick={() => handleUpdateStatus(form._id, 'in_progress')}
                  disabled={form.status === 'in_progress'}
                  className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Clock className="w-4 h-4 inline mr-1" />
                  En Progreso
                </button>

                <button
                  onClick={() => handleUpdateStatus(form._id, 'completed')}
                  disabled={form.status === 'completed'}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4 inline mr-1" />
                  Completado
                </button>

                <button
                  onClick={() => handleUpdateStatus(form._id, 'archived')}
                  disabled={form.status === 'archived'}
                  className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Archive className="w-4 h-4 inline mr-1" />
                  Archivado
                </button>

                <button
                  onClick={() => handleDelete(form._id)}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 ml-auto"
                >
                  <Trash2 className="w-4 h-4 inline mr-1" />
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selectedForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedForm.name}</h3>
                  <p className="text-gray-600 mt-1">{selectedForm.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetail(false);
                    setSelectedForm(null);
                    setNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Estado</label>
                  <div className="mt-1">{getStatusBadge(selectedForm.status)}</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Teléfono</label>
                  <p className="mt-1 text-gray-900">{selectedForm.countryCode} {selectedForm.phone}</p>
                </div>

                {selectedForm.company && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Empresa</label>
                    <p className="mt-1 text-gray-900">{selectedForm.company}</p>
                  </div>
                )}

                {selectedForm.interestedIn && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Interesado en</label>
                    <p className="mt-1 text-gray-900">{selectedForm.interestedIn}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700">Fecha</label>
                  <p className="mt-1 text-gray-900">{formatDate(selectedForm.createdAt)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Mensaje</label>
                  <div className="mt-1 bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedForm.message}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Notas Internas</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={4}
                    placeholder="Agrega notas internas sobre este contacto..."
                  />
                </div>

                {/* Historial de Cambios */}
                {selectedForm.changeHistory && selectedForm.changeHistory.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Historial de Cambios</label>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                      <div className="space-y-3">
                        {selectedForm.changeHistory.slice().reverse().map((change: any, index: number) => (
                          <div key={index} className="border-l-4 border-primary-500 pl-3 py-2">
                            <p className="text-sm font-medium text-gray-900">{change.action}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              Por: <span className="font-medium">{change.changedBy?.userName || 'Usuario'}</span>
                              {change.changedBy?.userEmail && ` (${change.changedBy.userEmail})`}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(change.changedAt).toLocaleString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => handleAddNotes(selectedForm._id)}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Guardar Notas
                  </button>
                  <button
                    onClick={() => {
                      setShowDetail(false);
                      setSelectedForm(null);
                      setNotes('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
