require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const MONGODB_CONFIG = require('./mongodb-config');
const emailService = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// CONFIGURACIÓN DE CLOUDINARY
// ============================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || 'demo',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'demo',
  secure: true
});

console.log('☁️ Cloudinary configurado:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? '✓ Configurado' : '⚠️ Usando demo',
  api_key: process.env.CLOUDINARY_API_KEY ? '✓ Configurado' : '⚠️ Usando demo',
  api_secret: process.env.CLOUDINARY_API_SECRET ? '✓ Configurado' : '⚠️ Usando demo'
});

// Enable trust proxy para manejar correctamente X-Forwarded-For en desarrollo
app.set('trust proxy', 1);

// Configuración de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://tribus-reservas-2024-6b783eae459c.herokuapp.com"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
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
  // Skip rate limiting para rutas públicas
  skip: (req) => {
    const publicPaths = ['/contact-forms'];
    return publicPaths.some(path => req.url === path && req.method === 'POST');
  }
});
app.use('/api/', limiter);

// HTTP Request Logging Middleware (solo en desarrollo)
app.use((req, res, next) => {
  const start = Date.now();

  // Solo loguear en desarrollo o para errores
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;

    // Solo loguear errores (4xx, 5xx) o en modo desarrollo
    if (isDevelopment || res.statusCode >= 400) {
      const timestamp = new Date().toISOString();
      const statusEmoji = res.statusCode >= 500 ? '❌' : res.statusCode >= 400 ? '⚠️' : '✅';
      console.log(`${statusEmoji} [${timestamp}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    }
  });

  next();
});

// Middleware
app.use(express.json());

// ============================================
// CONFIGURACIÓN DE MULTER PARA ARCHIVOS
// ============================================

// Configuración de almacenamiento en MEMORIA (no en disco)
// Los archivos se subirán directamente a Cloudinary
const storage = multer.memoryStorage();

// Filtro de tipos de archivo permitidos
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Imágenes
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    // Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Texto
    'text/plain',
    'text/csv',
    // Comprimidos
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Solo se permiten imágenes, documentos y archivos comprimidos.`), false);
  }
};

// Configurar multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  },
  fileFilter: fileFilter
});

// 🔐 Middleware de Seguridad de Aplicación
// Valida que todas las peticiones incluyan el token de seguridad correcto
const appSecurityMiddleware = (req, res, next) => {
  // TEMPORALMENTE DESHABILITADO PARA DESARROLLO
  // TODO: Re-habilitar cuando todos los endpoints estén usando el mismo header
  return next();

  /* CÓDIGO ORIGINAL - COMENTADO TEMPORALMENTE
  // Rutas públicas que no requieren el token de seguridad
  const publicRoutes = [
    { method: 'POST', path: '/contact-forms' } // Formulario de contacto público (sin /api porque el middleware ya está en /api)
  ];

  // Verificar si la ruta actual es pública
  const isPublicRoute = publicRoutes.some(
    route => req.method === route.method && req.url === route.path
  );

  if (isPublicRoute) {
    console.log(`✅ Ruta pública accedida: ${req.method} ${req.url}`);
    return next();
  }

  // Obtener el token del header X-App-Token
  const clientToken = req.headers['x-app-token'];
  const expectedToken = process.env.APP_SECURITY_TOKEN;

  // Si no hay token configurado, permitir acceso (para desarrollo inicial)
  if (!expectedToken) {
    console.warn('⚠️  APP_SECURITY_TOKEN no configurado. Sistema de seguridad deshabilitado.');
    return next();
  }

  // Validar que el cliente envió un token
  if (!clientToken) {
    console.log(`🚫 Petición bloqueada: ${req.method} ${req.url} - Token faltante`);
    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'Token de seguridad requerido'
    });
  }

  // Validar que el token sea correcto
  if (clientToken !== expectedToken) {
    console.log(`🚫 Petición bloqueada: ${req.method} ${req.url} - Token inválido`);
    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'Token de seguridad inválido'
    });
  }

  // Token válido, continuar con la petición
  next();
  */
};

// Aplicar middleware de seguridad a todas las rutas de la API
app.use('/api', appSecurityMiddleware);

// Solo servir archivos estáticos en producción
if (process.env.NODE_ENV === 'production') {
app.use(express.static(path.join(__dirname, 'build')));
}

// MongoDB Query Logging (solo en desarrollo)
mongoose.set('debug', process.env.NODE_ENV !== 'production');

