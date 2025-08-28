const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const MONGODB_CONFIG = require('./mongodb-config');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de seguridad
app.use(helmet());
app.use(cors({
  origin: true, // Permitir todas las origenes para desarrollo
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 requests por ventana
});
app.use('/api/', limiter);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

// Conexión a MongoDB Atlas
mongoose.connect(MONGODB_CONFIG.uri, MONGODB_CONFIG.options)
.then(() => {
  console.log('✅ Conectado exitosamente a MongoDB Atlas');
  console.log(`🗄️  Base de datos: ${MONGODB_CONFIG.database.name}`);
  console.log(`🌐 Cluster: ${MONGODB_CONFIG.database.cluster}`);
  console.log(`☁️  Proveedor: ${MONGODB_CONFIG.database.provider}`);
})
.catch(err => {
  console.error('❌ Error conectando a MongoDB Atlas:', err.message);
  console.error('🔍 Verificar:');
  console.error('   - Conexión a internet');
  console.error('   - Credenciales de MongoDB Atlas');
  console.error('   - Configuración de red');
  process.exit(1); // Salir si no se puede conectar a la BD
});

// Modelo de Usuario
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  department: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Modelo de Reservación
const reservationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  userName: { 
    type: String, 
    required: true 
  },
  area: { 
    type: String, 
    required: true 
  },
  date: { 
    type: Date, 
    required: true 
  },
  startTime: { 
    type: String, 
    required: true 
  },
  endTime: { 
    type: String, 
    required: true 
  },
  // Nuevos campos para información del solicitante
  contactPerson: { 
    type: String, 
    required: true 
  },
  teamName: { 
    type: String, 
    required: true 
  },
  contactEmail: { 
    type: String, 
    required: true 
  },
  contactPhone: { 
    type: String, 
    required: true 
  },
  // Campo para plantilla (opcional)
  templateId: { 
    type: String, 
    default: null 
  },
  // Campo para cantidad de puestos solicitados
  requestedSeats: { 
    type: Number, 
    required: true, 
    default: 1 
  },
  status: { 
    type: String, 
    enum: ['active', 'cancelled', 'completed'], 
    default: 'active' 
  },
  notes: { 
    type: String, 
    default: '' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

const Reservation = mongoose.model('Reservation', reservationSchema);

// Modelo de Área
const areaSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  capacity: { type: Number, required: true },
  description: { type: String },
  color: { type: String, required: true },
  isMeetingRoom: { type: Boolean, default: false },
  isFullDayReservation: { type: Boolean, default: false }
});

const Area = mongoose.model('Area', areaSchema);

// Modelo de Template
const templateSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  groupName: { type: String, required: true },
  contactPerson: { type: String, required: true },
  contactEmail: { type: String, required: true },
  contactPhone: { type: String, required: true },
  notes: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: String, required: true }
});

const Template = mongoose.model('Template', templateSchema);

