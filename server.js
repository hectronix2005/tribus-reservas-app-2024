require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// ============================================
// SISTEMA ROBUSTO DE MANEJO DE FECHAS
// ============================================
// REGLA FUNDAMENTAL: Las fechas son SOLO fechas (YYYY-MM-DD) sin componente horario
//
// PRINCIPIOS:
// 1. Fechas en BD: SIEMPRE almacenar como Date UTC a medianoche (00:00:00.000Z)
// 2. Horas: SIEMPRE almacenar por separado como strings "HH:MM" en campos startTime/endTime
// 3. Frontend: SIEMPRE enviar fechas como strings "YYYY-MM-DD"
// 4. Backend: SIEMPRE convertir strings a Date UTC usando componentes individuales
//
// CONVERSIÓN CORRECTA:
//   const [year, month, day] = dateString.split('-').map(Number);
//   const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
//
// ❌ NUNCA HACER:
//   new Date(dateString) // Interpreta como hora local, causa desplazamientos
//   new Date(Date.UTC(..., hours, minutes)) // NO incluir horas en la fecha
//
// ============================================

require('./server/config/cloudinary');

const app = express();
const PORT = process.env.PORT || 3007;

app.set('trust proxy', 1);

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

app.use(cors({ origin: true, credentials: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Demasiadas peticiones, intenta de nuevo más tarde', retryAfter: '15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const publicPaths = ['/contact-forms'];
    return publicPaths.some(p => req.url === p && req.method === 'POST');
  }
});
app.use('/api/', limiter);

app.use((req, res, next) => {
  const start = Date.now();
  const isDevelopment = process.env.NODE_ENV !== 'production';
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (isDevelopment || res.statusCode >= 400) {
      const timestamp = new Date().toISOString();
      const statusEmoji = res.statusCode >= 500 ? '❌' : res.statusCode >= 400 ? '⚠️' : '✅';
      console.log(`${statusEmoji} [${timestamp}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

app.use(express.json({ limit: '10mb' }));

// Connect to MongoDB
const connectDatabase = require('./server/config/database');
connectDatabase();

// Middleware de expiracion de contraseña (despues de auth, antes de rutas protegidas)
const checkPasswordExpiry = require('./server/middleware/passwordExpiry');
app.use(checkPasswordExpiry);

// Routes
app.use('/api/health', require('./server/routes/health'));
app.use('/api/areas', require('./server/routes/areas'));
app.use('/api', require('./server/routes/users'));
app.use('/api/reservations', require('./server/routes/reservations'));
app.use('/api/admin', require('./server/routes/admin'));
app.use('/api/departments', require('./server/routes/departments'));
app.use('/api/coworking-settings', require('./server/routes/coworking'));
app.use('/api/blog-posts', require('./server/routes/blog'));
app.use('/api/contact-forms', require('./server/routes/contactForms'));
app.use('/api/messages', require('./server/routes/messages'));
app.use('/api/attendance-reports', require('./server/routes/attendanceReports'));

// Servir archivos estáticos en producción (SPA fallback)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
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
