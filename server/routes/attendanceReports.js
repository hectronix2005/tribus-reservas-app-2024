const router = require('express').Router();
const auth = require('../middleware/auth');
const AttendanceReport = require('../models/AttendanceReport');

const isAdminOrSuperAdmin = (req, res, next) => {
  if (!['admin', 'superadmin'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Acceso restringido a administradores' });
  }
  next();
};

// GET /api/attendance-reports — listar todos (metadata solamente)
router.get('/', auth, isAdminOrSuperAdmin, async (req, res) => {
  try {
    const reports = await AttendanceReport.find()
      .select('-results -summary')
      .sort({ uploadedAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo reportes' });
  }
});

// GET /api/attendance-reports/:id — obtener reporte completo
router.get('/:id', auth, isAdminOrSuperAdmin, async (req, res) => {
  try {
    const report = await AttendanceReport.findById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Reporte no encontrado' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo reporte' });
  }
});

// POST /api/attendance-reports — guardar nuevo reporte
router.post('/', auth, isAdminOrSuperAdmin, async (req, res) => {
  try {
    const { filename, period, employeeCount, dateColumns, results, summary } = req.body;
    const report = new AttendanceReport({
      filename,
      period,
      uploadedBy: req.user.userId || req.user.id,
      uploadedByName: req.user.name || req.user.username || '',
      employeeCount,
      dateColumns,
      results,
      summary,
    });
    await report.save();
    res.status(201).json({ _id: report._id, message: 'Reporte guardado' });
  } catch (err) {
    console.error('Error guardando reporte de asistencia:', err);
    res.status(500).json({ error: 'Error guardando reporte' });
  }
});

// DELETE /api/attendance-reports/:id
router.delete('/:id', auth, isAdminOrSuperAdmin, async (req, res) => {
  try {
    const report = await AttendanceReport.findByIdAndDelete(req.params.id);
    if (!report) return res.status(404).json({ error: 'Reporte no encontrado' });
    res.json({ message: 'Reporte eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando reporte' });
  }
});

module.exports = router;
