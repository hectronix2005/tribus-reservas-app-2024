const router = require('express').Router();
const auth = require('../middleware/auth');
const ContactForm = require('../models/ContactForm');
const User = require('../models/User');
const emailService = require('../../services/emailService-improved');

// ==========================================
// ENDPOINTS DE FORMULARIOS DE CONTACTO
// ==========================================

// POST - Crear nuevo formulario de contacto (público, sin autenticación)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, countryCode, company, message, interestedIn } = req.body;

    // Validar campos requeridos
    if (!name || !email || !phone || !message) {
      return res.status(400).json({
        error: 'Campos requeridos faltantes',
        required: ['name', 'email', 'phone', 'message']
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Formato de email inválido' });
    }

    // Crear nuevo formulario de contacto
    const contactForm = new ContactForm({
      name,
      email,
      phone,
      countryCode: countryCode || '+57',
      company: company || '',
      message,
      interestedIn: interestedIn || 'otro',
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await contactForm.save();

    console.log(`✅ [${new Date().toISOString()}] Nuevo formulario de contacto recibido de: ${name} (${email})`);

    // Enviar notificaciones por email
    try {
      await emailService.sendContactFormNotification(contactForm);
    } catch (emailError) {
      // No fallar si el email falla, solo log
      console.error('⚠️  Error enviando emails de notificación:', emailError);
    }

    res.status(201).json({
      message: 'Formulario de contacto recibido exitosamente',
      contactForm: {
        _id: contactForm._id,
        name: contactForm.name,
        email: contactForm.email,
        createdAt: contactForm.createdAt
      }
    });
  } catch (error) {
    console.error('Error creando formulario de contacto:', error);
    res.status(500).json({ error: 'Error al procesar el formulario de contacto' });
  }
});

// GET - Obtener todos los formularios de contacto (requiere autenticación admin/superadmin)
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    }

    const { status, limit, offset } = req.query;

    // Construir filtro
    let filter = {};
    if (status) {
      filter.status = status;
    }

    // Obtener formularios con paginación
    const totalCount = await ContactForm.countDocuments(filter);
    const contactForms = await ContactForm.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) || 100)
      .skip(parseInt(offset) || 0)
      .populate('assignedTo', 'name email username');

    res.json({
      contactForms,
      totalCount,
      hasMore: totalCount > (parseInt(offset) || 0) + contactForms.length
    });
  } catch (error) {
    console.error('Error obteniendo formularios de contacto:', error);
    res.status(500).json({ error: 'Error al obtener los formularios' });
  }
});

// PUT - Actualizar estado de formulario de contacto (requiere autenticación admin/superadmin)
router.put('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    }

    const { id } = req.params;
    const { status, notes, assignedTo } = req.body;

    // Obtener el formulario actual para comparar cambios
    const currentForm = await ContactForm.findById(id);
    if (!currentForm) {
      return res.status(404).json({ error: 'Formulario de contacto no encontrado' });
    }

    const updateData = {
      updatedAt: new Date()
    };

    // Construir el historial de cambios
    const changes = [];
    const statusLabels = {
      'new': 'Nuevo',
      'contacted': 'Contactado',
      'in_progress': 'En Progreso',
      'completed': 'Completado',
      'archived': 'Archivado'
    };

    if (status && status !== currentForm.status) {
      updateData.status = status;
      changes.push({
        changedBy: {
          userId: user._id,
          userName: user.name,
          userEmail: user.email
        },
        changedAt: new Date(),
        changes: {
          field: 'status',
          oldValue: currentForm.status,
          newValue: status
        },
        action: `Estado cambiado de "${statusLabels[currentForm.status] || currentForm.status}" a "${statusLabels[status] || status}"`
      });
    }

    if (notes !== undefined && notes !== currentForm.notes) {
      updateData.notes = notes;
      changes.push({
        changedBy: {
          userId: user._id,
          userName: user.name,
          userEmail: user.email
        },
        changedAt: new Date(),
        changes: {
          field: 'notes',
          oldValue: currentForm.notes || '',
          newValue: notes
        },
        action: currentForm.notes ? 'Notas actualizadas' : 'Notas agregadas'
      });
    }

    if (assignedTo !== undefined && String(assignedTo) !== String(currentForm.assignedTo)) {
      updateData.assignedTo = assignedTo || null;
      changes.push({
        changedBy: {
          userId: user._id,
          userName: user.name,
          userEmail: user.email
        },
        changedAt: new Date(),
        changes: {
          field: 'assignedTo',
          oldValue: currentForm.assignedTo,
          newValue: assignedTo
        },
        action: assignedTo ? 'Asignado a usuario' : 'Asignación removida'
      });
    }

    // Agregar los cambios al historial
    if (changes.length > 0) {
      updateData.$push = { changeHistory: { $each: changes } };
    }

    const contactForm = await ContactForm.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('assignedTo', 'name email username');

    console.log(`✅ [${new Date().toISOString()}] Formulario ${id} actualizado por ${user.name} (${user.email}) - ${changes.length} cambios registrados`);

    res.json({
      message: 'Formulario actualizado exitosamente',
      contactForm
    });
  } catch (error) {
    console.error('Error actualizando formulario de contacto:', error);
    res.status(500).json({ error: 'Error al actualizar el formulario' });
  }
});

// DELETE - Eliminar formulario de contacto (requiere autenticación superadmin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado. Solo superadmin.' });
    }

    const { id } = req.params;
    const contactForm = await ContactForm.findByIdAndDelete(id);

    if (!contactForm) {
      return res.status(404).json({ error: 'Formulario de contacto no encontrado' });
    }

    console.log(`🗑️  [${new Date().toISOString()}] Formulario ${id} eliminado por ${user.name}`);

    res.json({
      message: 'Formulario eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando formulario de contacto:', error);
    res.status(500).json({ error: 'Error al eliminar el formulario' });
  }
});

module.exports = router;
