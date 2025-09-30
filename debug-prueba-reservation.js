const mongoose = require('mongoose');

// Configuración de MongoDB
const MONGODB_CONFIG = {
  uri: 'mongodb+srv://tribus_admin:Tribus2024@cluster0.o16ucum.mongodb.net/tribus?retryWrites=true&w=majority&appName=Cluster0',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
};

// Esquemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  cedula: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true, unique: true },
  role: { type: String, enum: ['admin', 'lider', 'colaborador'], default: 'lider' },
  department: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const areaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  capacity: { type: Number, required: true },
  description: { type: String, default: '' },
  color: { type: String, required: true },
  category: { type: String, enum: ['SALA', 'HOT_DESK'], required: true },
  id: { type: String, required: true },
  minReservationTime: { type: Number, default: 30 },
  maxReservationTime: { type: Number, default: 480 },
  isMeetingRoom: { type: Boolean, default: false },
  isFullDayReservation: { type: Boolean, default: false },
  officeHours: {
    start: { type: String, default: '08:00' },
    end: { type: String, default: '18:00' }
  }
});

const User = mongoose.model('User', userSchema);
const Area = mongoose.model('Area', areaSchema);

async function debugPruebaReservation() {
  try {
    console.log('🔍 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_CONFIG.uri, MONGODB_CONFIG.options);
    console.log('✅ Conectado a MongoDB');

    // Datos de la reserva que está fallando
    const reservationData = {
      userId: "68db11162b727e93af64fb06",
      userName: "Prueba",
      area: "Sala Neon",
      date: "2025-10-01",
      startTime: "10:00",
      endTime: "11:00",
      teamName: "Comercial",
      requestedSeats: 1,
      notes: "Reserva de prueba",
      colaboradores: ["68a4ab1061db49178115b5df", "68c4abba516da382d0439cd1"]
    };

    console.log('\n🔍 Datos de la reserva:');
    console.log(JSON.stringify(reservationData, null, 2));

    // 1. Verificar que el usuario existe
    console.log('\n🔍 1. Verificando usuario...');
    const user = await User.findById(reservationData.userId);
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    console.log('✅ Usuario encontrado:', {
      id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      isActive: user.isActive
    });

    // 2. Verificar que el área existe
    console.log('\n🔍 2. Verificando área...');
    const areaInfo = await Area.findOne({ name: reservationData.area });
    if (!areaInfo) {
      console.log('❌ Área no encontrada');
      return;
    }
    console.log('✅ Área encontrada:', {
      name: areaInfo.name,
      category: areaInfo.category,
      capacity: areaInfo.capacity,
      isMeetingRoom: areaInfo.isMeetingRoom
    });

    // 3. Verificar colaboradores
    console.log('\n🔍 3. Verificando colaboradores...');
    console.log('IDs de colaboradores:', reservationData.colaboradores);
    
    // Buscar todos los usuarios con esos IDs
    const allUsersWithIds = await User.find({ 
      _id: { $in: reservationData.colaboradores }
    });
    
    console.log('Usuarios encontrados con esos IDs:');
    allUsersWithIds.forEach((u, index) => {
      console.log(`   ${index + 1}. ${u.name} (${u.username})`);
      console.log(`      ID: ${u._id}`);
      console.log(`      Rol: ${u.role}`);
      console.log(`      Activo: ${u.isActive}`);
    });

    // Verificar que todos los colaboradores existen y tienen rol válido
    const colaboradorUsers = await User.find({ 
      _id: { $in: reservationData.colaboradores },
      role: { $in: ['admin', 'lider', 'colaborador'] },
      isActive: true
    });

    console.log(`\nColaboradores válidos: ${colaboradorUsers.length}/${reservationData.colaboradores.length}`);
    
    if (colaboradorUsers.length !== reservationData.colaboradores.length) {
      console.log('❌ Algunos colaboradores no son válidos');
      
      // Encontrar cuáles no son válidos
      const validIds = colaboradorUsers.map(c => c._id.toString());
      const invalidIds = reservationData.colaboradores.filter(id => !validIds.includes(id));
      
      console.log('IDs inválidos:', invalidIds);
      
      // Buscar esos IDs específicos
      for (const invalidId of invalidIds) {
        const invalidUser = await User.findById(invalidId);
        if (invalidUser) {
          console.log(`   - ${invalidUser.name} (${invalidUser.username}): Rol=${invalidUser.role}, Activo=${invalidUser.isActive}`);
        } else {
          console.log(`   - ID ${invalidId}: Usuario no encontrado`);
        }
      }
    } else {
      console.log('✅ Todos los colaboradores son válidos');
    }

    // 4. Verificar validación de capacidad
    console.log('\n🔍 4. Verificando capacidad...');
    let finalRequestedSeats = parseInt(reservationData.requestedSeats) || 1;
    
    if (areaInfo.category === 'SALA') {
      finalRequestedSeats = areaInfo.capacity;
      console.log(`✅ Para SALA: usando capacidad completa (${finalRequestedSeats})`);
    } else if (areaInfo.category === 'HOT_DESK') {
      if (!reservationData.requestedSeats || isNaN(parseInt(reservationData.requestedSeats)) || parseInt(reservationData.requestedSeats) < 1) {
        console.log('❌ Para HOT DESK, debe especificar la cantidad de puestos requeridos');
        return;
      }
      finalRequestedSeats = parseInt(reservationData.requestedSeats);
      console.log(`✅ Para HOT DESK: usando asientos solicitados (${finalRequestedSeats})`);
    }

    // 5. Verificar validación de fecha
    console.log('\n🔍 5. Verificando fecha...');
    const currentNow = new Date();
    const [year, month, day] = reservationData.date.split('-').map(Number);
    const [hours, minutes] = reservationData.startTime.split(':').map(Number);
    const validationDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
    
    console.log('Fecha actual:', currentNow.toISOString());
    console.log('Fecha de validación:', validationDate.toISOString());
    console.log('¿Es fecha futura?', validationDate > currentNow);
    
    if (validationDate <= currentNow) {
      console.log('❌ La fecha y hora no pueden estar en el pasado');
      return;
    }
    console.log('✅ Fecha válida');

    console.log('\n🎯 Todas las validaciones pasaron. El problema debe estar en otra parte del código.');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

debugPruebaReservation();
