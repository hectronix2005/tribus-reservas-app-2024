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

// HTTP Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  console.log(`🌐 [${timestamp}] ${req.method} ${req.url}`);
  console.log(`📋 Headers:`, JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`📦 Body:`, JSON.stringify(req.body, null, 2));
  }
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`✅ [${timestamp}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Middleware
app.use(express.json());

// Solo servir archivos estáticos en producción
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
}

// MongoDB Query Logging
mongoose.set('debug', true);

// Conexión a MongoDB Atlas
mongoose.connect(MONGODB_CONFIG.uri, MONGODB_CONFIG.options)
.then(() => {
  console.log('✅ Conectado exitosamente a MongoDB Atlas');
  console.log(`🗄️  Base de datos: ${MONGODB_CONFIG.database.name}`);
  console.log(`🌐 Cluster: ${MONGODB_CONFIG.database.cluster}`);
  console.log(`☁️  Proveedor: ${MONGODB_CONFIG.database.provider}`);
  console.log('🔍 MongoDB Query Logging: ENABLED');
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
  role: { type: String, enum: ['admin', 'user', 'colaborador'], default: 'user' },
  department: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Modelo de Departamento
const departmentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  },
  description: { 
    type: String, 
    default: '' 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

const Department = mongoose.model('Department', departmentSchema);

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
  // Campo para registrar qué usuario creó la reserva (auditoría)
  createdBy: {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    userName: { 
      type: String, 
      required: true 
    },
    userEmail: { 
      type: String, 
      required: true 
    },
    userRole: { 
      type: String, 
      enum: ['admin', 'user', 'colaborador'], 
      required: true 
    }
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
    required: false 
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
  // Campo para colaboradores (usuarios que pueden ver esta reserva)
  colaboradores: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  attendees: [{
    type: String
  }], // Array de nombres de asistentes
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

// Modelo de Configuración de Admin
const adminSettingsSchema = new mongoose.Schema({
  officeDays: {
    monday: { type: Boolean, default: true },
    tuesday: { type: Boolean, default: true },
    wednesday: { type: Boolean, default: true },
    thursday: { type: Boolean, default: true },
    friday: { type: Boolean, default: true },
    saturday: { type: Boolean, default: false },
    sunday: { type: Boolean, default: false }
  },
  officeHours: {
    start: { type: String, default: '08:00' },
    end: { type: String, default: '18:00' }
  },
  businessHours: {
    start: { type: String, default: '08:00' },
    end: { type: String, default: '18:00' }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const AdminSettings = mongoose.model('AdminSettings', adminSettingsSchema);

// Modelo de Área
const areaSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  capacity: { type: Number, required: true },
  description: { type: String },
  color: { type: String, required: true },
  // Categoría del área: 'SALA' o 'HOT_DESK'
  category: { 
    type: String, 
    enum: ['SALA', 'HOT_DESK'], 
    required: true 
  },
  // Para SALAS: tiempo mínimo y máximo de reservación
  minReservationTime: { 
    type: Number, 
    default: 30 // 30 minutos mínimo para salas
  },
  maxReservationTime: { 
    type: Number, 
    default: 480 // 8 horas máximo para salas
  },
  // Para HOT DESK: horario de la oficina
  officeHours: {
    start: { type: String, default: '08:00' },
    end: { type: String, default: '18:00' }
  },
  // Campos legacy para compatibilidad
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
    const { name, capacity, description, color, category, minReservationTime, maxReservationTime, officeHours } = req.body;
    
    // Validar campos requeridos
    if (!name || !capacity || !color || !category) {
      return res.status(400).json({ error: 'Nombre, capacidad, color y categoría son requeridos' });
    }
    
    // Validar categoría
    if (!['SALA', 'HOT_DESK'].includes(category)) {
      return res.status(400).json({ error: 'Categoría debe ser SALA o HOT_DESK' });
    }
    
    // Validar capacidad
    if (capacity < 1) {
      return res.status(400).json({ error: 'La capacidad debe ser mayor a 0' });
    }
    
    // Configuraciones específicas por categoría
    let areaData = {
      name,
      capacity,
      description: description || '',
      color,
      category,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };
    
    if (category === 'SALA') {
      // Configuración para SALAS
      areaData = {
        ...areaData,
        minReservationTime: minReservationTime || 30, // 30 minutos mínimo
        maxReservationTime: maxReservationTime || 480, // 8 horas máximo
        isMeetingRoom: true,
        isFullDayReservation: false
      };
    } else if (category === 'HOT_DESK') {
      // Configuración para HOT DESK
      areaData = {
        ...areaData,
        officeHours: officeHours || { start: '08:00', end: '18:00' },
        isMeetingRoom: false,
        isFullDayReservation: true
      };
    }
    
    const area = new Area(areaData);
    await area.save();
    
    res.status(201).json({ 
      message: `Área ${category} creada exitosamente`, 
      area 
    });
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

// Endpoint para obtener disponibilidad de puestos en tiempo real
app.get('/api/areas/:id/availability', async (req, res) => {
  try {
    const { date } = req.query;
    const area = await Area.findById(req.params.id);
    
    if (!area) {
      return res.status(404).json({ error: 'Área no encontrada' });
    }
    
    if (!date) {
      return res.status(400).json({ error: 'Fecha requerida' });
    }
    
    if (area.category === 'HOT_DESK') {
      // Para HOT DESK: calcular puestos disponibles
      const existingReservations = await Reservation.find({
        area: area.name,
        date: new Date(date),
        status: 'active'
      });
      
      const totalReservedSeats = existingReservations.reduce((total, res) => total + res.requestedSeats, 0);
      const availableSeats = area.capacity - totalReservedSeats;
      
      res.json({
        area: area.name,
        category: area.category,
        totalCapacity: area.capacity,
        reservedSeats: totalReservedSeats,
        availableSeats: availableSeats,
        date: date,
        officeHours: area.officeHours
      });
    } else if (area.category === 'SALA') {
      // Para SALAS: verificar disponibilidad por horarios
      const existingReservations = await Reservation.find({
        area: area.name,
        date: new Date(date),
        status: 'active'
      });
      
      res.json({
        area: area.name,
        category: area.category,
        isAvailable: existingReservations.length === 0,
        existingReservations: existingReservations.map(r => ({
          startTime: r.startTime,
          endTime: r.endTime,
          userName: r.userName
        })),
        date: date,
        minReservationTime: area.minReservationTime,
        maxReservationTime: area.maxReservationTime
      });
    }
  } catch (error) {
    console.error('Error obteniendo disponibilidad:', error);
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

// Obtener todas las reservaciones (con filtros opcionales)
app.get('/api/reservations', async (req, res) => {
  try {
    const { startDate, endDate, area, status } = req.query;
    
    // Construir filtro
    let filter = {};
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.date.$lte = new Date(endDate);
      }
    }
    
    if (area) {
      filter.area = area;
    }
    
    if (status) {
      filter.status = status;
    }
    
    const reservations = await Reservation.find(filter)
      .populate('userId', 'name username')
      .sort({ date: 1, startTime: 1 });

    res.json(reservations);
  } catch (error) {
    console.error('Error obteniendo reservaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener reservaciones para colaboradores (solo las que incluyen al colaborador)
app.get('/api/reservations/colaborador/:colaboradorId', async (req, res) => {
  try {
    const { startDate, endDate, area, status } = req.query;
    const colaboradorId = req.params.colaboradorId;
    
    // Verificar que el colaborador existe y tiene el rol correcto
    const colaborador = await User.findById(colaboradorId);
    if (!colaborador || colaborador.role !== 'colaborador' || !colaborador.isActive) {
      return res.status(404).json({ error: 'Colaborador no encontrado o inactivo' });
    }
    
    // Construir filtro para reservas que incluyen a este colaborador
    let filter = {
      colaboradores: colaboradorId,
      status: 'active' // Solo reservas activas
    };
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.date.$lte = new Date(endDate);
      }
    }
    
    if (area) {
      filter.area = area;
    }
    
    if (status) {
      filter.status = status;
    }
    
    const reservations = await Reservation.find(filter)
      .populate('userId', 'name username')
      .populate('colaboradores', 'name username email')
      .sort({ date: 1, startTime: 1 });

    res.json(reservations);
  } catch (error) {
    console.error('Error obteniendo reservaciones del colaborador:', error);
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
      notes,
      colaboradores,
      attendees 
    } = req.body;

    // Validar campos requeridos básicos
    if (!userId || !userName || !area || !date || !startTime || !endTime || 
        !contactPerson || !teamName || !contactEmail) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Validar que la fecha y hora no estén en el pasado
    const now = new Date();
    const reservationDate = new Date(date);
    const [hours, minutes] = startTime.split(':').map(Number);
    reservationDate.setHours(hours, minutes, 0, 0);
    
    if (reservationDate < now) {
      return res.status(400).json({ 
        error: 'No se pueden hacer reservaciones en fechas y horarios pasados. Por favor, seleccione una fecha y hora futura.' 
      });
    }

    // Verificar que el área existe y obtener su información
    const areaInfo = await Area.findOne({ name: area });
    if (!areaInfo) {
      return res.status(404).json({ error: 'Área no encontrada' });
    }

    // Configurar requestedSeats según la categoría del área
    let finalRequestedSeats = parseInt(requestedSeats) || 1;
    
    if (areaInfo.category === 'SALA') {
      // Para SALAS: siempre usar la capacidad completa (no se pregunta cantidad de puestos)
      finalRequestedSeats = areaInfo.capacity;
    } else if (areaInfo.category === 'HOT_DESK') {
      // Para HOT DESK: validar que se proporcione requestedSeats
      if (!requestedSeats || isNaN(parseInt(requestedSeats)) || parseInt(requestedSeats) < 1) {
        return res.status(400).json({ error: 'Para HOT DESK, debe especificar la cantidad de puestos requeridos' });
      }
      finalRequestedSeats = parseInt(requestedSeats);
    }

    // Verificar que el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Validar colaboradores si se proporcionan
    let validColaboradores = [];
    if (colaboradores && Array.isArray(colaboradores) && colaboradores.length > 0) {
      // Verificar que todos los colaboradores existen y tienen rol 'colaborador'
      const colaboradorUsers = await User.find({ 
        _id: { $in: colaboradores },
        role: 'colaborador',
        isActive: true
      });
      
      if (colaboradorUsers.length !== colaboradores.length) {
        return res.status(400).json({ 
          error: 'Algunos colaboradores no existen o no tienen el rol correcto' 
        });
      }
      
      validColaboradores = colaboradores;
    }

    // Verificar que la cantidad de puestos solicitados no exceda la capacidad del área
    if (finalRequestedSeats > areaInfo.capacity) {
      return res.status(400).json({ 
        error: `La cantidad de puestos solicitados (${finalRequestedSeats}) excede la capacidad del área (${areaInfo.capacity} puestos)` 
      });
    }

    // Determinar tiempo máximo de reservación según el rol del usuario
    let maxReservationTimeMinutes;
    if (user.role === 'admin') {
      maxReservationTimeMinutes = 480; // 8 horas para administradores
    } else {
      maxReservationTimeMinutes = 180; // 3 horas para usuarios regulares
    }

    // Verificar que no hay conflicto de horarios según la categoría del área
    let conflictingReservation;
    
    if (areaInfo.category === 'SALA') {
      // Para SALAS: verificar conflictos de horarios específicos
      // También validar tiempo mínimo y máximo de reservación
      const startTimeMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
      const endTimeMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
      const reservationDuration = endTimeMinutes - startTimeMinutes;
      
      // Validar tiempo mínimo (30 minutos)
      if (reservationDuration < areaInfo.minReservationTime) {
        return res.status(400).json({ 
          error: `La reservación debe ser de al menos ${areaInfo.minReservationTime} minutos` 
        });
      }
      
      // Validar tiempo máximo según el rol del usuario
      if (reservationDuration > maxReservationTimeMinutes) {
        const maxHours = maxReservationTimeMinutes / 60;
        const userRole = user.role === 'admin' ? 'administrador' : 'usuario';
        return res.status(400).json({ 
          error: `Como ${userRole}, la reservación no puede exceder ${maxReservationTimeMinutes} minutos (${maxHours} horas)` 
        });
      }
      
      // Verificar conflictos de horarios
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
          error: 'Ya existe una reservación para este horario en esta sala' 
        });
      }
      
    } else if (areaInfo.category === 'HOT_DESK') {
      // Para HOT DESK: verificar disponibilidad de puestos para el día completo
      // Calcular puestos ya reservados para ese día
      const existingReservations = await Reservation.find({
        area,
        date: new Date(date),
        status: 'active'
      });
      
      const totalReservedSeats = existingReservations.reduce((total, res) => total + res.requestedSeats, 0);
      const availableSeats = areaInfo.capacity - totalReservedSeats;
      
      if (parseInt(requestedSeats) > availableSeats) {
        return res.status(409).json({ 
          error: `Solo hay ${availableSeats} puestos disponibles. Se solicitaron ${requestedSeats} puestos.` 
        });
      }
      
      // Para HOT DESK, la reservación debe ser para todo el día
      const officeStart = areaInfo.officeHours.start;
      const officeEnd = areaInfo.officeHours.end;
      
      if (startTime !== officeStart || endTime !== officeEnd) {
        return res.status(400).json({ 
          error: `Para HOT DESK, la reservación debe ser de ${officeStart} a ${officeEnd} (día completo)` 
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
      requestedSeats: finalRequestedSeats,
      notes: notes || '',
      colaboradores: validColaboradores,
      attendees: attendees || [],
      // Registrar información del usuario que crea la reserva
      createdBy: {
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role
      }
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
      status,
      colaboradores,
      attendees 
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

    // Validar que la fecha y hora no estén en el pasado (solo si se están actualizando)
    if (date && startTime) {
      const now = new Date();
      const reservationDate = new Date(date);
      const [hours, minutes] = startTime.split(':').map(Number);
      reservationDate.setHours(hours, minutes, 0, 0);
      
      if (reservationDate < now) {
        return res.status(400).json({ 
          error: 'No se pueden hacer reservaciones en fechas y horarios pasados. Por favor, seleccione una fecha y hora futura.' 
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
    if (attendees !== undefined) reservation.attendees = attendees;
    
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

// Endpoints para configuración de admin
// Obtener configuración de admin
app.get('/api/admin/settings', async (req, res) => {
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
app.post('/api/admin/settings', async (req, res) => {
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

// ==================== ENDPOINTS DE DEPARTAMENTOS ====================

// Obtener todos los departamentos activos
app.get('/api/departments', async (req, res) => {
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

// Obtener todos los departamentos (incluyendo inactivos) - solo para admin/user
app.get('/api/departments/all', async (req, res) => {
  try {
    const { userId, userRole } = req.query;

    // Verificar que el usuario tenga permisos (admin o user)
    if (!userId || (userRole !== 'admin' && userRole !== 'user')) {
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

// Crear nuevo departamento - solo para admin/user
app.post('/api/departments', async (req, res) => {
  try {
    const { name, description, userId, userRole } = req.body;

    // Verificar que el usuario tenga permisos (admin o user)
    if (!userId || (userRole !== 'admin' && userRole !== 'user')) {
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

// Actualizar departamento - solo para admin/user
app.put('/api/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive, userId, userRole } = req.body;

    // Verificar que el usuario tenga permisos (admin o user)
    if (!userId || (userRole !== 'admin' && userRole !== 'user')) {
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

// Eliminar departamento (marcar como inactivo) - solo para admin/user
app.delete('/api/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userRole } = req.query;

    // Verificar que el usuario tenga permisos (admin o user)
    if (!userId || (userRole !== 'admin' && userRole !== 'user')) {
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

// Servir archivos estáticos de React en desarrollo
if (process.env.NODE_ENV === 'development') {
  // En desarrollo, el servidor de React maneja los archivos estáticos
  // Solo servir la API
  app.get('*', (req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });
} else {
  // En producción, servir archivos estáticos de React
  app.use(express.static(path.join(__dirname, 'build')));
  
  // Servir el frontend React para todas las demás rutas
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Servidor TRIBUS ejecutándose en puerto ${PORT}`);
  console.log(`📊 API disponible en /api`);
  console.log(`🌐 Frontend disponible en /`);
  console.log(`🗄️  Base de datos: MongoDB Atlas (remota)`);
  console.log(`🔒 Modo: Solo conexión remota a MongoDB Atlas`);
  console.log(`☁️  Desplegado en: Heroku`);
});
