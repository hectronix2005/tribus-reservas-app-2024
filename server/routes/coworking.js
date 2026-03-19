const router = require('express').Router();
const auth = require('../middleware/auth');
const CoworkingSettings = require('../models/CoworkingSettings');
const User = require('../models/User');

// ==================== COWORKING SETTINGS ENDPOINTS ====================

// GET - Obtener configuración del coworking (pública)
router.get('/', async (req, res) => {
  try {
    let settings = await CoworkingSettings.findOne();

    // Si no existe configuración, crear una por defecto
    if (!settings) {
      settings = new CoworkingSettings({
        homeContent: {
          hero: {
            title: 'Tu espacio de trabajo,',
            subtitle: 'cuando lo necesites',
            description: 'Reserva salas de reuniones, hot desks y espacios colaborativos de forma rápida y sencilla. Flexibilidad total para tu equipo.',
            stats: {
              activeReservations: 500,
              satisfaction: 98,
              availability: '24/7'
            }
          },
          features: [
            {
              icon: 'Building2',
              title: 'Espacios Flexibles',
              description: 'Salas de reuniones, hot desks y espacios colaborativos adaptados a tus necesidades'
            },
            {
              icon: 'Calendar',
              title: 'Reserva Inteligente',
              description: 'Sistema de reservas en tiempo real con disponibilidad instantánea'
            },
            {
              icon: 'Users',
              title: 'Colaboración',
              description: 'Gestiona equipos y colaboradores fácilmente en cada reserva'
            },
            {
              icon: 'Clock',
              title: '24/7 Disponible',
              description: 'Acceso flexible cuando lo necesites, adaptado a tu horario'
            }
          ],
          spaces: [
            {
              name: 'Salas de Reuniones',
              capacity: '4-12 personas',
              features: ['Pantalla 4K', 'Videoconferencia', 'Pizarra Digital'],
              image: '🏢'
            },
            {
              name: 'Hot Desk',
              capacity: '1-8 puestos',
              features: ['Escritorio Ergonómico', 'WiFi Alta Velocidad', 'Zonas Abiertas'],
              image: '💼'
            },
            {
              name: 'Espacios Colaborativos',
              capacity: '6-20 personas',
              features: ['Mobiliario Flexible', 'Zonas de Descanso', 'Cafetería'],
              image: '👥'
            }
          ],
          benefits: [
            'Sin compromisos a largo plazo',
            'Facturación transparente',
            'Soporte técnico incluido',
            'Ubicaciones estratégicas',
            'Networking empresarial',
            'Servicios de recepción'
          ]
        },
        company: {
          name: 'Tribus',
          description: 'Espacios de trabajo flexibles para equipos modernos'
        }
      });
      await settings.save();
    }

    res.json(settings);
  } catch (error) {
    console.error('Error obteniendo configuración de coworking:', error);
    res.status(500).json({ error: 'Error al obtener la configuración' });
  }
});

// PUT - Actualizar configuración del coworking (solo superadmin)
router.put('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado. Solo superadmins pueden modificar la configuración' });
    }

    console.log('📝 Request body recibido:', JSON.stringify(req.body, null, 2));

    // Buscar o crear configuración
    let settings = await CoworkingSettings.findOne();

    if (!settings) {
      settings = new CoworkingSettings(req.body);
      settings.updatedBy = user._id;
      await settings.save();
    } else {
      // Actualizar campos - IMPORTANTE: marcar como modificado para Mongoose
      if (req.body.homeContent) {
        settings.homeContent = req.body.homeContent;
        settings.markModified('homeContent');
        console.log('✅ homeContent actualizado:', JSON.stringify(req.body.homeContent.spaces, null, 2));
      }
      if (req.body.company) {
        settings.company = req.body.company;
        settings.markModified('company');
      }
      if (req.body.contactForm) {
        settings.contactForm = req.body.contactForm;
        settings.markModified('contactForm');
      }
      settings.updatedAt = Date.now();
      settings.updatedBy = user._id;
      await settings.save();
    }

    res.json({
      message: 'Configuración actualizada exitosamente',
      settings
    });
  } catch (error) {
    console.error('Error actualizando configuración de coworking:', error);
    res.status(500).json({ error: 'Error al actualizar la configuración' });
  }
});

module.exports = router;
