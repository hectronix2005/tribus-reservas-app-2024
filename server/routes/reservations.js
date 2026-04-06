const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Reservation = require('../models/Reservation');
const Area = require('../models/Area');
const User = require('../models/User');
const AdminSettings = require('../models/AdminSettings');
const DeletionLog = require('../models/DeletionLog');
const emailService = require('../../services/emailService-improved');
const { backupBeforeDelete } = require('../../middleware/backupMiddleware');

// ===== ENDPOINTS DE RESERVACIONES =====

// Obtener todas las reservaciones (con filtros opcionales)
router.get('/', async (req, res) => {
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
router.post('/update-status', async (req, res) => {
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
router.get('/colaborador/:colaboradorId', async (req, res) => {
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
router.get('/user/:userId', async (req, res) => {
  try {
    const reservations = await Reservation.find({ userId: req.params.userId })
      .populate('userId', 'name username');
    res.json(reservations);
  } catch (error) {
    console.error('Error obteniendo reservaciones del usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para agregar debug básico a reservaciones existentes
router.post('/add-debug', async (req, res) => {
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
router.post('/update-ids', async (req, res) => {
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

// Crear nueva reservación (sin autenticación para facilitar el desarrollo)
router.post('/', async (req, res) => {
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


    // Sistema robusto de fechas: SIEMPRE almacenar fecha a medianoche UTC
    // Las fechas son SOLO fechas (YYYY-MM-DD), sin componente horario
    // Las horas se almacenan por separado en startTime/endTime como strings "HH:MM"
    const [resYear, resMonth, resDay] = date.split('-').map(Number);
    const reservationDate = new Date(Date.UTC(resYear, resMonth - 1, resDay, 0, 0, 0, 0));

    // Generar ID único: RES-YYYYMMDD-HHMMSS-XXXX
    const currentTime = new Date();
    const currentYear = currentTime.getFullYear();
    const currentMonth = String(currentTime.getMonth() + 1).padStart(2, '0');
    const currentDay = String(currentTime.getDate()).padStart(2, '0');
    const currentHours = String(currentTime.getHours()).padStart(2, '0');
    const currentMinutes = String(currentTime.getMinutes()).padStart(2, '0');
    const currentSeconds = String(currentTime.getSeconds()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const uniqueReservationId = `RES-${currentYear}${currentMonth}${currentDay}-${currentHours}${currentMinutes}${currentSeconds}-${random}`;

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
        colaboradoresData,
        {
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'] || 'Unknown'
        }
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
router.put('/:id', async (req, res) => {
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

// Eliminar TODAS las reservaciones (solo para administradores)
router.delete('/', backupBeforeDelete, async (req, res) => {
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

// Eliminar reservación (solo administradores)
router.delete('/:id', backupBeforeDelete, async (req, res) => {
  try {
    const { userId } = req.body;

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservación no encontrada' });
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

    // Superadmin y admin pueden eliminar CUALQUIER reserva sin importar el status
    // Usuarios regulares solo pueden eliminar sus propias reservas confirmadas
    if (!isAdmin) {
      // Usuario regular: verificar que sea el creador
      if (!isCreator) {
        return res.status(403).json({
          error: 'No tienes permisos para eliminar esta reservación. Solo administradores y el creador pueden eliminarla.'
        });
      }
      // Usuario regular: verificar que la reserva esté confirmada
      if (reservation.status !== 'confirmed') {
        return res.status(400).json({
          error: 'Solo se pueden eliminar reservas con estado "confirmado". Estado actual: ' + reservation.status
        });
      }
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
          user, // Usuario que está cancelando la reserva
          {
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'] || 'Unknown'
          }
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

module.exports = router;
