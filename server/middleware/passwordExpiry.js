const User = require('../models/User');

/**
 * Middleware que verifica si la contraseña del usuario esta expirada.
 * Si esta expirada, retorna 403 con passwordExpired: true para que
 * el frontend redirija a la pantalla de cambio de contraseña.
 *
 * Rutas excluidas: cambio de contraseña, logout, perfil.
 */
async function checkPasswordExpiry(req, res, next) {
  // Rutas que siempre deben funcionar (el usuario necesita poder cambiar su contraseña)
  const exemptPaths = [
    '/api/users/change-password',
    '/api/users/login',
    '/api/users/register',
    '/api/forgot-password',
    '/api/reset-password',
    '/api/users/profile',
  ];

  if (exemptPaths.some(p => req.path.startsWith(p))) {
    return next();
  }

  // Solo verificar si hay usuario autenticado
  if (!req.user || !req.user.userId) {
    return next();
  }

  try {
    const user = await User.findById(req.user.userId).select('passwordChangedAt mustChangePassword createdAt');
    if (!user) return next();

    if (user.mustChangePassword || user.isPasswordExpired()) {
      return res.status(403).json({
        error: 'Contraseña expirada',
        code: 'PASSWORD_EXPIRED',
        passwordExpired: true,
        daysExpired: Math.abs(user.passwordDaysRemaining()),
        message: 'Tu contraseña ha expirado. Debes cambiarla para continuar usando el sistema.',
      });
    }

    // Si faltan menos de 15 dias, agregar header de advertencia
    const daysRemaining = user.passwordDaysRemaining();
    if (daysRemaining <= 15) {
      res.set('X-Password-Expires-In', daysRemaining.toString());
    }

    next();
  } catch (err) {
    // Si hay error leyendo el usuario, no bloquear (fail-open para no romper el sistema)
    console.error('Error verificando expiracion de contraseña:', err.message);
    next();
  }
}

module.exports = checkPasswordExpiry;