// Conexión a MongoDB Atlas
mongoose.connect(MONGODB_CONFIG.uri, MONGODB_CONFIG.options)
.then(async () => {
  console.log('✅ Conectado exitosamente a MongoDB Atlas');
  console.log(`🗄️  Base de datos: ${MONGODB_CONFIG.database.name}`);
  console.log(`🌐 Cluster: ${MONGODB_CONFIG.database.cluster}`);

  // Inicializar servicio de email
  await emailService.initialize();
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
  employeeId: { type: String, required: true, unique: true },
  role: { type: String, enum: ['superadmin', 'admin', 'lider', 'colaborador'], default: 'lider' },
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

// Modelo de Configuración de Coworking
const coworkingSettingsSchema = new mongoose.Schema({
  homeContent: {
    hero: {
      title: { type: String, default: 'Tu espacio de trabajo,' },
      subtitle: { type: String, default: 'cuando lo necesites' },
      description: { type: String, default: 'Reserva salas de reuniones, hot desks y espacios colaborativos de forma rápida y sencilla. Flexibilidad total para tu equipo.' },
      stats: {
        activeReservations: { type: Number, default: 500 },
        satisfaction: { type: Number, default: 98 },
        availability: { type: String, default: '24/7' }
      }
    },
    features: [{
      icon: { type: String, required: true },
      title: { type: String, required: true },
      description: { type: String, required: true }
    }],
    spaces: [{
      name: { type: String, required: true },
      capacity: { type: String, required: true },
      priceFrom: { type: String },
      features: [{ type: String }],
      image: { type: String, required: true }
    }],
    benefits: [{ type: String }]
  },
  company: {
    name: { type: String, default: 'Tribus' },
    description: { type: String, default: 'Espacios de trabajo flexibles para equipos modernos' },
    contactEmail: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' }
  },
  contactForm: {
    enabled: { type: Boolean, default: true },
    title: { type: String, default: 'Contáctanos' },
    subtitle: { type: String, default: 'Hola, introduzca sus datos de contacto para empezar' },
    description: { type: String, default: 'Solo utilizaremos esta información para ponernos en contacto con usted en relación con productos y servicios' },
    successMessage: { type: String, default: '¡Gracias por contactarnos! Nos pondremos en contacto contigo pronto.' },
    fields: {
      name: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      phone: { type: Boolean, default: true },
      company: { type: Boolean, default: true },
      message: { type: Boolean, default: true },
      interestedIn: { type: Boolean, default: true }
    },
    interestedInOptions: [{
      label: { type: String },
      value: { type: String }
    }],
    privacyPolicyUrl: { type: String, default: '/privacy-policy' },
    buttonText: { type: String, default: 'Enviar' }
  },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const CoworkingSettings = mongoose.model('CoworkingSettings', coworkingSettingsSchema);

// Modelo de Formulario de Contacto
const contactFormSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  countryCode: {
    type: String,
    default: '+57' // Colombia por defecto
  },
  company: {
    type: String,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  interestedIn: {
    type: String,
    enum: ['hot_desk', 'sala_reunion', 'oficina_privada', 'otro'],
    default: 'otro'
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'in_progress', 'completed', 'archived'],
    default: 'new'
  },
  notes: {
    type: String // Notas internas del administrador
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Historial de cambios con auditoría completa
  changeHistory: [{
    changedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      userName: String,
      userEmail: String
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    changes: {
      field: String, // Campo que cambió (ej: 'status', 'notes', 'assignedTo')
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed
    },
    action: String // Descripción de la acción (ej: 'Estado cambiado de new a contacted')
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const ContactForm = mongoose.model('ContactForm', contactFormSchema);

// Modelo de Log de Eliminaciones
const deletionLogSchema = new mongoose.Schema({
  // Información de la reserva eliminada
  reservationId: {
    type: String,
    required: true
  },
  reservationData: {
    area: String,
    date: Date,
    startTime: String,
    endTime: String,
    teamName: String,
    requestedSeats: Number,
    status: String,
    createdBy: String,
    createdAt: Date,
    colaboradores: [String],
    attendees: [String]
  },
  // Información de quién eliminó
  deletedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: String,
    name: String,
    email: String,
    role: String
  },
  // Timestamp de eliminación
  deletedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  // Tipo de eliminación
  deletionType: {
    type: String,
    enum: ['single', 'bulk'],
    default: 'single'
  },
  // Razón (si admin/superadmin elimina reserva de otro)
  reason: {
    type: String,
    default: ''
  }
});

const DeletionLog = mongoose.model('DeletionLog', deletionLogSchema);

// Modelo de Blog Post
const blogPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  excerpt: {
    type: String,
    required: true,
    maxlength: 300
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true,
    default: 'Equipo Tribus'
  },
  category: {
    type: String,
    required: true,
    enum: ['Networking', 'Ahorro', 'Tecnología', 'Productividad', 'Emprendimiento', 'Coworking', 'Otro'],
    default: 'Coworking'
  },
  image: {
    type: String,
    default: '📝'
  },
  keywords: [{
    type: String,
    trim: true
  }],
  readTime: {
    type: String,
    default: '5 min'
  },
  published: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  },
  views: {
    type: Number,
    default: 0
  },
  createdBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: {
      type: String,
      required: true
    }
  },
  lastModifiedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    modifiedAt: Date
  }
}, {
  timestamps: true
});

// Índices para mejor rendimiento en búsquedas
blogPostSchema.index({ slug: 1 });
blogPostSchema.index({ published: 1, publishedAt: -1 });
blogPostSchema.index({ category: 1 });
blogPostSchema.index({ keywords: 1 });

const BlogPost = mongoose.model('BlogPost', blogPostSchema);

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
      enum: ['superadmin', 'admin', 'lider', 'colaborador'],
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
    enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'], 
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

// Middleware para actualizar automáticamente el estado de las reservaciones
reservationSchema.pre('save', function(next) {
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
  
  const reservationDate = this.date.toISOString().split('T')[0];
  const reservationStartTime = this.startTime;
  const reservationEndTime = this.endTime;
  
  // Si la reserva es para hoy
  if (reservationDate === today) {
    // Si el tiempo actual está entre startTime y endTime, marcar como 'active'
    if (currentTime >= reservationStartTime && currentTime <= reservationEndTime) {
      this.status = 'active';
    }
    // Si el tiempo actual es después de endTime, marcar como 'completed'
    else if (currentTime > reservationEndTime) {
      this.status = 'completed';
    }
    // Si el tiempo actual es antes de startTime, mantener como 'confirmed'
    else {
      this.status = 'confirmed';
    }
  }
  // Si la reserva es para una fecha pasada
  else if (reservationDate < today) {
    this.status = 'completed';
  }
  // Si la reserva es para una fecha futura
  else {
    this.status = 'confirmed';
  }
  
  // Actualizar updatedAt
  this.updatedAt = now;
  
  next();
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

// Schema para mensajes del sistema de chat
const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Opcional para mensajes broadcast
  },
  isBroadcast: {
    type: Boolean,
    default: false // true para mensajes enviados a @todos
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }], // Para trackear quién leyó los mensajes broadcast
  content: {
    type: String,
    required: false, // Ahora es opcional porque puede haber mensajes solo con archivos
    trim: true,
    maxlength: 5000
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String,
    url: String,
    cloudinary_id: String, // ID público de Cloudinary para gestión del archivo
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  delivered: {
    type: Boolean,
    default: true // Se marca como entregado inmediatamente al crear el mensaje
  },
  deliveredAt: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Índices para mejorar el rendimiento de las consultas
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, read: 1 });

