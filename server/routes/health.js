const router = require('express').Router();

// Endpoint de salud
router.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'TRIBUS Backend API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
