const jwt = require('jsonwebtoken');

// Primary secret comes from env; fallback ensures consistency when .env is not loaded.
// Both are tried so tokens issued under either secret remain valid.
const PRIMARY_SECRET = process.env.JWT_SECRET || 'tribus-secret-key';
const KNOWN_SECRETS = Array.from(new Set([PRIMARY_SECRET, 'tribus-secret-key', 'tu-clave-secreta-super-segura']));

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    let decoded = null;
    for (const secret of KNOWN_SECRETS) {
      try {
        decoded = jwt.verify(token, secret);
        break;
      } catch {
        // try next secret
      }
    }

    if (!decoded) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

module.exports = auth;