const Message = mongoose.model('Message', messageSchema);


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
    const { name, capacity, description, color, category, minReservationTime, maxReservationTime, officeHours, userId, userRole } = req.body;

    // Verificar que solo superadmin pueda crear áreas
    if (!userId || userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Solo Super Admins pueden crear áreas' });
    }

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
    const { userId, userRole } = req.body;

    // Verificar que solo superadmin pueda editar áreas
    if (!userId || userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Solo Super Admins pueden editar áreas' });
    }

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
    const { userId, userRole } = req.query;

    // Verificar que solo superadmin pueda eliminar áreas
    if (!userId || userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Solo Super Admins pueden eliminar áreas' });
    }

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
    const { name, email, username, password, cedula, employeeId, role, department, isActive } = req.body;

    // Validar campos requeridos
    if (!name || !email || !username || !password || !cedula || !employeeId) {
      return res.status(400).json({ error: 'Todos los campos son requeridos, incluyendo la cédula y el ID de empleado' });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({
      $or: [{ email }, { username }, { cedula }, { employeeId }]
    });

    if (existingUser) {
      return res.status(409).json({ error: 'El email, nombre de usuario, cédula o ID de empleado ya existe' });
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
      employeeId,
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
    const { name, email, username, password, cedula, employeeId, role, department, isActive } = req.body;
    console.log('🔄 Actualizando usuario:', {
      id: req.params.id,
      receivedData: { name, email, username, cedula, employeeId, role, department, isActive }
    });

    const updateData = { name, email, username, cedula, employeeId, role, department, isActive };

    // Convertir rol 'user' a 'lider' para compatibilidad
    if (updateData.role === 'user') {
      updateData.role = 'lider';
    }

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

    // Verificar si el usuario que intenta eliminar es admin o superadmin
    const adminUser = await User.findById(adminUserId);
    if (!adminUser) {
      return res.status(404).json({ error: 'Usuario administrador no encontrado' });
    }

    if (adminUser.role !== 'admin' && adminUser.role !== 'superadmin') {
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
    
    // Obtener reservaciones
    let reservations = await Reservation.find(filter)
      .populate('userId', 'name username')
      .sort({ date: 1, startTime: 1 });

    // Actualizar estados automáticamente antes de devolver los datos
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
    
    for (const reservation of reservations) {
      const reservationDate = reservation.date.toISOString().split('T')[0];
      const reservationStartTime = reservation.startTime;
      const reservationEndTime = reservation.endTime;
      
      let newStatus = reservation.status;
      
      // Si la reserva es para hoy
      if (reservationDate === today) {
        // Si el tiempo actual está entre startTime y endTime, marcar como 'active'
        if (currentTime >= reservationStartTime && currentTime <= reservationEndTime) {
          newStatus = 'active';
        }
        // Si el tiempo actual es después de endTime, marcar como 'completed'
        else if (currentTime > reservationEndTime) {
          newStatus = 'completed';
        }
        // Si el tiempo actual es antes de startTime, mantener como 'confirmed'
        else {
          newStatus = 'confirmed';
        }
      }
      // Si la reserva es para una fecha pasada
      else if (reservationDate < today) {
        newStatus = 'completed';
      }
      // Si la reserva es para una fecha futura
      else {
        newStatus = 'confirmed';
      }
      
      // Solo actualizar si el estado cambió
      if (newStatus !== reservation.status) {
        reservation.status = newStatus;
        reservation.updatedAt = now;
        await reservation.save();
      }
    }

    res.json(reservations);
  } catch (error) {
    console.error('Error obteniendo reservaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para actualizar automáticamente el estado de todas las reservaciones
app.post('/api/reservations/update-status', async (req, res) => {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
    
    // Obtener todas las reservaciones que no estén canceladas
    const reservations = await Reservation.find({ 
      status: { $in: ['confirmed', 'active', 'completed'] } 
    });
    
    let updatedCount = 0;
    
    for (const reservation of reservations) {
      const reservationDate = reservation.date.toISOString().split('T')[0];
      const reservationStartTime = reservation.startTime;
      const reservationEndTime = reservation.endTime;
      
      let newStatus = reservation.status;
      
      // Si la reserva es para hoy
      if (reservationDate === today) {
        // Si el tiempo actual está entre startTime y endTime, marcar como 'active'
        if (currentTime >= reservationStartTime && currentTime <= reservationEndTime) {
          newStatus = 'active';
        }
        // Si el tiempo actual es después de endTime, marcar como 'completed'
        else if (currentTime > reservationEndTime) {
          newStatus = 'completed';
        }
        // Si el tiempo actual es antes de startTime, mantener como 'confirmed'
        else {
          newStatus = 'confirmed';
        }
      }
      // Si la reserva es para una fecha pasada
      else if (reservationDate < today) {
        newStatus = 'completed';
      }
      // Si la reserva es para una fecha futura
      else {
        newStatus = 'confirmed';
      }
      
      // Solo actualizar si el estado cambió
      if (newStatus !== reservation.status) {
        await Reservation.findByIdAndUpdate(reservation._id, {
          status: newStatus,
          updatedAt: now
        });
        updatedCount++;
      }
    }
    
    res.json({
      message: `Estados actualizados exitosamente`,
      updatedCount,
      totalReservations: reservations.length,
      currentTime,
      today
    });
    
  } catch (error) {
    console.error('Error actualizando estados de reservaciones:', error);
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
    console.log('🔍 [POST /api/reservations] Request body recibido:', JSON.stringify(req.body, null, 2));
    console.log('🔍 [POST /api/reservations] Tipo de req.body:', typeof req.body);
    console.log('🔍 [POST /api/reservations] ¿Es objeto vacío?:', Object.keys(req.body).length === 0);

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
      console.error('❌ Campos faltantes:', {
        userId: userId ? '✓' : '✗',
        userName: userName ? '✓' : '✗',
        area: area ? '✓' : '✗',
        date: date ? '✓' : '✗',
        startTime: startTime ? '✓' : '✗',
        endTime: endTime ? '✓' : '✗',
        teamName: teamName ? '✓' : '✗'
      });
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
      console.log('🔍 [DEBUG COLABORADORES] PASO 1 - Datos recibidos:', {
        colaboradores,
        count: colaboradores.length,
        type: typeof colaboradores,
        isArray: Array.isArray(colaboradores),
        elementos: colaboradores.map((id, idx) => ({
          index: idx,
          value: id,
          type: typeof id,
          length: id ? id.length : 'null'
        }))
      });

      // Primero, buscar TODOS los usuarios con esos IDs sin filtros
      console.log('🔍 [DEBUG COLABORADORES] PASO 2 - Buscando usuarios SIN filtros...');
      const allUsersWithIds = await User.find({
        _id: { $in: colaboradores }
      });

      console.log('🔍 [DEBUG COLABORADORES] PASO 3 - Usuarios encontrados SIN filtros:', {
        found: allUsersWithIds.length,
        users: allUsersWithIds.map(u => ({
          id: u._id.toString(),
          name: u.name,
          role: u.role,
          isActive: u.isActive
        }))
      });

      // Ahora buscar con filtros de rol y estado
      console.log('🔍 [DEBUG COLABORADORES] PASO 4 - Buscando usuarios CON filtros (role + isActive)...');
      const colaboradorUsers = await User.find({
        _id: { $in: colaboradores },
        role: { $in: ['admin', 'superadmin', 'lider', 'colaborador'] },
        isActive: true
      });

      console.log('🔍 [DEBUG COLABORADORES] PASO 5 - Usuarios encontrados CON filtros:', {
        found: colaboradorUsers.length,
        expected: colaboradores.length,
        users: colaboradorUsers.map(u => ({
          id: u._id.toString(),
          name: u.name,
          role: u.role,
          isActive: u.isActive
        }))
      });

      if (colaboradorUsers.length !== colaboradores.length) {
        // Identificar cuáles colaboradores faltan
        const foundIds = colaboradorUsers.map(u => u._id.toString());
        const missingIds = colaboradores.filter(id => !foundIds.includes(id));

        console.error('❌ [DEBUG COLABORADORES] PASO 6 - VALIDACIÓN FALLIDA:');
        console.error('  - IDs proporcionados:', colaboradores);
        console.error('  - IDs encontrados CON filtros:', foundIds);
        console.error('  - IDs faltantes:', missingIds);

        // Para cada ID faltante, buscar si existe en la DB y cuál es el problema
        for (const missingId of missingIds) {
          console.error(`  🔍 Investigando ID faltante: ${missingId}`);
          const userCheck = await User.findById(missingId);
          if (!userCheck) {
            console.error(`    ❌ Usuario NO EXISTE en la base de datos`);
          } else {
            console.error(`    ⚠️ Usuario EXISTE pero NO CUMPLE filtros:`, {
              id: userCheck._id.toString(),
              name: userCheck.name,
              role: userCheck.role,
              isActive: userCheck.isActive,
              problemas: [
                !['admin', 'superadmin', 'lider', 'colaborador'].includes(userCheck.role) ? `Rol inválido: ${userCheck.role}` : null,
                !userCheck.isActive ? 'Usuario inactivo' : null
              ].filter(Boolean)
            });
          }
        }

        return res.status(400).json({
          error: 'Algunos colaboradores no existen o no tienen el rol correcto',
          details: {
            provided: colaboradores.length,
            found: colaboradorUsers.length,
            missing: missingIds
          }
        });
      }

      validColaboradores = colaboradores;
      console.log('✅ [DEBUG COLABORADORES] PASO 7 - Todos los colaboradores son válidos');
    } else {
      console.log('ℹ️ [DEBUG COLABORADORES] No se proporcionaron colaboradores o el array está vacío');
    }

    // Verificar que la cantidad de puestos solicitados no exceda la capacidad del área
    if (finalRequestedSeats > areaInfo.capacity) {
      return res.status(400).json({ 
        error: `La cantidad de puestos solicitados (${finalRequestedSeats}) excede la capacidad del área (${areaInfo.capacity} puestos)` 
      });
    }

    // Determinar tiempo máximo de reservación según el rol del usuario
    let maxReservationTimeMinutes;
    if (user.role === 'admin' || user.role === 'superadmin') {
      maxReservationTimeMinutes = 480; // 8 horas para administradores y superadmins
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
        const userRole = (user.role === 'admin' || user.role === 'superadmin') ? 'administrador' : 'usuario';
        return res.status(400).json({
          error: `Como ${userRole}, la reservación no puede exceder ${maxReservationTimeMinutes} minutos (${maxHours} horas)`
        });
      }
      
      // Verificar conflictos de horarios
      const [year, month, day] = date.split('-').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      
      // Buscar reservas que se solapen con el horario solicitado
      console.log('🔍 Validando conflictos para SALA:', {
        area,
        date: utcDate.toISOString(),
        startTime,
        endTime,
        status: ['confirmed', 'active']
      });
      
      // Lógica correcta para detectar solapamientos:
      // Dos intervalos se solapan si: start1 < end2 AND start2 < end1
      conflictingReservation = await Reservation.findOne({
        area,
        date: utcDate,
        status: { $in: ['confirmed', 'active'] },
        $expr: {
          $and: [
            { $lt: ["$startTime", endTime] },    // La reserva existente empieza antes de que termine la nueva
            { $gt: ["$endTime", startTime] }     // La reserva existente termina después de que empiece la nueva
          ]
        }
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
        status: { $in: ['confirmed', 'active'] } // Incluir reservas activas también
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
      .populate('userId', 'name username')
      .populate('colaboradores', 'name email');

    // Enviar notificación por email
    try {
      console.log('📧 Iniciando envío de notificación por email...');
      console.log('   Colaboradores:', validColaboradores.length);

      const colaboradoresData = validColaboradores.length > 0
        ? await User.find({ _id: { $in: validColaboradores } }).select('name email')
        : [];

      console.log('   Datos de colaboradores obtenidos:', colaboradoresData.length);
      console.log('   Usuario creador:', user.email);

      // Agregar información del área para el email
      const reservationWithAreaInfo = {
        ...populatedReservation.toObject(),
        isMeetingRoom: areaInfo.isMeetingRoom
      };

      console.log('   Área:', reservationWithAreaInfo.area);
      console.log('   Es sala de reuniones:', areaInfo.isMeetingRoom);
      console.log('   Fecha:', reservationWithAreaInfo.date);

      // Preparar lista de emails para mostrar en debug
      const collaboratorEmails = colaboradoresData
        .map(c => c.email)
        .filter(email => email && email !== user.email);

      const allRecipients = [user.email, ...collaboratorEmails];

      console.log('📧 DESTINATARIOS DE EMAIL:');
      console.log('   👤 Creador:', user.email, `(${user.name})`);
      if (collaboratorEmails.length > 0) {
        console.log('   👥 Colaboradores:');
        colaboradoresData.forEach((collab, index) => {
          if (collab.email && collab.email !== user.email) {
            console.log(`      ${index + 1}. ${collab.email} (${collab.name})`);
          }
        });
      } else {
        console.log('   👥 Colaboradores: Ninguno');
      }
      console.log('   📨 Total de destinatarios:', allRecipients.length);
      console.log('   📋 Lista completa:', allRecipients.join(', '));
      console.log('   🔒 BCC (copia oculta): noreply.tribus@gmail.com');

      const emailResult = await emailService.sendReservationConfirmation(
        reservationWithAreaInfo,
        user,
        colaboradoresData
      );

      if (emailResult.success) {
        console.log('✅ Notificación por email enviada exitosamente');
        console.log('   Message ID:', emailResult.messageId);
        console.log('   Destinatarios confirmados:', emailResult.recipients);
      } else {
        console.log('⚠️  Email no enviado:', emailResult.reason);
      }
    } catch (emailError) {
      // Log error pero no fallar la creación de la reserva
      console.error('❌ Error enviando email de confirmación:', emailError.message);
      console.error('   Stack trace:', emailError.stack);
    }

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

    if (reservation.userId.toString() !== userId && user.role !== 'admin' && user.role !== 'superadmin') {
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

    // Verificar que solo se puedan eliminar reservas confirmadas
    if (reservation.status !== 'confirmed') {
      return res.status(400).json({
        error: 'Solo se pueden eliminar reservas con estado "confirmado". Estado actual: ' + reservation.status
      });
    }

    // Verificar permisos: solo administradores o el creador pueden eliminar
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Permitir eliminación si:
    // 1. El usuario es superadmin o admin O
    // 2. El usuario es el creador de la reservación
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    const isCreator = reservation.userId && reservation.userId.toString() === userId.toString();

    if (!isAdmin && !isCreator) {
      return res.status(403).json({
        error: 'No tienes permisos para eliminar esta reservación. Solo administradores y el creador pueden eliminarla.'
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

    // Obtener datos del creador y colaboradores antes de eliminar
    const reservationOwner = await User.findById(reservation.userId);
    const colaboradoresData = reservation.colaboradores && reservation.colaboradores.length > 0
      ? await User.find({ _id: { $in: reservation.colaboradores } }).select('name email')
      : [];

    // Guardar log de eliminación en la base de datos
    try {
      const deletionLog = new DeletionLog({
        reservationId: reservation.reservationId || reservation._id.toString(),
        reservationData: {
          area: reservation.area,
          date: reservation.date,
          startTime: reservation.startTime,
          endTime: reservation.endTime,
          teamName: reservation.teamName,
          requestedSeats: reservation.requestedSeats,
          status: reservation.status,
          createdBy: reservation.createdBy,
          createdAt: reservation.createdAt,
          colaboradores: reservation.colaboradores,
          attendees: reservation.attendees
        },
        deletedBy: {
          userId: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role
        },
        deletedAt: new Date(),
        deletionType: 'single',
        reason: isAdmin && !isCreator ? `Eliminada por ${user.role}` : 'Eliminada por el creador'
      });

      await deletionLog.save();
      console.log('✅ Log de eliminación guardado en BD:', deletionLog._id);
    } catch (logError) {
      console.error('⚠️ Error guardando log de eliminación (pero continuamos con la eliminación):', logError.message);
    }

    await Reservation.findByIdAndDelete(req.params.id);

    // Enviar notificación de cancelación por email
    try {
      if (reservationOwner) {
        await emailService.sendCancellationNotification(
          reservation,
          reservationOwner,
          colaboradoresData,
          user // Usuario que está cancelando la reserva
        );
      }
    } catch (emailError) {
      // Log error pero no fallar la eliminación
      console.error('⚠️  Error enviando email de cancelación:', emailError.message);
    }

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

    // Verificar permisos: solo superadmin o admin pueden eliminar todas las reservaciones
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return res.status(403).json({
        error: 'No tienes permisos para eliminar todas las reservaciones. Solo administradores pueden realizar esta acción.'
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

    if (user.role !== 'admin' && user.role !== 'superadmin') {
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

// Obtener todos los departamentos (incluyendo inactivos) - solo para admin/superadmin/user
app.get('/api/departments/all', async (req, res) => {
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
app.post('/api/departments', async (req, res) => {
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
app.put('/api/departments/:id', async (req, res) => {
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
app.delete('/api/departments/:id', async (req, res) => {
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

// ==================== COWORKING SETTINGS ENDPOINTS ====================

// GET - Obtener configuración del coworking (pública)
app.get('/api/coworking-settings', async (req, res) => {
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
app.put('/api/coworking-settings', async (req, res) => {
  try {
    // Validar token de seguridad - aceptar tanto x-security-token como x-app-token
    const securityToken = req.headers['x-security-token'] || req.headers['x-app-token'];
    if (securityToken !== process.env.APP_SECURITY_TOKEN) {
      return res.status(403).json({ error: 'Token de seguridad inválido' });
    }

    // Verificar que el usuario es superadmin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu-clave-secreta-super-segura');
    const user = await User.findById(decoded.userId);

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

// ==================== BLOG POSTS ENDPOINTS ====================

// GET all blog posts (Super Admin only)
app.get('/api/blog-posts', async (req, res) => {
  try {
    // Validar token de seguridad
    const securityToken = req.headers['x-security-token'] || req.headers['x-app-token'];
    if (securityToken !== process.env.APP_SECURITY_TOKEN) {
      return res.status(403).json({ error: 'Token de seguridad inválido' });
    }

    // Verificar que el usuario es superadmin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu-clave-secreta-super-segura');
    const user = await User.findById(decoded.userId);

    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado. Solo super administradores' });
    }

    const posts = await BlogPost.find()
      .sort({ createdAt: -1 })
      .populate('createdBy.userId', 'name email')
      .populate('lastModifiedBy.userId', 'name email');

    res.json(posts);
  } catch (error) {
    console.error('Error obteniendo blog posts:', error);
    res.status(500).json({ error: 'Error al obtener los artículos del blog' });
  }
});

// GET published blog posts (público)
app.get('/api/blog-posts/published', async (req, res) => {
  try {
    const posts = await BlogPost.find({ published: true })
      .sort({ publishedAt: -1 })
      .select('-createdBy -lastModifiedBy');

    res.json(posts);
  } catch (error) {
    console.error('Error obteniendo blog posts publicados:', error);
    res.status(500).json({ error: 'Error al obtener los artículos publicados' });
  }
});

// GET single blog post by slug (público si está publicado)
app.get('/api/blog-posts/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const post = await BlogPost.findOne({ slug });

    if (!post) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }

    // Si el post no está publicado, solo Super Admin puede verlo
    if (!post.published) {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(403).json({ error: 'Este artículo no está disponible públicamente' });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || user.role !== 'superadmin') {
          return res.status(403).json({ error: 'Este artículo no está disponible públicamente' });
        }
      } catch (err) {
        return res.status(403).json({ error: 'Este artículo no está disponible públicamente' });
      }
    }

    // Incrementar contador de vistas solo si está publicado
    if (post.published) {
      post.views += 1;
      await post.save();
    }

    res.json(post);
  } catch (error) {
    console.error('Error obteniendo blog post:', error);
    res.status(500).json({ error: 'Error al obtener el artículo' });
  }
});

// POST - Crear nuevo blog post (solo Super Admin)
app.post('/api/blog-posts', async (req, res) => {
  try {
    // Validar token de seguridad
    const securityToken = req.headers['x-security-token'] || req.headers['x-app-token'];
    if (securityToken !== process.env.APP_SECURITY_TOKEN) {
      return res.status(403).json({ error: 'Token de seguridad inválido' });
    }

    // Verificar que el usuario es superadmin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu-clave-secreta-super-segura');
    const user = await User.findById(decoded.userId);

    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado. Solo super administradores' });
    }

    const { title, slug, excerpt, content, author, category, image, keywords, readTime } = req.body;

    // Validar campos requeridos
    if (!title || !slug || !excerpt || !content || !category) {
      return res.status(400).json({
        error: 'Campos requeridos faltantes',
        required: ['title', 'slug', 'excerpt', 'content', 'category']
      });
    }

    // Verificar que el slug no exista
    const existingPost = await BlogPost.findOne({ slug });
    if (existingPost) {
      return res.status(400).json({ error: 'Ya existe un artículo con este slug' });
    }

    // Crear nuevo post
    const newPost = new BlogPost({
      title,
      slug,
      excerpt,
      content,
      author: author || 'Equipo Tribus',
      category,
      image: image || '📝',
      keywords: keywords || [],
      readTime: readTime || '5 min',
      createdBy: {
        userId: user._id,
        userName: user.name
      }
    });

    await newPost.save();

    res.status(201).json({
      message: 'Artículo creado exitosamente',
      post: newPost
    });
  } catch (error) {
    console.error('Error creando blog post:', error);
    res.status(500).json({ error: 'Error al crear el artículo' });
  }
});

// PUT - Actualizar blog post (solo Super Admin)
app.put('/api/blog-posts/:id', async (req, res) => {
  try {
    // Validar token de seguridad
    const securityToken = req.headers['x-security-token'] || req.headers['x-app-token'];
    if (securityToken !== process.env.APP_SECURITY_TOKEN) {
      return res.status(403).json({ error: 'Token de seguridad inválido' });
    }

    // Verificar que el usuario es superadmin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu-clave-secreta-super-segura');
    const user = await User.findById(decoded.userId);

    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado. Solo super administradores' });
    }

    const { id } = req.params;
    const { title, slug, excerpt, content, author, category, image, keywords, readTime } = req.body;

    const post = await BlogPost.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }

    // Si se está cambiando el slug, verificar que no exista
    if (slug && slug !== post.slug) {
      const existingPost = await BlogPost.findOne({ slug });
      if (existingPost) {
        return res.status(400).json({ error: 'Ya existe un artículo con este slug' });
      }
    }

    // Actualizar campos
    if (title) post.title = title;
    if (slug) post.slug = slug;
    if (excerpt) post.excerpt = excerpt;
    if (content) post.content = content;
    if (author) post.author = author;
    if (category) post.category = category;
    if (image !== undefined) post.image = image;
    if (keywords) post.keywords = keywords;
    if (readTime) post.readTime = readTime;

    // Registrar última modificación
    post.lastModifiedBy = {
      userId: user._id,
      userName: user.name,
      modifiedAt: new Date()
    };

    await post.save();

    res.json({
      message: 'Artículo actualizado exitosamente',
      post
    });
  } catch (error) {
    console.error('Error actualizando blog post:', error);
    res.status(500).json({ error: 'Error al actualizar el artículo' });
  }
});

// DELETE - Eliminar blog post (solo Super Admin)
app.delete('/api/blog-posts/:id', async (req, res) => {
  try {
    // Validar token de seguridad
    const securityToken = req.headers['x-security-token'] || req.headers['x-app-token'];
    if (securityToken !== process.env.APP_SECURITY_TOKEN) {
      return res.status(403).json({ error: 'Token de seguridad inválido' });
    }

    // Verificar que el usuario es superadmin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu-clave-secreta-super-segura');
    const user = await User.findById(decoded.userId);

    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado. Solo super administradores' });
    }

    const { id } = req.params;

    const post = await BlogPost.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }

    await BlogPost.findByIdAndDelete(id);

    res.json({
      message: 'Artículo eliminado exitosamente',
      deletedPost: {
        id: post._id,
        title: post.title,
        slug: post.slug
      }
    });
  } catch (error) {
    console.error('Error eliminando blog post:', error);
    res.status(500).json({ error: 'Error al eliminar el artículo' });
  }
});

// PATCH - Publicar/Despublicar blog post (solo Super Admin)
app.patch('/api/blog-posts/:id/publish', async (req, res) => {
  try {
    // Validar token de seguridad
    const securityToken = req.headers['x-security-token'] || req.headers['x-app-token'];
    if (securityToken !== process.env.APP_SECURITY_TOKEN) {
      return res.status(403).json({ error: 'Token de seguridad inválido' });
    }

    // Verificar que el usuario es superadmin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu-clave-secreta-super-segura');
    const user = await User.findById(decoded.userId);

    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado. Solo super administradores' });
    }

    const { id } = req.params;
    const { published } = req.body;

    if (typeof published !== 'boolean') {
      return res.status(400).json({ error: 'El campo "published" debe ser booleano' });
    }

    const post = await BlogPost.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }

    post.published = published;

    // Si se está publicando por primera vez, establecer publishedAt
    if (published && !post.publishedAt) {
      post.publishedAt = new Date();
    }

    // Registrar última modificación
    post.lastModifiedBy = {
      userId: user._id,
      userName: user.name,
      modifiedAt: new Date()
    };

    await post.save();

    res.json({
      message: `Artículo ${published ? 'publicado' : 'despublicado'} exitosamente`,
      post
    });
  } catch (error) {
    console.error('Error cambiando estado de publicación:', error);
    res.status(500).json({ error: 'Error al cambiar el estado de publicación' });
  }
});

// ==========================================
// ENDPOINTS DE FORMULARIOS DE CONTACTO
// ==========================================

// POST - Crear nuevo formulario de contacto (público, sin autenticación)
app.post('/api/contact-forms', async (req, res) => {
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
app.get('/api/contact-forms', async (req, res) => {
  try {
    // Validar token de seguridad - aceptar tanto x-security-token como x-app-token
    const securityToken = req.headers['x-security-token'] || req.headers['x-app-token'];
    if (securityToken !== process.env.APP_SECURITY_TOKEN) {
      console.warn(`⚠️ [${new Date().toISOString()}] GET /api/contact-forms - Token de seguridad inválido o faltante`);
      return res.status(403).json({ error: 'Token de seguridad requerido' });
    }

    // Verificar autenticación
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.warn(`⚠️ [${new Date().toISOString()}] GET /api/contact-forms - No se proporcionó header de autorización`);
      return res.status(401).json({ error: 'No autorizado - Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.warn(`⚠️ [${new Date().toISOString()}] GET /api/contact-forms - Token vacío en header de autorización`);
      return res.status(401).json({ error: 'No autorizado - Token inválido' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu-clave-secreta-super-segura');
    } catch (jwtError) {
      console.warn(`⚠️ [${new Date().toISOString()}] GET /api/contact-forms - Error verificando JWT:`, jwtError.message);
      return res.status(401).json({ error: 'Token expirado o inválido - Por favor inicia sesión nuevamente' });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      console.warn(`⚠️ [${new Date().toISOString()}] GET /api/contact-forms - Usuario no encontrado para ID: ${decoded.userId}`);
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    if (user.role !== 'admin' && user.role !== 'superadmin') {
      console.warn(`⚠️ [${new Date().toISOString()}] GET /api/contact-forms - Acceso denegado para usuario ${user.username} con rol: ${user.role}`);
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
app.put('/api/contact-forms/:id', async (req, res) => {
  try {
    // Validar token de seguridad - aceptar tanto x-security-token como x-app-token
    const securityToken = req.headers['x-security-token'] || req.headers['x-app-token'];
    if (securityToken !== process.env.APP_SECURITY_TOKEN) {
      return res.status(403).json({ error: 'Token de seguridad requerido' });
    }

    // Verificar autenticación
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu-clave-secreta-super-segura');
    const user = await User.findById(decoded.userId);

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
app.delete('/api/contact-forms/:id', async (req, res) => {
  try {
    // Validar token de seguridad - aceptar tanto x-security-token como x-app-token
    const securityToken = req.headers['x-security-token'] || req.headers['x-app-token'];
    if (securityToken !== process.env.APP_SECURITY_TOKEN) {
      return res.status(403).json({ error: 'Token de seguridad requerido' });
    }

    // Verificar autenticación
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu-clave-secreta-super-segura');
    const user = await User.findById(decoded.userId);

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

// ============================================
// ENDPOINTS DE MENSAJERÍA
// ============================================

// GET - Obtener conversaciones del usuario actual
app.get('/api/messages/conversations', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu-clave-secreta-super-segura');
    const userId = decoded.userId;

    // Obtener todos los mensajes donde el usuario es sender o receiver
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    })
      .populate('sender', 'name username email')
      .populate('receiver', 'name username email')
      .sort({ createdAt: -1 });

    // Agrupar por conversación
    const conversationsMap = new Map();

    messages.forEach(msg => {
      const otherUserId = msg.sender._id.toString() === userId ? msg.receiver._id.toString() : msg.sender._id.toString();

      if (!conversationsMap.has(otherUserId)) {
        const otherUser = msg.sender._id.toString() === userId ? msg.receiver : msg.sender;
        const unreadCount = messages.filter(m =>
          m.sender._id.toString() === otherUserId &&
          m.receiver._id.toString() === userId &&
          !m.read
        ).length;

        conversationsMap.set(otherUserId, {
          user: {
            _id: otherUser._id,
            name: otherUser.name,
            username: otherUser.username,
            email: otherUser.email
          },
          lastMessage: {
            content: msg.content,
            createdAt: msg.createdAt,
            sender: msg.sender._id.toString()
          },
          unreadCount
        });
      }
    });

    const conversations = Array.from(conversationsMap.values());

    // Agregar conversación "@Todos" para admins/superadmins
    const currentUser = await User.findById(userId);
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin')) {
      // Obtener mensajes broadcast
      const broadcastMessages = await Message.find({ isBroadcast: true })
        .populate('sender', 'name username email')
        .sort({ createdAt: -1 });

      if (broadcastMessages.length > 0) {
        // Contar mensajes broadcast no leídos por el usuario actual
        const unreadBroadcastCount = broadcastMessages.filter(msg => {
          const hasRead = msg.readBy.some(
            (entry) => entry.user && entry.user.toString() === userId
          );
          return !hasRead;
        }).length;

        const lastBroadcastMessage = broadcastMessages[0];

        // Agregar conversación @Todos al inicio
        conversations.unshift({
          user: {
            _id: 'broadcast',
            name: '@Todos',
            username: 'broadcast',
            email: 'broadcast@system'
          },
          lastMessage: {
            content: lastBroadcastMessage.content || '(Archivo adjunto)',
            createdAt: lastBroadcastMessage.createdAt,
            sender: lastBroadcastMessage.sender._id.toString()
          },
          unreadCount: unreadBroadcastCount
        });
      } else {
        // Si no hay mensajes broadcast, agregar conversación vacía para admins
        conversations.unshift({
          user: {
            _id: 'broadcast',
            name: '@Todos',
            username: 'broadcast',
            email: 'broadcast@system'
          },
          lastMessage: {
            content: 'Envía un mensaje a todos los usuarios',
            createdAt: new Date(),
            sender: userId
          },
          unreadCount: 0
        });
      }
    }

    res.json(conversations);
  } catch (error) {
    console.error('Error obteniendo conversaciones:', error);
    res.status(500).json({ error: 'Error al obtener conversaciones' });
  }
});

// GET - Obtener mensajes broadcast para el usuario actual
app.get('/api/messages/broadcast/all', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu-clave-secreta-super-segura');
    const currentUserId = decoded.userId;

    console.log(`📢 Usuario ${currentUserId} cargando mensajes broadcast`);

    // Obtener todos los mensajes broadcast
    const messages = await Message.find({
      isBroadcast: true
    })
      .populate('sender', 'name username email')
      .sort({ createdAt: 1 });

    // Marcar como leídos los mensajes que este usuario aún no ha leído
    for (const message of messages) {
      const hasRead = message.readBy.some(
        (entry) => entry.user && entry.user.toString() === currentUserId
      );

      if (!hasRead) {
        message.readBy.push({
          user: currentUserId,
          readAt: new Date()
        });
        await message.save();
      }
    }

    console.log(`📨 Enviando ${messages.length} mensajes broadcast`);

    res.json(messages);
  } catch (error) {
    console.error('Error obteniendo mensajes broadcast:', error);
    res.status(500).json({ error: 'Error al obtener mensajes broadcast' });
  }
});

// GET - Obtener mensajes con un usuario específico
app.get('/api/messages/:userId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu-clave-secreta-super-segura');
    const currentUserId = decoded.userId;
    const { userId } = req.params;

    console.log(`📬 Usuario ${currentUserId} cargando mensajes con ${userId}`);

    // Marcar como leídos los mensajes recibidos ANTES de obtenerlos
    const updateResult = await Message.updateMany(
      {
        sender: userId,
        receiver: currentUserId,
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    );

    console.log(`✓✓ ${updateResult.modifiedCount} mensajes marcados como leídos`);

    // DESPUÉS obtener mensajes con el estado actualizado
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId }
      ]
    })
      .populate('sender', 'name username email')
      .populate('receiver', 'name username email')
      .sort({ createdAt: 1 });

    // Log de debug para verificar estado de mensajes
    console.log(`📨 Enviando ${messages.length} mensajes. Estado:`);
    messages.forEach((msg, idx) => {
      const isSentByCurrentUser = msg.sender._id.toString() === currentUserId;
      console.log(`  ${idx + 1}. ${isSentByCurrentUser ? '➡️ Enviado' : '⬅️ Recibido'}: delivered=${msg.delivered}, read=${msg.read}`);
    });

    res.json(messages);
  } catch (error) {
    console.error('Error obteniendo mensajes:', error);
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
});

// POST - Enviar un nuevo mensaje (con o sin archivos)
app.post('/api/messages', upload.array('files', 5), async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu-clave-secreta-super-segura');
    const senderId = decoded.userId;

    const { receiverId, content } = req.body;
    const files = req.files;

    // Validar que al menos haya contenido o archivos
    if (!receiverId || (!content && (!files || files.length === 0))) {
      return res.status(400).json({ error: 'Destinatario y contenido o archivos son requeridos' });
    }

    // Verificar que el destinatario existe
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'Usuario destinatario no encontrado' });
    }

    // Procesar archivos adjuntos - Subir a Cloudinary
    const attachments = [];

    if (files && files.length > 0) {
      console.log(`📤 Subiendo ${files.length} archivos a Cloudinary...`);

      for (const file of files) {
        try {
          // Crear promesa para subir a Cloudinary usando stream
          const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: 'tribus/messages',
                resource_type: 'auto', // Detecta automáticamente si es imagen, video, etc.
                public_id: `${Date.now()}-${Math.round(Math.random() * 1E9)}`,
                filename_override: file.originalname
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );

            // Escribir el buffer del archivo en el stream
            uploadStream.end(file.buffer);
          });

          attachments.push({
            filename: uploadResult.public_id,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: uploadResult.secure_url,
            url: uploadResult.secure_url,
            cloudinary_id: uploadResult.public_id
          });

          console.log(`  ✓ ${file.originalname} subido a Cloudinary`);
        } catch (uploadError) {
          console.error(`  ✗ Error subiendo ${file.originalname}:`, uploadError);
          throw new Error(`Error al subir archivo ${file.originalname}`);
        }
      }
    }

    const message = new Message({
      sender: senderId,
      receiver: receiverId,
      content: content ? content.trim() : '',
      attachments: attachments,
      // Estos valores son explícitos para claridad (aunque tienen defaults en schema)
      delivered: true,
      deliveredAt: new Date(),
      read: false
    });

    await message.save();

    // Poblar la información del mensaje antes de devolverlo
    await message.populate('sender', 'name username email');
    await message.populate('receiver', 'name username email');

    console.log(`📧 Mensaje enviado de ${message.sender.name} a ${message.receiver.name}`);
    console.log(`   Contenido: ${content || '(sin texto)'}`);
    console.log(`   Archivos adjuntos: ${attachments.length}`);
    if (attachments.length > 0) {
      console.log(`   URLs Cloudinary:`);
      attachments.forEach((att, idx) => {
        console.log(`     ${idx + 1}. ${att.originalName} -> ${att.url}`);
      });
    }
    console.log(`   Estado inicial: delivered=${message.delivered}, read=${message.read}`);

    res.status(201).json({
      message: 'Mensaje enviado exitosamente',
      data: message
    });
  } catch (error) {
    console.error('Error enviando mensaje:', error);

    // Si hay error con multer, dar mensaje más específico
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Archivo demasiado grande. Máximo 10MB por archivo.' });
      }
      return res.status(400).json({ error: `Error al subir archivo: ${error.message}` });
    }

    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

// POST - Enviar mensaje broadcast a @todos (solo admins/superadmins)
app.post('/api/messages/broadcast', upload.array('files', 5), async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu-clave-secreta-super-segura');
    const senderId = decoded.userId;

    // Verificar que el usuario sea admin o superadmin
    const sender = await User.findById(senderId);
    if (!sender || (sender.role !== 'admin' && sender.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Solo administradores pueden enviar mensajes a todos' });
    }

    const { content } = req.body;
    const files = req.files;

    // Validar que al menos haya contenido o archivos
    if (!content && (!files || files.length === 0)) {
      return res.status(400).json({ error: 'Contenido o archivos son requeridos' });
    }

    // Procesar archivos adjuntos - Subir a Cloudinary
    const attachments = [];

    if (files && files.length > 0) {
      console.log(`📤 [BROADCAST] Subiendo ${files.length} archivos a Cloudinary...`);

      for (const file of files) {
        try {
          const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: 'tribus/messages',
                resource_type: 'auto',
                public_id: `${Date.now()}-${Math.round(Math.random() * 1E9)}`,
                filename_override: file.originalname
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );

            uploadStream.end(file.buffer);
          });

          attachments.push({
            filename: uploadResult.public_id,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: uploadResult.secure_url,
            url: uploadResult.secure_url,
            cloudinary_id: uploadResult.public_id
          });

          console.log(`  ✓ ${file.originalname} subido a Cloudinary`);
        } catch (uploadError) {
          console.error(`  ✗ Error subiendo ${file.originalname}:`, uploadError);
          throw new Error(`Error al subir archivo ${file.originalname}`);
        }
      }
    }

    // Crear mensaje broadcast (sin receiver específico)
    const message = new Message({
      sender: senderId,
      receiver: null, // No hay receiver específico
      isBroadcast: true,
      content: content ? content.trim() : '',
      attachments: attachments,
      delivered: true,
      deliveredAt: new Date(),
      read: false,
      readBy: [] // Array vacío, se llenará cuando usuarios lean el mensaje
    });

    await message.save();

    // Poblar la información del mensaje antes de devolverlo
    await message.populate('sender', 'name username email');

    console.log(`📢 Mensaje BROADCAST enviado por ${message.sender.name}`);
    console.log(`   Contenido: ${content || '(sin texto)'}`);
    console.log(`   Archivos adjuntos: ${attachments.length}`);
    if (attachments.length > 0) {
      console.log(`   URLs Cloudinary:`);
      attachments.forEach((att, idx) => {
        console.log(`     ${idx + 1}. ${att.originalName} -> ${att.url}`);
      });
    }

    res.status(201).json({
      message: 'Mensaje broadcast enviado exitosamente a todos los usuarios',
      data: message
    });
  } catch (error) {
    console.error('Error enviando mensaje broadcast:', error);

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Archivo demasiado grande. Máximo 10MB por archivo.' });
      }
      return res.status(400).json({ error: `Error al subir archivo: ${error.message}` });
    }

    res.status(500).json({ error: 'Error al enviar mensaje broadcast' });
  }
});

// GET - Obtener contador de mensajes no leídos
app.get('/api/messages/unread/count', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu-clave-secreta-super-segura');
    const userId = decoded.userId;

    const unreadCount = await Message.countDocuments({
      receiver: userId,
      read: false
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('Error obteniendo contador de no leídos:', error);
    res.status(500).json({ error: 'Error al obtener contador' });
  }
});

// GET - Obtener todos los usuarios (para buscar y iniciar conversaciones)
app.get('/api/messages/users/search', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu-clave-secreta-super-segura');
    const currentUserId = decoded.userId;

    const { query } = req.query;

    let searchFilter = { _id: { $ne: currentUserId }, isActive: true };

    if (query) {
      searchFilter = {
        ...searchFilter,
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { username: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ]
      };
    }

    const users = await User.find(searchFilter)
      .select('name username email role department')
      .limit(20)
      .sort({ name: 1 });

    res.json(users);
  } catch (error) {
    console.error('Error buscando usuarios:', error);
    res.status(500).json({ error: 'Error al buscar usuarios' });
  }
});

// PATCH - Marcar mensajes como leídos
app.patch('/api/messages/:userId/mark-read', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu-clave-secreta-super-segura');
    const currentUserId = decoded.userId;
    const { userId } = req.params;

    // Marcar como leídos todos los mensajes no leídos de este usuario
    const result = await Message.updateMany(
      {
        sender: userId,
        receiver: currentUserId,
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    );

    console.log(`✓✓ ${result.modifiedCount} mensajes marcados como leídos`);

    res.json({
      message: 'Mensajes marcados como leídos',
      count: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marcando mensajes como leídos:', error);
    res.status(500).json({ error: 'Error al marcar mensajes como leídos' });
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

// Servir archivos estáticos en producción
if (process.env.NODE_ENV === 'production') {
  // Servir archivos estáticos del build de React
  app.use(express.static(path.join(__dirname, 'build')));
  
  // Manejar rutas de React (SPA)
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
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});
