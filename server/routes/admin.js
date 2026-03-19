const router = require('express').Router();
const AdminSettings = require('../models/AdminSettings');

// Endpoints para configuración de admin
// Obtener configuración de admin
router.get('/settings', async (req, res) => {
  try {
    // Buscar la configuración existente o crear una por defecto
    let settings = await AdminSettings.findOne();

    if (!settings) {
      // Crear configuración por defecto si no existe
      settings = new AdminSettings();
      await settings.save();
      console.log('✅ Configuración de admin creada por defecto');
    }

    res.json(settings);
  } catch (error) {
    console.error('Error obteniendo configuración de admin:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Guardar configuración de admin
router.post('/settings', async (req, res) => {
  try {
    const { officeDays, officeHours, businessHours } = req.body;

    // Buscar la configuración existente o crear una nueva
    let settings = await AdminSettings.findOne();

    if (!settings) {
      settings = new AdminSettings();
    }

    // Actualizar configuración
    if (officeDays) {
      settings.officeDays = {
        ...settings.officeDays,
        ...officeDays
      };
    }

    if (officeHours) {
      settings.officeHours = {
        ...settings.officeHours,
        ...officeHours
      };
    }

    if (businessHours) {
      settings.businessHours = {
        ...settings.businessHours,
        ...businessHours
      };
    }

    settings.updatedAt = new Date();
    await settings.save();

    console.log('✅ Configuración de admin guardada:', {
      officeDays: settings.officeDays,
      officeHours: settings.officeHours,
      businessHours: settings.businessHours
    });

    res.json({
      message: 'Configuración guardada exitosamente',
      settings
    });
  } catch (error) {
    console.error('Error guardando configuración de admin:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
