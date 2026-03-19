const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Department = require('../models/Department');
const User = require('../models/User');

// ==================== ENDPOINTS DE DEPARTAMENTOS ====================

// Obtener todos los departamentos activos
router.get('/', async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate('createdBy', 'name username')
      .sort({ name: 1 });

    res.json(departments);
  } catch (error) {
    console.error('Error obteniendo departamentos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener todos los departamentos (incluyendo inactivos) - solo para admin/superadmin/user
router.get('/all', async (req, res) => {
  try {
    const { userId, userRole } = req.query;

    // Verificar que el usuario tenga permisos (admin, superadmin o user)
    if (!userId || (userRole !== 'admin' && userRole !== 'superadmin' && userRole !== 'user')) {
      return res.status(403).json({ error: 'No tiene permisos para ver todos los departamentos' });
    }

    const departments = await Department.find()
      .populate('createdBy', 'name username')
      .sort({ name: 1 });

    res.json(departments);
  } catch (error) {
    console.error('Error obteniendo todos los departamentos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nuevo departamento - solo para admin/superadmin/user
router.post('/', async (req, res) => {
  try {
    const { name, description, userId, userRole } = req.body;

    // Verificar que el usuario tenga permisos (admin, superadmin o user)
    if (!userId || (userRole !== 'admin' && userRole !== 'superadmin' && userRole !== 'user')) {
      return res.status(403).json({ error: 'No tiene permisos para crear departamentos' });
    }

    // Validar campos requeridos
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre del departamento es requerido' });
    }

    // Verificar que el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que no exista un departamento con el mismo nombre
    const existingDepartment = await Department.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });

    if (existingDepartment) {
      return res.status(400).json({ error: 'Ya existe un departamento con ese nombre' });
    }

    const department = new Department({
      name: name.trim(),
      description: description || '',
      createdBy: userId
    });

    await department.save();
    await department.populate('createdBy', 'name username');

    res.status(201).json(department);
  } catch (error) {
    console.error('Error creando departamento:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'Ya existe un departamento con ese nombre' });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

// Actualizar departamento - solo para admin/superadmin/user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive, userId, userRole } = req.body;

    // Verificar que el usuario tenga permisos (admin, superadmin o user)
    if (!userId || (userRole !== 'admin' && userRole !== 'superadmin' && userRole !== 'user')) {
      return res.status(403).json({ error: 'No tiene permisos para editar departamentos' });
    }

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ error: 'Departamento no encontrado' });
    }

    // Validar campos requeridos
    if (name && !name.trim()) {
      return res.status(400).json({ error: 'El nombre del departamento es requerido' });
    }

    // Verificar que no exista otro departamento con el mismo nombre
    if (name && name.trim() !== department.name) {
      const existingDepartment = await Department.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        _id: { $ne: id }
      });

      if (existingDepartment) {
        return res.status(400).json({ error: 'Ya existe un departamento con ese nombre' });
      }
    }

    // Actualizar campos
    if (name) department.name = name.trim();
    if (description !== undefined) department.description = description;
    if (isActive !== undefined) department.isActive = isActive;
    department.updatedAt = new Date();

    await department.save();
    await department.populate('createdBy', 'name username');

    res.json(department);
  } catch (error) {
    console.error('Error actualizando departamento:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'Ya existe un departamento con ese nombre' });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

// Eliminar departamento (marcar como inactivo) - solo para admin/superadmin/user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userRole } = req.query;

    // Verificar que el usuario tenga permisos (admin, superadmin o user)
    if (!userId || (userRole !== 'admin' && userRole !== 'superadmin' && userRole !== 'user')) {
      return res.status(403).json({ error: 'No tiene permisos para eliminar departamentos' });
    }

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ error: 'Departamento no encontrado' });
    }

    // Verificar si hay usuarios asignados a este departamento
    const usersInDepartment = await User.find({ department: department.name, isActive: true });
    if (usersInDepartment.length > 0) {
      return res.status(400).json({
        error: `No se puede eliminar el departamento porque tiene ${usersInDepartment.length} usuario(s) asignado(s)`
      });
    }

    // Marcar como inactivo en lugar de eliminar
    department.isActive = false;
    department.updatedAt = new Date();
    await department.save();

    res.json({ message: 'Departamento eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando departamento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