// Middleware de autenticación
const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tribus-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Endpoint de salud
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'TRIBUS Backend API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Endpoints para Áreas
app.get('/api/areas', async (req, res) => {
  try {
    const areas = await Area.find();
    res.json(areas);
  } catch (error) {
    console.error('Error obteniendo áreas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/areas/:id', async (req, res) => {
  try {
    const area = await Area.findById(req.params.id);
    if (!area) {
      return res.status(404).json({ error: 'Área no encontrada' });
    }
    res.json(area);
  } catch (error) {
    console.error('Error obteniendo área:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/areas', async (req, res) => {
  try {
    // Generar un ID único para el área
    const areaData = {
      ...req.body,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };
    
    const area = new Area(areaData);
    await area.save();
    res.status(201).json({ message: 'Área creada exitosamente', area });
  } catch (error) {
    console.error('Error creando área:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.put('/api/areas/:id', async (req, res) => {
  try {
    const area = await Area.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!area) {
      return res.status(404).json({ error: 'Área no encontrada' });
    }
    res.json({ message: 'Área actualizada exitosamente', area });
  } catch (error) {
    console.error('Error actualizando área:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.delete('/api/areas/:id', async (req, res) => {
  try {
    const area = await Area.findByIdAndDelete(req.params.id);
    if (!area) {
      return res.status(404).json({ error: 'Área no encontrada' });
    }
    res.json({ message: 'Área eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando área:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoints para Templates
app.get('/api/templates', async (req, res) => {
  try {
    const templates = await Template.find();
    res.json(templates);
  } catch (error) {
    console.error('Error obteniendo templates:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/templates/:id', async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template no encontrado' });
    }
    res.json(template);
  } catch (error) {
    console.error('Error obteniendo template:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/templates', async (req, res) => {
  try {
    // Generar un ID único para el template
    const templateData = {
      ...req.body,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    
    const template = new Template(templateData);
    await template.save();
    res.status(201).json({ message: 'Template creado exitosamente', template });
  } catch (error) {
    console.error('Error creando template:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.put('/api/templates/:id', async (req, res) => {
  try {
    const template = await Template.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!template) {
      return res.status(404).json({ error: 'Template no encontrado' });
    }
    res.json({ message: 'Template actualizado exitosamente', template });
  } catch (error) {
    console.error('Error actualizando template:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.delete('/api/templates/:id', async (req, res) => {
  try {
    const template = await Template.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template no encontrado' });
    }
    res.json({ message: 'Template eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando template:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para crear usuarios sin autenticación
app.post('/api/users/register', async (req, res) => {
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
      process.env.JWT_SECRET || 'tribus-secret-key',
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
app.post('/api/users/login', async (req, res) => {
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
      process.env.JWT_SECRET || 'tribus-secret-key',
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

// Endpoint para obtener todos los usuarios (sin autenticación para facilitar el desarrollo)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para obtener un usuario específico (sin autenticación para facilitar el desarrollo)
app.get('/api/users/:id', async (req, res) => {
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

// Endpoint para actualizar usuario (sin autenticación para facilitar el desarrollo)
app.put('/api/users/:id', async (req, res) => {
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

// Endpoint para eliminar usuario (sin autenticación para facilitar el desarrollo)
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { adminUserId } = req.body;

    // Verificar que se proporcionó el ID del admin
    if (!adminUserId) {
      return res.status(400).json({ error: 'ID del administrador requerido' });
    }

    // Verificar si el usuario que intenta eliminar es admin
    const adminUser = await User.findById(adminUserId);
    if (!adminUser) {
      return res.status(404).json({ error: 'Usuario administrador no encontrado' });
    }

    if (adminUser.role !== 'admin') {
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

// Endpoint para obtener perfil del usuario (requiere autenticación)
app.get('/api/users/profile', auth, async (req, res) => {
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

// ===== ENDPOINTS DE RESERVACIONES =====

// Obtener todas las reservaciones (sin autenticación para facilitar el desarrollo)
app.get('/api/reservations', async (req, res) => {
  try {
    const reservations = await Reservation.find().populate('userId', 'name username');
    res.json(reservations);
  } catch (error) {
    console.error('Error obteniendo reservaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener reservaciones de un usuario específico
app.get('/api/reservations/user/:userId', async (req, res) => {
  try {
    const reservations = await Reservation.find({ userId: req.params.userId })
      .populate('userId', 'name username');
    res.json(reservations);
  } catch (error) {
    console.error('Error obteniendo reservaciones del usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nueva reservación (sin autenticación para facilitar el desarrollo)
app.post('/api/reservations', async (req, res) => {
  try {
    const { 
      userId, 
      userName, 
      area, 
      date, 
      startTime, 
      endTime, 
      contactPerson,
      teamName,
      contactEmail,
      contactPhone,
      templateId,
      requestedSeats,
      notes 
    } = req.body;

    // Validar campos requeridos
    if (!userId || !userName || !area || !date || !startTime || !endTime || 
        !contactPerson || !teamName || !contactEmail || !contactPhone || !requestedSeats) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Validar que requestedSeats sea un número válido
    if (typeof requestedSeats !== 'number' || requestedSeats < 1) {
      return res.status(400).json({ error: 'La cantidad de puestos debe ser un número mayor a 0' });
    }

    // Verificar que el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que el área existe y obtener su capacidad
    const areaInfo = await Area.findOne({ name: area });
    if (!areaInfo) {
      return res.status(404).json({ error: 'Área no encontrada' });
    }

    // Verificar que la cantidad de puestos solicitados no exceda la capacidad del área
    if (requestedSeats > areaInfo.capacity) {
      return res.status(400).json({ 
        error: `La cantidad de puestos solicitados (${requestedSeats}) excede la capacidad del área (${areaInfo.capacity} puestos)` 
      });
    }

    // Verificar que no hay conflicto de horarios para la misma área y fecha
    let conflictingReservation;
    
    // Para el área de colaboración, verificar si ya existe una reserva para ese día completo
    if (area === 'Área de Colaboración') {
      conflictingReservation = await Reservation.findOne({
        area,
        date: new Date(date),
        status: 'active'
      });
      
      if (conflictingReservation) {
        return res.status(409).json({ 
          error: 'El Área de Colaboración ya está reservada para este día completo' 
        });
      }
    } else {
      // Para otras áreas, verificar conflictos de horarios específicos
      conflictingReservation = await Reservation.findOne({
        area,
        date: new Date(date),
        status: 'active',
        $or: [
          {
            startTime: { $lt: endTime },
            endTime: { $gt: startTime }
          }
        ]
      });
      
      if (conflictingReservation) {
        return res.status(409).json({ 
          error: 'Ya existe una reservación para este horario en esta área' 
        });
      }
    }

    // Crear la reservación
    const reservation = new Reservation({
      userId,
      userName,
      area,
      date: new Date(date),
      startTime,
      endTime,
      contactPerson,
      teamName,
      contactEmail,
      contactPhone,
      templateId: templateId || null,
      requestedSeats,
      notes: notes || ''
    });

    await reservation.save();

    // Retornar la reservación con datos del usuario
    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('userId', 'name username');

    res.status(201).json({
      message: 'Reservación creada exitosamente',
      reservation: populatedReservation
    });

  } catch (error) {
    console.error('Error creando reservación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar reservación (solo el creador o admin)
app.put('/api/reservations/:id', async (req, res) => {
  try {
    const { 
      userId, 
      userName, 
      area, 
      date, 
      startTime, 
      endTime, 
      contactPerson,
      teamName,
      contactEmail,
      contactPhone,
      templateId,
      requestedSeats,
      notes, 
      status 
    } = req.body;

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservación no encontrada' });
    }

    // Verificar permisos: solo el creador o un admin puede actualizar
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (reservation.userId.toString() !== userId && user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Solo el creador de la reservación o un administrador puede modificarla' 
      });
    }

    // Si se está actualizando requestedSeats, validar que no exceda la capacidad del área
    if (requestedSeats !== undefined) {
      if (typeof requestedSeats !== 'number' || requestedSeats < 1) {
        return res.status(400).json({ error: 'La cantidad de puestos debe ser un número mayor a 0' });
      }

      const areaInfo = await Area.findOne({ name: area || reservation.area });
      if (!areaInfo) {
        return res.status(404).json({ error: 'Área no encontrada' });
      }

      if (requestedSeats > areaInfo.capacity) {
        return res.status(400).json({ 
          error: `La cantidad de puestos solicitados (${requestedSeats}) excede la capacidad del área (${areaInfo.capacity} puestos)` 
        });
      }
    }

    // Actualizar campos
    if (userName) reservation.userName = userName;
    if (area) reservation.area = area;
    if (date) reservation.date = new Date(date);
    if (startTime) reservation.startTime = startTime;
    if (endTime) reservation.endTime = endTime;
    if (contactPerson) reservation.contactPerson = contactPerson;
    if (teamName) reservation.teamName = teamName;
    if (contactEmail) reservation.contactEmail = contactEmail;
    if (contactPhone) reservation.contactPhone = contactPhone;
    if (templateId !== undefined) reservation.templateId = templateId;
    if (requestedSeats !== undefined) reservation.requestedSeats = requestedSeats;
    if (notes !== undefined) reservation.notes = notes;
    if (status) reservation.status = status;
    
    reservation.updatedAt = new Date();

    await reservation.save();

    // Retornar la reservación actualizada
    const updatedReservation = await Reservation.findById(reservation._id)
      .populate('userId', 'name username');

    res.json({
      message: 'Reservación actualizada exitosamente',
      reservation: updatedReservation
    });

  } catch (error) {
    console.error('Error actualizando reservación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar reservación (solo el creador o admin)
app.delete('/api/reservations/:id', async (req, res) => {
  try {
    const { userId } = req.body;

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservación no encontrada' });
    }

    // Verificar permisos: solo el creador o un admin puede eliminar
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (reservation.userId.toString() !== userId && user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Solo el creador de la reservación o un administrador puede eliminarla' 
      });
    }

    await Reservation.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Reservación eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando reservación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Servir el frontend React para todas las demás rutas
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor TRIBUS ejecutándose en puerto ${PORT}`);
  console.log(`📊 API disponible en http://localhost:${PORT}/api`);
  console.log(`🌐 Frontend disponible en http://localhost:${PORT}`);
  console.log(`🗄️  Base de datos: MongoDB Atlas (remota)`);
  console.log(`🔒 Modo: Solo conexión remota a MongoDB Atlas`);
});
