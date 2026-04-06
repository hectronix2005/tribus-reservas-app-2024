const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const User = require('../models/User');
const PasswordReset = require('../../models/PasswordReset');
const emailService = require('../../services/emailService-improved');
const { passwordResetTemplate, passwordResetTextTemplate } = require('../../services/emailTemplates');
const { backupBeforeDelete } = require('../../middleware/backupMiddleware');

// Endpoint para crear usuarios sin autenticación
router.post('/users/register', async (req, res) => {
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
router.post('/users/login', async (req, res) => {
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

    // Verificar expiracion de contraseña
    const passwordExpired = user.mustChangePassword || user.isPasswordExpired();
    const daysRemaining = user.passwordDaysRemaining();

    res.json({
      user: userResponse,
      token,
      passwordExpired,
      daysRemaining,
      ...(passwordExpired && {
        passwordMessage: 'Tu contraseña ha expirado. Debes cambiarla para continuar.'
      }),
      ...(daysRemaining <= 15 && !passwordExpired && {
        passwordWarning: `Tu contraseña expira en ${daysRemaining} dias. Cambiala pronto.`
      }),
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================
// CAMBIO DE CONTRASEÑA (expiracion cada 6 meses)
// ============================================

router.post('/users/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }

    // Validar complejidad minima
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasUpper || !hasLower || !hasNumber) {
      return res.status(400).json({
        error: 'La contraseña debe contener al menos una mayuscula, una minuscula y un numero'
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar contraseña actual
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    // Verificar que no sea igual a la actual
    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      return res.status(400).json({ error: 'La nueva contraseña no puede ser igual a la actual' });
    }

    // Verificar que no sea una de las ultimas 3 contraseñas
    const history = user.passwordHistory || [];
    for (const prev of history.slice(-3)) {
      const isReused = await bcrypt.compare(newPassword, prev.hash);
      if (isReused) {
        return res.status(400).json({
          error: 'No puedes reutilizar tus ultimas 3 contraseñas'
        });
      }
    }

    // Guardar contraseña actual en historial
    history.push({ hash: user.password, changedAt: new Date() });
    // Mantener solo las ultimas 5
    if (history.length > 5) history.splice(0, history.length - 5);

    // Hashear nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    user.mustChangePassword = false;
    user.passwordHistory = history;
    await user.save();

    console.log(`✅ Contraseña cambiada para: ${user.email}`);

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
      nextExpiry: new Date(Date.now() + User.PASSWORD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000),
    });
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================
// ENDPOINTS DE RECUPERACIÓN DE CONTRASEÑA
// ============================================

// Endpoint para solicitar recuperación de contraseña
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'El email es requerido'
      });
    }

    // Buscar usuario por email
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      isActive: true
    });

    // Por seguridad, siempre retornamos éxito aunque el usuario no exista
    // Esto previene enumerar usuarios válidos
    if (!user) {
      console.log(`⚠️ Intento de recuperación para email no existente: ${email}`);
      return res.json({
        success: true,
        message: 'Si el email existe en nuestro sistema, recibirás instrucciones para restablecer tu contraseña'
      });
    }

    // Generar token único y seguro
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Invalidar tokens anteriores del mismo usuario
    await PasswordReset.updateMany(
      { userId: user._id, used: false },
      { used: true, usedAt: new Date() }
    );

    // Crear nuevo registro de reset
    const passwordReset = new PasswordReset({
      userId: user._id,
      email: user.email,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutos
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });

    await passwordReset.save();

    // Construir URL de reset
    // Si FRONTEND_URL está configurada, usarla siempre (incluso en desarrollo)
    // Esto permite que los emails funcionen en producción aunque el servidor esté en local
    const resetUrl = process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
      : `http://localhost:5173/reset-password?token=${resetToken}`;

    console.log(`🔗 URL de reset generada: ${resetUrl.substring(0, 60)}...`);

    // Preparar y enviar email
    const emailHtml = passwordResetTemplate(user.name, resetUrl, 30);
    const emailText = passwordResetTextTemplate(user.name, resetUrl, 30);

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Tribus Reservas <noreply@tribus.com>',
      to: user.email,
      subject: '🔒 Recuperación de Contraseña - Tribus',
      html: emailHtml,
      text: emailText
    };

    // Enviar email
    if (emailService.transporter) {
      try {
        const info = await emailService.transporter.sendMail(mailOptions);

        // Registrar en EmailLog
        const EmailLog = require('./models/EmailLog');
        await EmailLog.create({
          emailType: 'password_reset',
          subject: mailOptions.subject,
          to: [user.email],
          status: 'success',
          messageId: info.messageId,
          sentAt: new Date(),
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent')
        });

        console.log(`✅ Email de recuperación enviado a: ${user.email}`);
        console.log(`📧 Message ID: ${info.messageId}`);
      } catch (emailError) {
        console.error('❌ Error enviando email de recuperación:', emailError);

        // Registrar error en EmailLog
        const EmailLog = require('./models/EmailLog');
        await EmailLog.create({
          emailType: 'password_reset',
          subject: mailOptions.subject,
          to: [user.email],
          status: 'failed',
          error: emailError.message,
          sentAt: new Date(),
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent')
        });

        // No revelamos el error al usuario
        return res.status(500).json({
          error: 'Error al enviar el email de recuperación. Intenta nuevamente.'
        });
      }
    } else {
      console.error('❌ Servicio de email no inicializado');
      return res.status(500).json({
        error: 'Servicio de email no disponible. Contacta al administrador.'
      });
    }

    res.json({
      success: true,
      message: 'Si el email existe en nuestro sistema, recibirás instrucciones para restablecer tu contraseña'
    });

  } catch (error) {
    console.error('Error en forgot-password:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// Endpoint para restablecer contraseña con token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Token y nueva contraseña son requeridos'
      });
    }

    // Validar longitud de contraseña
    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Hash del token para buscar en la BD
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Buscar token en la BD
    const passwordReset = await PasswordReset.findOne({
      token: hashedToken
    }).populate('userId');

    if (!passwordReset) {
      return res.status(400).json({
        error: 'Token inválido o expirado'
      });
    }

    // Verificar si el token es válido
    if (!passwordReset.isValid()) {
      return res.status(400).json({
        error: 'Token inválido o expirado'
      });
    }

    // Buscar usuario
    const user = await User.findById(passwordReset.userId);

    if (!user || !user.isActive) {
      return res.status(400).json({
        error: 'Usuario no encontrado o inactivo'
      });
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Guardar contraseña actual en historial
    const history = user.passwordHistory || [];
    history.push({ hash: user.password, changedAt: new Date() });
    if (history.length > 5) history.splice(0, history.length - 5);

    // Actualizar contraseña del usuario
    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    user.mustChangePassword = false;
    user.passwordHistory = history;
    await user.save();

    // Marcar token como usado
    await passwordReset.markAsUsed();

    console.log(`✅ Contraseña restablecida para: ${user.email}`);

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error en reset-password:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// ============================================
// FIN ENDPOINTS DE RECUPERACIÓN DE CONTRASEÑA
// ============================================

// Endpoint para obtener todos los usuarios (sin autenticación para facilitar el desarrollo)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para obtener perfil del usuario (requiere autenticación)
router.get('/users/profile', auth, async (req, res) => {
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

// Endpoint para obtener un usuario específico (sin autenticación para facilitar el desarrollo)
router.get('/users/:id', async (req, res) => {
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
router.put('/users/:id', async (req, res) => {
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
      updateData.passwordChangedAt = new Date();
      updateData.mustChangePassword = true; // Forzar cambio en proximo login
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

// Endpoint para eliminar usuario
router.delete('/users/:id', backupBeforeDelete, async (req, res) => {
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

module.exports = router;
