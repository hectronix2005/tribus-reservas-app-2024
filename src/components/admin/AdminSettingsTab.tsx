import React, { useState, useEffect } from 'react';
import { Settings, Users, Calendar, Clock, Save, CheckCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { syncAdminSettings, getAdminSettings } from '../../services/adminService';

export function AdminSettingsTab() {
  const { state, dispatch } = useApp();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoadingSettings(true);
      try {
        const savedSettings = await getAdminSettings();
        dispatch({ type: 'SET_ADMIN_SETTINGS', payload: savedSettings });
        console.log('✅ Configuración cargada:', savedSettings);
      } catch (error) {
        console.error('❌ Error cargando configuración:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadSettings();
  }, [dispatch]);

  const handleSettingsUpdate = (settings: typeof state.adminSettings) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('⚙️ Configuración de admin actualizada:', {
        previousSettings: {
          officeDays: state.adminSettings.officeDays,
          officeHours: state.adminSettings.officeHours,
          businessHours: state.adminSettings.businessHours
        },
        newSettings: {
          officeDays: settings.officeDays,
          officeHours: settings.officeHours,
          businessHours: settings.businessHours
        },
        changes: {
          officeDaysChanged: JSON.stringify(state.adminSettings.officeDays) !== JSON.stringify(settings.officeDays),
          officeHoursChanged: JSON.stringify(state.adminSettings.officeHours) !== JSON.stringify(settings.officeHours),
          businessHoursChanged: JSON.stringify(state.adminSettings.businessHours) !== JSON.stringify(settings.businessHours)
        }
      });
    }

    dispatch({ type: 'SET_ADMIN_SETTINGS', payload: settings });
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      await syncAdminSettings(state.adminSettings);

      setSaveSuccess(true);

      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);

      console.log('✅ Configuración guardada exitosamente:', state.adminSettings);
    } catch (error) {
      console.error('❌ Error guardando configuración:', error);
      setSaveError('Error al guardar la configuración. Por favor, inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {isLoadingSettings && (
        <div className="card">
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">Cargando configuración...</span>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración del Sistema</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Días máximos para reservas anticipadas
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={state.adminSettings.maxReservationDays}
              onChange={(e) => handleSettingsUpdate({
                ...state.adminSettings,
                maxReservationDays: parseInt(e.target.value)
              })}
              className="input-field max-w-xs"
            />
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="allowSameDay"
              checked={state.adminSettings.allowSameDayReservations}
              onChange={(e) => handleSettingsUpdate({
                ...state.adminSettings,
                allowSameDayReservations: e.target.checked
              })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="allowSameDay" className="text-sm font-medium text-gray-700">
              Permitir reservas del mismo día
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="requireApproval"
              checked={state.adminSettings.requireApproval}
              onChange={(e) => handleSettingsUpdate({
                ...state.adminSettings,
                requireApproval: e.target.checked
              })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="requireApproval" className="text-sm font-medium text-gray-700">
              Requerir aprobación para nuevas reservas
            </label>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Horarios de Oficina</h4>

            {/* Días de apertura */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Días de apertura
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { key: 'monday', label: 'Lunes' },
                  { key: 'tuesday', label: 'Martes' },
                  { key: 'wednesday', label: 'Miércoles' },
                  { key: 'thursday', label: 'Jueves' },
                  { key: 'friday', label: 'Viernes' },
                  { key: 'saturday', label: 'Sábado' },
                  { key: 'sunday', label: 'Domingo' }
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={key}
                      checked={state.adminSettings.officeDays[key as keyof typeof state.adminSettings.officeDays]}
                      onChange={(e) => handleSettingsUpdate({
                        ...state.adminSettings,
                        officeDays: {
                          ...state.adminSettings.officeDays,
                          [key]: e.target.checked
                        }
                      })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor={key} className="text-sm text-gray-700">
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Horarios de oficina */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora de apertura
                </label>
                <input
                  type="time"
                  value={state.adminSettings.officeHours.start || ''}
                  onChange={(e) => handleSettingsUpdate({
                    ...state.adminSettings,
                    officeHours: {
                      ...state.adminSettings.officeHours,
                      start: e.target.value
                    }
                  })}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Horario actual: {state.adminSettings.officeHours.start}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora de cierre
                </label>
                <input
                  type="time"
                  value={state.adminSettings.officeHours.end || ''}
                  onChange={(e) => handleSettingsUpdate({
                    ...state.adminSettings,
                    officeHours: {
                      ...state.adminSettings.officeHours,
                      end: e.target.value
                    }
                  })}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Horario actual: {state.adminSettings.officeHours.end}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Configuración de Reservas</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora de inicio (reservas)
                </label>
                <input
                  type="time"
                  value={state.adminSettings.businessHours.start || ''}
                  onChange={(e) => handleSettingsUpdate({
                    ...state.adminSettings,
                    businessHours: {
                      ...state.adminSettings.businessHours,
                      start: e.target.value
                    }
                  })}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Horario actual: {state.adminSettings.businessHours.start}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora de fin (reservas)
                </label>
                <input
                  type="time"
                  value={state.adminSettings.businessHours.end || ''}
                  onChange={(e) => handleSettingsUpdate({
                    ...state.adminSettings,
                    businessHours: {
                      ...state.adminSettings.businessHours,
                      end: e.target.value
                    }
                  })}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Horario actual: {state.adminSettings.businessHours.end}
                </p>
              </div>
            </div>
          </div>

          {/* Botón de Guardar y Mensajes de Estado */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {saveSuccess && (
                  <div className="flex items-center space-x-2 text-success-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Configuración guardada exitosamente</span>
                  </div>
                )}
                {saveError && (
                  <div className="text-danger-600 text-sm">
                    {saveError}
                  </div>
                )}
              </div>
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className={`flex items-center space-x-2 px-6 py-2 rounded-md font-medium transition-colors duration-200 ${
                  isSaving
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
                }`}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Configuración</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas del Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Users className="w-8 h-8 text-primary-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{state.areas.length}</p>
            <p className="text-sm text-gray-600">Áreas configuradas</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Calendar className="w-8 h-8 text-success-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{state.reservations.length}</p>
            <p className="text-sm text-gray-600">Total de reservas</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Clock className="w-8 h-8 text-warning-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {state.reservations.filter(r => r.status === 'confirmed').length}
            </p>
            <p className="text-sm text-gray-600">Reservas confirmadas</p>
          </div>
        </div>
      </div>
    </div>
  );
}
