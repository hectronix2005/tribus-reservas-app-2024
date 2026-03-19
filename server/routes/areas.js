const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Area = require('../models/Area');
const AdminSettings = require('../models/AdminSettings');
const Reservation = require('../models/Reservation');

// Endpoints para Áreas
router.get('/', async (req, res) => {
  try {
    const areas = await Area.find();
    res.json(areas);
  } catch (error) {
    console.error('Error obteniendo áreas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/:id', async (req, res) => {
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

router.post('/', async (req, res) => {
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

router.put('/:id', async (req, res) => {
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

router.delete('/:id', async (req, res) => {
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
router.get('/:id/availability', async (req, res) => {
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
      // Incluir TODAS las reservas sin importar el status (confirmed, active, completed, etc.)
      const [year, month, day] = date.split('-').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const existingReservations = await Reservation.find({
        area: area.name,
        date: utcDate
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
      // Incluir TODAS las reservas sin importar el status
      const [year, month, day] = date.split('-').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const existingReservations = await Reservation.find({
        area: area.name,
        date: utcDate
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

module.exports = router;
