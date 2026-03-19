const router = require('express').Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const upload = require('../middleware/upload');
const Message = require('../models/Message');
const User = require('../models/User');

// ============================================
// ENDPOINTS DE MENSAJERÍA
// ============================================

// GET - Obtener conversaciones del usuario actual
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

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
router.get('/broadcast/all', auth, async (req, res) => {
  try {
    const currentUserId = req.user.userId;

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

// GET - Obtener contador de mensajes no leídos
router.get('/unread/count', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

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
router.get('/users/search', auth, async (req, res) => {
  try {
    const currentUserId = req.user.userId;

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

// GET - Obtener mensajes con un usuario específico
router.get('/:userId', auth, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
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
router.post('/', auth, upload.array('files', 5), async (req, res) => {
  try {
    const senderId = req.user.userId;

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
router.post('/broadcast', auth, upload.array('files', 5), async (req, res) => {
  try {
    const senderId = req.user.userId;

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

// PATCH - Marcar mensajes como leídos
router.patch('/:userId/mark-read', auth, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
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

module.exports = router;
