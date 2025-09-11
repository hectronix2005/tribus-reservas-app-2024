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
const PORT = process.env.PORT || 3001;

// Configuración de seguridad
app.use(helmet());
app.use(cors({
  origin: true, // Permitir todas las origenes para desarrollo
  credentials: true
}));

// Rate limiting - Configuración más permisiva para desarrollo
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por ventana (aumentado para desarrollo)
  message: {
    error: 'Demasiadas peticiones, intenta de nuevo más tarde',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
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
  cedula: { type: String, required: true, unique: true },
  role: { type: String, enum: ['admin', 'lider', 'colaborador'], default: 'lider' },
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
  // ID único legible para identificación fácil
  reservationId: {
    type: String,
    unique: true,
    required: true
  },
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
  teamName: { 
    type: String, 
    required: true 
  },
  // Campo para cantidad de puestos solicitados
  requestedSeats: { 
    type: Number, 
    required: true, 
    default: 1 
  },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled'], 
    default: 'confirmed' 
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
  },
  // Campo debug para análisis y troubleshooting
  debug: {
    type: mongoose.Schema.Types.Mixed,
    default: null
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
      const [year, month, day] = date.split('-').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const existingReservations = await Reservation.find({
        area: area.name,
        date: utcDate,
        status: 'confirmed'
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
      const [year, month, day] = date.split('-').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const existingReservations = await Reservation.find({
        area: area.name,
        date: utcDate,
        status: 'confirmed'
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


// Endpoint para crear usuarios sin autenticación
app.post('/api/users/register', async (req, res) => {
  try {
    const { name, email, username, password, cedula, role, department, isActive } = req.body;

    // Validar campos requeridos
    if (!name || !email || !username || !password || !cedula) {
      return res.status(400).json({ error: 'Todos los campos son requeridos, incluyendo la cédula' });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({
      $or: [{ email }, { username }, { cedula }]
    });

    if (existingUser) {
      return res.status(409).json({ error: 'El email, nombre de usuario o cédula ya existe' });
    }

    // Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear el usuario
    const userRole = role === 'user' ? 'lider' : (role || 'lider');
    if (role === 'user') {
      console.log('🔄 Rol convertido de "user" a "lider" para compatibilidad en creación');
    }
    
    const user = new User({
      name,
      email,
      username,
      password: hashedPassword,
      cedula,
      role: userRole,
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
      cedula: user.cedula,
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
      cedula: user.cedula,
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
    console.log('📋 Usuarios obtenidos:', users.map(u => ({
      id: u._id,
      name: u.name,
      cedula: u.cedula,
      cedulaType: typeof u.cedula
    })));
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
    const { name, email, username, password, cedula, role, department, isActive } = req.body;
    console.log('🔄 Actualizando usuario:', {
      id: req.params.id,
      receivedData: { name, email, username, cedula, role, department, isActive }
    });
    console.log('🔍 Cédula recibida en backend:', {
      cedula: cedula,
      cedulaType: typeof cedula,
      cedulaLength: cedula ? cedula.length : 0,
      cedulaTrimmed: cedula ? cedula.trim() : null
    });
    
    const updateData = { name, email, username, cedula, role, department, isActive };
    
    // Convertir rol 'user' a 'lider' para compatibilidad
    if (updateData.role === 'user') {
      updateData.role = 'lider';
      console.log('🔄 Rol convertido de "user" a "lider" para compatibilidad');
    }
    
    console.log('📝 Datos a actualizar:', updateData);

    // Validar que la cédula sea obligatoria
    if (!cedula || cedula.trim() === '') {
      return res.status(400).json({ error: 'La cédula es obligatoria' });
    }
    
    // Verificar si la cédula ya existe en otro usuario
    const existingUser = await User.findOne({ 
      cedula: cedula.trim(), 
      _id: { $ne: req.params.id } 
    });
    if (existingUser) {
      return res.status(409).json({ error: 'Ya existe un usuario con esa cédula' });
    }
    
    // Establecer la cédula
    updateData.cedula = cedula.trim();
    console.log('🔍 Cédula válida detectada:', cedula.trim());

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

    console.log('✅ Usuario actualizado en BD:', {
      id: user?._id,
      name: user?.name,
      cedula: user?.cedula,
      cedulaType: typeof user?.cedula,
      cedulaIsNull: user?.cedula === null,
      cedulaIsUndefined: user?.cedula === undefined
    });

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
        const [year, month, day] = startDate.split('-').map(Number);
        filter.date.$gte = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      }
      if (endDate) {
        const [year, month, day] = endDate.split('-').map(Number);
        filter.date.$lte = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
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
      status: 'confirmed' // Solo reservas confirmadas
    };
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const [year, month, day] = startDate.split('-').map(Number);
        filter.date.$gte = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      }
      if (endDate) {
        const [year, month, day] = endDate.split('-').map(Number);
        filter.date.$lte = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
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
      teamName,
      requestedSeats,
      notes,
      colaboradores,
      attendees 
    } = req.body;

    // Validar campos requeridos básicos
    if (!userId || !userName || !area || !date || !startTime || !endTime || 
        !teamName) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Validar que la fecha y hora no estén en el pasado usando UTC
    const currentNow = new Date();
    
    // Crear fecha de validación usando UTC para consistencia
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = startTime.split(':').map(Number);
    const validationDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
    
    if (validationDate < currentNow) {
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
      console.log('🔍 [DEBUG] Validando colaboradores:', {
        colaboradores,
        colaboradoresLength: colaboradores.length
      });
      
      // Verificar que todos los colaboradores existen y tienen rol 'admin', 'lider' o 'colaborador'
      const colaboradorUsers = await User.find({ 
        _id: { $in: colaboradores },
        role: { $in: ['admin', 'lider', 'colaborador'] },
        isActive: true
      });

      // Debug adicional: buscar todos los usuarios con esos IDs sin filtros
      const allUsersWithIds = await User.find({ 
        _id: { $in: colaboradores }
      });
      
      console.log('🔍 [DEBUG] Todos los usuarios con esos IDs:', {
        allUsersWithIds: allUsersWithIds.map(u => ({
          _id: u._id,
          name: u.name,
          role: u.role,
          isActive: u.isActive
        }))
      });
      
      console.log('🔍 [DEBUG] Usuarios encontrados:', {
        colaboradorUsers: colaboradorUsers.map(u => ({
          _id: u._id,
          name: u.name,
          role: u.role,
          isActive: u.isActive
        })),
        foundLength: colaboradorUsers.length,
        expectedLength: colaboradores.length
      });
      
      if (colaboradorUsers.length !== colaboradores.length) {
        console.log('❌ [ERROR] Colaboradores no válidos:', {
          expected: colaboradores.length,
          found: colaboradorUsers.length,
          missing: colaboradores.filter(id => 
            !colaboradorUsers.some(u => u._id.toString() === id.toString())
          )
        });
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
      const [year, month, day] = date.split('-').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      conflictingReservation = await Reservation.findOne({
        area,
        date: utcDate,
        status: 'confirmed',
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
      const [year, month, day] = date.split('-').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const existingReservations = await Reservation.find({
        area,
        date: utcDate,
        status: 'confirmed'
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


    // Crear la reservación usando el sistema unificado de fechas UTC
    let reservationDate;
    if (areaInfo.category === 'HOT_DESK') {
      // Para Hot Desk: fecha local -> UTC (inicio del día)
      const [resYear, resMonth, resDay] = date.split('-').map(Number);
      reservationDate = new Date(Date.UTC(resYear, resMonth - 1, resDay, 0, 0, 0, 0));
    } else {
      // Para Salas: fecha local + hora local -> UTC
      const [resYear, resMonth, resDay] = date.split('-').map(Number);
      const [hours, minutes] = startTime.split(':').map(Number);
      reservationDate = new Date(Date.UTC(resYear, resMonth - 1, resDay, hours, minutes, 0, 0));
    }

    // Generar ID único: RES-YYYYMMDD-HHMMSS-XXXX
    const currentTime = new Date();
    const resYear = currentTime.getFullYear();
    const currentMonth = String(currentTime.getMonth() + 1).padStart(2, '0');
    const currentDay = String(currentTime.getDate()).padStart(2, '0');
    const currentHours = String(currentTime.getHours()).padStart(2, '0');
    const currentMinutes = String(currentTime.getMinutes()).padStart(2, '0');
    const currentSeconds = String(currentTime.getSeconds()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const uniqueReservationId = `RES-${resYear}${currentMonth}${currentDay}-${currentHours}${currentMinutes}${currentSeconds}-${random}`;

    const reservation = new Reservation({
      reservationId: uniqueReservationId,
      userId,
      userName,
      area,
      date: reservationDate,
      startTime,
      endTime,
      teamName,
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
      },
      // Información debug detallada y completa
      debug: {
        // Información básica del sistema
        systemInfo: {
          createdAt: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          userAgent: req.headers['user-agent'] || 'Unknown',
          version: '2.0.0',
          serverTime: new Date().toISOString(),
          requestId: `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        },
        
        // Datos de entrada originales
        inputData: {
          raw: {
            userId,
            userName,
            area,
            date,
            startTime,
            endTime,
            teamName,
            requestedSeats,
            notes,
            colaboradores,
            attendees
          },
          processed: {
            finalRequestedSeats,
            validColaboradores,
            reservationDate: reservationDate.toISOString(),
            areaInfo: areaInfo
          }
        },
        
        // Información del usuario que crea la reserva
        userInfo: {
          creator: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            username: user.username,
            role: user.role,
            cedula: user.cedula || null
          },
          collaborators: validColaboradores.map(c => ({
            id: c._id || c,
            name: c.name || 'Usuario no encontrado',
            role: c.role || 'unknown'
          }))
        },
        
        // Procesamiento de fechas detallado
        dateProcessing: {
          original: {
            dateString: date,
            startTimeString: startTime,
            endTimeString: endTime
          },
          parsed: {
            year: year,
            month: month,
            day: day,
            hours: hours,
            minutes: minutes
          },
          utc: {
            reservationDate: reservationDate.toISOString(),
            localTime: new Date().toISOString(),
            utcOffset: -5, // Colombia UTC-5
            timezone: 'America/Bogota'
          },
          validation: {
            isOfficeDay: true,
            isWithinOfficeHours: true,
            isFutureDate: reservationDate > new Date(),
            dayOfWeek: reservationDate.getDay(),
            dayName: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][reservationDate.getDay()]
          }
        },
        
        // Información del área y capacidad
        areaInfo: {
          areaName: area,
          areaType: areaInfo?.type || 'unknown',
          capacity: areaInfo?.capacity || 0,
          requestedSeats: finalRequestedSeats,
          availableSeats: areaInfo?.capacity - finalRequestedSeats,
          utilizationRate: ((finalRequestedSeats / areaInfo?.capacity) * 100).toFixed(2) + '%'
        },
        
        // Validaciones realizadas
        validations: {
          requiredFields: {
            userId: !!userId,
            userName: !!userName,
            area: !!area,
            date: !!date,
            startTime: !!startTime,
            endTime: !!endTime,
            teamName: !!teamName
          },
          businessRules: {
            isOfficeDay: true,
            isWithinOfficeHours: true,
            hasValidColaboradores: validColaboradores.length > 0,
            hasValidSeats: finalRequestedSeats > 0,
            collaboratorsMatchSeats: validColaboradores.length === finalRequestedSeats,
            isFutureReservation: reservationDate > new Date()
          },
          capacityValidation: {
            requestedSeats: finalRequestedSeats,
            areaCapacity: areaInfo?.capacity || 0,
            hasEnoughCapacity: finalRequestedSeats <= (areaInfo?.capacity || 0),
            remainingCapacity: (areaInfo?.capacity || 0) - finalRequestedSeats
          }
        },
        
        // Información de la reserva generada
        reservationInfo: {
          reservationId: uniqueReservationId,
          duration: {
            startTime: startTime,
            endTime: endTime,
            durationMinutes: Math.abs(new Date(`2000-01-01T${endTime}`) - new Date(`2000-01-01T${startTime}`)) / (1000 * 60),
            durationHours: Math.abs(new Date(`2000-01-01T${endTime}`) - new Date(`2000-01-01T${startTime}`)) / (1000 * 60 * 60)
          },
          participants: {
            total: finalRequestedSeats,
            collaborators: validColaboradores.length,
            attendees: (attendees || []).length,
            creator: 1
          }
        },
        
        // Metadatos adicionales
        metadata: {
          ipAddress: req.ip || req.connection.remoteAddress,
          referer: req.headers.referer || 'Direct',
          acceptLanguage: req.headers['accept-language'] || 'Unknown',
          contentType: req.headers['content-type'] || 'Unknown',
          requestMethod: req.method,
          requestUrl: req.url,
          timestamp: Date.now()
        }
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
      teamName,
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
      const updateNow = new Date();
      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = startTime.split(':').map(Number);
      const reservationDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
      
      if (reservationDate < updateNow) {
        return res.status(400).json({ 
          error: 'No se pueden hacer reservaciones en fechas y horarios pasados. Por favor, seleccione una fecha y hora futura.' 
        });
      }
    }

    // Actualizar campos
    if (userName) reservation.userName = userName;
    if (area) reservation.area = area;
    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      reservation.date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    }
    if (startTime) reservation.startTime = startTime;
    if (endTime) reservation.endTime = endTime;
    if (teamName) reservation.teamName = teamName;
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

// Eliminar reservación (solo administradores)
app.delete('/api/reservations/:id', async (req, res) => {
  try {
    const { userId } = req.body;

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservación no encontrada' });
    }

    // Verificar permisos: solo administradores pueden eliminar
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Solo los administradores pueden eliminar reservaciones' 
      });
    }

    // Log detallado antes de eliminar
    console.log('🗑️ [BACKEND] ELIMINANDO RESERVACIÓN:', {
      timestamp: new Date().toISOString(),
      deletedBy: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        email: user.email
      },
      reservation: {
        id: reservation._id,
        area: reservation.area,
        date: reservation.date,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        teamName: reservation.teamName,
        requestedSeats: reservation.requestedSeats,
        status: reservation.status,
        createdAt: reservation.createdAt,
        updatedAt: reservation.updatedAt,
        createdBy: reservation.createdBy,
        colaboradores: reservation.colaboradores,
        attendees: reservation.attendees
      }
    });

    await Reservation.findByIdAndDelete(req.params.id);

    // Log de confirmación
    console.log('✅ [BACKEND] RESERVACIÓN ELIMINADA EXITOSAMENTE:', {
      timestamp: new Date().toISOString(),
      deletedBy: user.username,
      reservationId: reservation._id,
      area: reservation.area,
      date: reservation.date
    });

    res.json({
      message: 'Reservación eliminada exitosamente'
    });

  } catch (error) {
    console.error('❌ [BACKEND] Error eliminando reservación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar TODAS las reservaciones (solo para administradores)
app.delete('/api/reservations', async (req, res) => {
  try {
    const { userId } = req.body;

    // Verificar permisos: solo administradores pueden eliminar todas las reservaciones
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Solo los administradores pueden eliminar todas las reservaciones' 
      });
    }

    // Contar reservaciones antes de eliminar
    const countBefore = await Reservation.countDocuments();
    console.log('🗑️ [DELETE ALL] Eliminando todas las reservaciones:', {
      timestamp: new Date().toISOString(),
      deletedBy: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role
      },
      totalReservations: countBefore
    });

    if (countBefore === 0) {
      return res.json({ 
        message: 'No hay reservaciones para eliminar',
        deletedCount: 0
      });
    }

    // Eliminar todas las reservaciones
    const result = await Reservation.deleteMany({});
    
    console.log('✅ [DELETE ALL] Todas las reservaciones eliminadas:', {
      timestamp: new Date().toISOString(),
      deletedBy: user.username,
      deletedCount: result.deletedCount
    });

    res.json({ 
      message: 'Todas las reservaciones han sido eliminadas exitosamente',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('❌ [BACKEND] Error eliminando todas las reservaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para agregar debug básico a reservaciones existentes
app.post('/api/reservations/add-debug', async (req, res) => {
  try {
    // Buscar reservaciones sin debug
    const reservationsWithoutDebug = await Reservation.find({ 
      $or: [
        { debug: { $exists: false } },
        { debug: null }
      ]
    });

    console.log(`🔧 Encontradas ${reservationsWithoutDebug.length} reservaciones sin debug`);

    let updatedCount = 0;
    const errors = [];

    for (const reservation of reservationsWithoutDebug) {
      try {
        // Crear información debug básica
        const debugNow = new Date();
        const debugInfo = {
          // Información básica del sistema
          systemInfo: {
            createdAt: reservation.createdAt || debugNow.toISOString(),
            timezone: 'America/Bogota',
            userAgent: 'Migration Script',
            version: '1.0.0-migration',
            serverTime: debugNow.toISOString(),
            requestId: `MIG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          },
          
          // Datos de entrada (reconstruidos)
          inputData: {
            raw: {
              userId: reservation.userId,
              userName: reservation.userName,
              area: reservation.area,
              date: reservation.date,
              startTime: reservation.startTime,
              endTime: reservation.endTime,
              teamName: reservation.teamName,
              requestedSeats: reservation.requestedSeats,
              notes: reservation.notes || '',
              colaboradores: reservation.colaboradores || [],
              attendees: reservation.attendees || []
            },
            processed: {
              finalRequestedSeats: reservation.requestedSeats,
              validColaboradores: reservation.colaboradores || [],
              reservationDate: reservation.date,
              areaInfo: { name: reservation.area, capacity: 50 }
            }
          },
          
          // Información del usuario (reconstruida)
          userInfo: {
            creator: {
              id: typeof reservation.userId === 'string' ? reservation.userId : reservation.userId?._id || 'unknown',
              name: reservation.userName || 'Usuario Desconocido',
              email: 'unknown@tribus.com',
              username: 'unknown',
              role: 'unknown',
              cedula: null
            },
            collaborators: (reservation.colaboradores || []).map(c => ({
              id: c._id || c,
              name: c.name || c,
              role: 'colaborador'
            }))
          },
          
          // Procesamiento de fechas (reconstruido)
          dateProcessing: {
            original: {
              dateString: reservation.date,
              startTimeString: reservation.startTime,
              endTimeString: reservation.endTime
            },
            parsed: {
              year: new Date(reservation.date).getUTCFullYear(),
              month: new Date(reservation.date).getUTCMonth() + 1,
              day: new Date(reservation.date).getUTCDate(),
              hours: parseInt(reservation.startTime.split(':')[0]),
              minutes: parseInt(reservation.startTime.split(':')[1])
            },
            utc: {
              reservationDate: new Date(reservation.date).toISOString(),
              localTime: now.toISOString(),
              utcOffset: 0,
              timezone: 'UTC'
            },
            validation: {
              isOfficeDay: true,
              isWithinOfficeHours: true,
              isFutureDate: new Date(reservation.date) > new Date(),
              dayOfWeek: new Date(reservation.date).getUTCDay(),
              dayName: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date(reservation.date).getUTCDay()]
            }
          },
          
          // Información del área (reconstruida)
          areaInfo: {
            areaName: reservation.area,
            areaType: reservation.area === 'Hot Desk' ? 'HOT_DESK' : 'SALA',
            capacity: 50,
            requestedSeats: reservation.requestedSeats,
            availableSeats: 50 - reservation.requestedSeats,
            utilizationRate: ((reservation.requestedSeats / 50) * 100).toFixed(2) + '%'
          },
          
          // Validaciones (reconstruidas)
          validations: {
            requiredFields: {
              userId: !!reservation.userId,
              userName: !!reservation.userName,
              area: !!reservation.area,
              date: !!reservation.date,
              startTime: !!reservation.startTime,
              endTime: !!reservation.endTime,
              teamName: !!reservation.teamName
            },
            businessRules: {
              isOfficeDay: true,
              isWithinOfficeHours: true,
              hasValidColaboradores: (reservation.colaboradores || []).length > 0,
              hasValidSeats: reservation.requestedSeats > 0,
              collaboratorsMatchSeats: (reservation.colaboradores || []).length === reservation.requestedSeats,
              isFutureReservation: new Date(reservation.date) > new Date()
            },
            capacityValidation: {
              requestedSeats: reservation.requestedSeats,
              areaCapacity: 50,
              hasEnoughCapacity: reservation.requestedSeats <= 50,
              remainingCapacity: 50 - reservation.requestedSeats
            }
          },
          
          // Información de la reserva (reconstruida)
          reservationInfo: {
            reservationId: reservation.reservationId || reservation._id,
            duration: {
              startTime: reservation.startTime,
              endTime: reservation.endTime,
              durationMinutes: Math.abs(new Date(`2000-01-01T${reservation.endTime}`) - new Date(`2000-01-01T${reservation.startTime}`)) / (1000 * 60),
              durationHours: Math.abs(new Date(`2000-01-01T${reservation.endTime}`) - new Date(`2000-01-01T${reservation.startTime}`)) / (1000 * 60 * 60)
            },
            participants: {
              total: reservation.requestedSeats,
              collaborators: (reservation.colaboradores || []).length,
              attendees: (reservation.attendees || []).length,
              creator: 1
            }
          },
          
          // Metadatos (reconstruidos)
          metadata: {
            ipAddress: '127.0.0.1',
            referer: 'Migration Script',
            acceptLanguage: 'es-ES',
            contentType: 'application/json',
            requestMethod: 'POST',
            requestUrl: '/api/reservations',
            timestamp: Date.now()
          }
        };

        // Actualizar la reservación con debug
        await Reservation.updateOne(
          { _id: reservation._id },
          { $set: { debug: debugInfo } }
        );

        updatedCount++;
        console.log(`✅ Actualizada reservación ${reservation.reservationId || reservation._id}`);

      } catch (error) {
        console.error(`❌ Error actualizando reservación ${reservation._id}:`, error.message);
        errors.push({
          reservationId: reservation.reservationId || reservation._id,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Proceso completado. ${updatedCount} reservaciones actualizadas con debug básico.`,
      stats: {
        totalFound: reservationsWithoutDebug.length,
        updated: updatedCount,
        errors: errors.length
      },
      errors: errors
    });

  } catch (error) {
    console.error('Error en add-debug:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para actualizar reservaciones existentes con IDs únicos
app.post('/api/reservations/update-ids', async (req, res) => {
  try {
    const { userId } = req.body;

    // Verificar permisos: solo administradores pueden actualizar reservaciones
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Solo los administradores pueden actualizar reservaciones' 
      });
    }

    console.log('🔄 Actualizando reservaciones existentes con IDs únicos...');
    
    // Obtener todas las reservaciones que no tienen reservationId
    const reservationsWithoutId = await Reservation.find({ 
      reservationId: { $exists: false } 
    });
    
    console.log(`📊 Encontradas ${reservationsWithoutId.length} reservaciones sin ID único`);
    
    if (reservationsWithoutId.length === 0) {
      return res.json({ 
        message: 'Todas las reservaciones ya tienen ID único',
        updatedCount: 0
      });
    }
    
    // Actualizar cada reservación
    let updatedCount = 0;
    for (const reservation of reservationsWithoutId) {
      // Generar ID único basado en la fecha de creación
      const createdAt = new Date(reservation.createdAt);
      const createdYear = createdAt.getFullYear();
      const month = String(createdAt.getMonth() + 1).padStart(2, '0');
      const day = String(createdAt.getDate()).padStart(2, '0');
      const hours = String(createdAt.getHours()).padStart(2, '0');
      const minutes = String(createdAt.getMinutes()).padStart(2, '0');
      const seconds = String(createdAt.getSeconds()).padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const uniqueReservationId = `RES-${createdYear}${month}${day}-${hours}${minutes}${seconds}-${random}`;
      
      // Actualizar la reservación
      await Reservation.updateOne(
        { _id: reservation._id },
        { 
          $set: { 
            reservationId: uniqueReservationId,
            // También agregar información debug básica si no existe
            debug: reservation.debug || {
              createdAt: createdAt.toISOString(),
              timezone: 'America/Bogota',
              userAgent: 'Migration Script',
              version: '1.0.0',
              migrated: true
            }
          }
        }
      );
      
      updatedCount++;
      console.log(`✅ Actualizada reservación ${updatedCount}/${reservationsWithoutId.length}: ${uniqueReservationId}`);
    }
    
    console.log('🎉 ¡Actualización completada exitosamente!');
    
    res.json({ 
      message: `Se actualizaron ${updatedCount} reservaciones con IDs únicos`,
      updatedCount: updatedCount
    });
    
  } catch (error) {
    console.error('❌ Error actualizando reservaciones:', error);
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
