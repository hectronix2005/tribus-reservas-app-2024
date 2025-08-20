const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Endpoint para crear usuarios sin autenticación (para administradores)
router.post('/register', async (req, res) => {
  try {
    const { name, email, username, password, role, department, isActive } = req.body;

    // Validar campos requeridos
    if (!name || !email || !username || !password) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(409).json({ error: 'El email o nombre de usuario ya existe' });
    }

    // Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear el usuario
    const user = new User({
      name,
      email,
      username,
      password: hashedPassword,
      role: role || 'user',
      department: department || '',
      isActive: isActive !== undefined ? isActive : true
    });

    await user.save();

    // Crear token JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Retornar usuario sin contraseña
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      department: user.department,
      isActive: user.isActive,
      createdAt: user.createdAt
    };

    res.status(201).json({
      user: userResponse,
      token
    });

  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    // Buscar usuario por username o email
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      return res.status(401).json({ error: 'Usuario inactivo' });
    }

    // Crear token JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Actualizar último login
    user.lastLogin = new Date();
    await user.save();

    // Retornar usuario sin contraseña
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      department: user.department,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    };

    res.json({
      user: userResponse,
      token
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para obtener perfil del usuario (requiere autenticación)
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para obtener todos los usuarios (requiere autenticación de admin)
router.get('/', auth, async (req, res) => {
  try {
    // Verificar si el usuario es admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
    }

    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para obtener un usuario específico (requiere autenticación)
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para actualizar usuario (requiere autenticación)
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, email, username, password, role, department, isActive } = req.body;
    const updateData = { name, email, username, role, department, isActive };

    // Solo incluir password si se proporciona
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para eliminar usuario (requiere autenticación de admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Verificar si el usuario es admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
