import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Building2, AlertCircle, Check, Mail, FileText } from 'lucide-react';
import { coworkingService } from '../services/api';
import { ContactFormsManagement } from './ContactFormsManagement';
import { BlogManagement } from './BlogManagement';

export function CoworkingManagement() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'hero' | 'features' | 'spaces' | 'benefits' | 'company' | 'mensajes' | 'blog'>('hero');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await coworkingService.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error cargando configuración:', error);
      setMessage({ type: 'error', text: 'Error al cargar la configuración' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('💾 CoworkingManagement: Guardando settings:', {
        hasSettings: !!settings,
        hasHomeContent: !!settings?.homeContent,
        hasSpaces: !!settings?.homeContent?.spaces,
        spacesCount: settings?.homeContent?.spaces?.length,
        spaces: settings?.homeContent?.spaces
      });
      await coworkingService.updateSettings(settings);
      setMessage({ type: 'success', text: 'Configuración guardada exitosamente' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error guardando configuración:', error);
      setMessage({ type: 'error', text: 'Error al guardar la configuración' });
    } finally {
      setSaving(false);
    }
  };

  const updateHero = (field: string, value: any) => {
    setSettings({
      ...settings,
      homeContent: {
        ...settings.homeContent,
        hero: {
          ...settings.homeContent.hero,
          [field]: value
        }
      }
    });
  };

  const updateHeroStats = (field: string, value: any) => {
    setSettings({
      ...settings,
      homeContent: {
        ...settings.homeContent,
        hero: {
          ...settings.homeContent.hero,
          stats: {
            ...settings.homeContent.hero.stats,
            [field]: value
          }
        }
      }
    });
  };

  const updateFeature = (index: number, field: string, value: string) => {
    const newFeatures = [...settings.homeContent.features];
    newFeatures[index] = {
      ...newFeatures[index],
      [field]: value
    };
    setSettings({
      ...settings,
      homeContent: {
        ...settings.homeContent,
        features: newFeatures
      }
    });
  };

  const addFeature = () => {
    setSettings({
      ...settings,
      homeContent: {
        ...settings.homeContent,
        features: [
          ...settings.homeContent.features,
          { icon: 'Star', title: 'Nueva Característica', description: 'Descripción de la característica' }
        ]
      }
    });
  };

  const removeFeature = (index: number) => {
    const newFeatures = settings.homeContent.features.filter((_: any, i: number) => i !== index);
    setSettings({
      ...settings,
      homeContent: {
        ...settings.homeContent,
        features: newFeatures
      }
    });
  };

  const updateSpace = (index: number, field: string, value: any) => {
    const newSpaces = [...settings.homeContent.spaces];
    newSpaces[index] = {
      ...newSpaces[index],
      [field]: value
    };
    setSettings({
      ...settings,
      homeContent: {
        ...settings.homeContent,
        spaces: newSpaces
      }
    });
  };

  const updateSpaceFeature = (spaceIndex: number, featureIndex: number, value: string) => {
    const newSpaces = [...settings.homeContent.spaces];
    const newFeatures = [...newSpaces[spaceIndex].features];
    newFeatures[featureIndex] = value;
    newSpaces[spaceIndex] = {
      ...newSpaces[spaceIndex],
      features: newFeatures
    };
    setSettings({
      ...settings,
      homeContent: {
        ...settings.homeContent,
        spaces: newSpaces
      }
    });
  };

  const addSpace = () => {
    setSettings({
      ...settings,
      homeContent: {
        ...settings.homeContent,
        spaces: [
          ...settings.homeContent.spaces,
          {
            name: 'Nuevo Espacio',
            capacity: '1-10 personas',
            priceFrom: '$50,000/mes',
            features: ['Característica 1', 'Característica 2'],
            image: '🏢'
          }
        ]
      }
    });
  };

  const removeSpace = (index: number) => {
    const newSpaces = settings.homeContent.spaces.filter((_: any, i: number) => i !== index);
    setSettings({
      ...settings,
      homeContent: {
        ...settings.homeContent,
        spaces: newSpaces
      }
    });
  };

  const updateBenefit = (index: number, value: string) => {
    const newBenefits = [...settings.homeContent.benefits];
    newBenefits[index] = value;
    setSettings({
      ...settings,
      homeContent: {
        ...settings.homeContent,
        benefits: newBenefits
      }
    });
  };

  const addBenefit = () => {
    setSettings({
      ...settings,
      homeContent: {
        ...settings.homeContent,
        benefits: [...settings.homeContent.benefits, 'Nuevo beneficio']
      }
    });
  };

  const removeBenefit = (index: number) => {
    const newBenefits = settings.homeContent.benefits.filter((_: any, i: number) => i !== index);
    setSettings({
      ...settings,
      homeContent: {
        ...settings.homeContent,
        benefits: newBenefits
      }
    });
  };

  const updateCompany = (field: string, value: string) => {
    setSettings({
      ...settings,
      company: {
        ...settings.company,
        [field]: value
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando configuración...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error al cargar la configuración</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Building2 className="h-7 w-7 mr-2 text-indigo-600" />
            Gestión de Coworking
          </h1>
          <p className="text-gray-600 mt-1">Administra el contenido de la página de inicio y configuración del coworking</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? (
            <Check className="h-5 w-5 mr-2" />
          ) : (
            <AlertCircle className="h-5 w-5 mr-2" />
          )}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {[
            { id: 'hero', label: 'Sección Hero' },
            { id: 'features', label: 'Características' },
            { id: 'spaces', label: 'Espacios' },
            { id: 'benefits', label: 'Beneficios' },
            { id: 'company', label: 'Compañía' },
            { id: 'mensajes', label: '📧 Mensajes' },
            { id: 'blog', label: '📝 Blog' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Hero Section */}
      {activeTab === 'hero' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Títulos y Descripción</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título Principal</label>
                <input
                  type="text"
                  value={settings.homeContent.hero.title}
                  onChange={(e) => updateHero('title', e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo</label>
                <input
                  type="text"
                  value={settings.homeContent.hero.subtitle}
                  onChange={(e) => updateHero('subtitle', e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={settings.homeContent.hero.description}
                  onChange={(e) => updateHero('description', e.target.value)}
                  rows={3}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Estadísticas</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reservas Activas</label>
                <input
                  type="number"
                  value={settings.homeContent.hero.stats.activeReservations}
                  onChange={(e) => updateHeroStats('activeReservations', parseInt(e.target.value))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Satisfacción (%)</label>
                <input
                  type="number"
                  value={settings.homeContent.hero.stats.satisfaction}
                  onChange={(e) => updateHeroStats('satisfaction', parseInt(e.target.value))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Disponibilidad</label>
                <input
                  type="text"
                  value={settings.homeContent.hero.stats.availability}
                  onChange={(e) => updateHeroStats('availability', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features Section */}
      {activeTab === 'features' && (
        <div className="space-y-4">
          {settings.homeContent.features.map((feature: any, index: number) => (
            <div key={index} className="card">
              <div className="flex items-start justify-between mb-4">
                <h4 className="text-md font-semibold">Característica {index + 1}</h4>
                <button
                  onClick={() => removeFeature(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icono (nombre Lucide)</label>
                  <input
                    type="text"
                    value={feature.icon}
                    onChange={(e) => updateFeature(index, 'icon', e.target.value)}
                    className="input-field"
                    placeholder="Building2, Calendar, Users, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <input
                    type="text"
                    value={feature.title}
                    onChange={(e) => updateFeature(index, 'title', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={feature.description}
                    onChange={(e) => updateFeature(index, 'description', e.target.value)}
                    rows={2}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addFeature}
            className="btn-secondary w-full flex items-center justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Característica
          </button>
        </div>
      )}

      {/* Spaces Section */}
      {activeTab === 'spaces' && (
        <div className="space-y-4">
          {settings.homeContent.spaces.map((space: any, index: number) => (
            <div key={index} className="card">
              <div className="flex items-start justify-between mb-4">
                <h4 className="text-md font-semibold">Espacio {index + 1}</h4>
                <button
                  onClick={() => removeSpace(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input
                      type="text"
                      value={space.name}
                      onChange={(e) => updateSpace(index, 'name', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad</label>
                    <input
                      type="text"
                      value={space.capacity}
                      onChange={(e) => updateSpace(index, 'capacity', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio desde</label>
                    <input
                      type="text"
                      value={space.priceFrom || ''}
                      onChange={(e) => updateSpace(index, 'priceFrom', e.target.value)}
                      className="input-field"
                      placeholder="ej: $50,000/mes"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emoji</label>
                    <input
                      type="text"
                      value={space.image}
                      onChange={(e) => updateSpace(index, 'image', e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Características del Espacio</label>
                  {space.features.map((feat: string, featIndex: number) => (
                    <div key={featIndex} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={feat}
                        onChange={(e) => updateSpaceFeature(index, featIndex, e.target.value)}
                        className="input-field flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addSpace}
            className="btn-secondary w-full flex items-center justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Espacio
          </button>
        </div>
      )}

      {/* Benefits Section */}
      {activeTab === 'benefits' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Beneficios</h3>
            <div className="space-y-3">
              {settings.homeContent.benefits.map((benefit: string, index: number) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={benefit}
                    onChange={(e) => updateBenefit(index, e.target.value)}
                    className="input-field flex-1"
                  />
                  <button
                    onClick={() => removeBenefit(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addBenefit}
              className="btn-secondary w-full mt-4 flex items-center justify-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Beneficio
            </button>
          </div>
        </div>
      )}

      {/* Company Section */}
      {activeTab === 'company' && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Información de la Compañía</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Compañía</label>
              <input
                type="text"
                value={settings.company.name}
                onChange={(e) => updateCompany('name', e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={settings.company.description}
                onChange={(e) => updateCompany('description', e.target.value)}
                rows={2}
                className="input-field"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email de Contacto</label>
                <input
                  type="email"
                  value={settings.company.contactEmail}
                  onChange={(e) => updateCompany('contactEmail', e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={settings.company.phone}
                  onChange={(e) => updateCompany('phone', e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={settings.company.address}
                  onChange={(e) => updateCompany('address', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mensajes de Contacto Tab */}
      {activeTab === 'mensajes' && (
        <ContactFormsManagement />
      )}

      {/* Blog Tab */}
      {activeTab === 'blog' && (
        <BlogManagement />
      )}
    </div>
  );
}
