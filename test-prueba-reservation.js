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

const reservationSchema = new mongoose.Schema({
  reservationId: { type: String, unique: true, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  area: { type: String, required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  requestedSeats: { type: Number, default: 1 },
  status: { type: String, enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'], default: 'confirmed' },
  notes: { type: String, default: '' },
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Area = mongoose.model('Area', areaSchema);
const Reservation = mongoose.model('Reservation', reservationSchema);

async function testPruebaReservation() {
  try {
    console.log('🔍 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_CONFIG.uri, MONGODB_CONFIG.options);
    console.log('✅ Conectado a MongoDB');

    // Buscar usuario Prueba
    console.log('\n🔍 Buscando usuario Prueba...');
    const pruebaUser = await User.findOne({ username: 'prueba' });
    
    if (!pruebaUser) {
      console.log('❌ Usuario Prueba no encontrado');
      return;
    }
    
    console.log('✅ Usuario Prueba encontrado:');
    console.log(`   ID: ${pruebaUser._id}`);
    console.log(`   Nombre: ${pruebaUser.name}`);
    console.log(`   Username: ${pruebaUser.username}`);
    console.log(`   Email: ${pruebaUser.email}`);
    console.log(`   Rol: ${pruebaUser.role}`);
    console.log(`   Activo: ${pruebaUser.isActive}`);
    console.log(`   Employee ID: ${pruebaUser.employeeId}`);
    console.log(`   Cédula: ${pruebaUser.cedula}`);
    console.log(`   Departamento: ${pruebaUser.department}`);

    // Buscar áreas disponibles
    console.log('\n🔍 Buscando áreas disponibles...');
    const areas = await Area.find({});
    console.log(`📋 Áreas encontradas: ${areas.length}`);
    
    areas.forEach((area, index) => {
      console.log(`\n${index + 1}. ${area.name}`);
      console.log(`   Categoría: ${area.category}`);
      console.log(`   Capacidad: ${area.capacity}`);
      console.log(`   Es sala de reuniones: ${area.isMeetingRoom}`);
    });

    // Buscar colaboradores disponibles
    console.log('\n🔍 Buscando colaboradores disponibles...');
    const colaboradores = await User.find({ 
      role: { $in: ['admin', 'lider', 'colaborador'] },
      isActive: true,
      _id: { $ne: pruebaUser._id } // Excluir al usuario actual
    });
    console.log(`📋 Colaboradores encontrados: ${colaboradores.length}`);
    
    colaboradores.slice(0, 3).forEach((colab, index) => {
      console.log(`\n${index + 1}. ${colab.name} (${colab.username})`);
      console.log(`   Rol: ${colab.role}`);
      console.log(`   Departamento: ${colab.department}`);
    });

    // Simular creación de reserva
    console.log('\n🔍 Simulando creación de reserva...');
    
    const testReservation = {
      userId: pruebaUser._id,
      userName: pruebaUser.name,
      area: areas[0]?.name || 'Sala Neon',
      date: '2025-10-01',
      startTime: '10:00',
      endTime: '11:00',
      requestedSeats: 1,
      notes: 'Reserva de prueba',
      collaborators: colaboradores.slice(0, 2).map(c => c._id)
    };

    console.log('📝 Datos de la reserva de prueba:');
    console.log(`   Usuario: ${testReservation.userName} (${testReservation.userId})`);
    console.log(`   Área: ${testReservation.area}`);
    console.log(`   Fecha: ${testReservation.date}`);
    console.log(`   Hora: ${testReservation.startTime} - ${testReservation.endTime}`);
    console.log(`   Asientos: ${testReservation.requestedSeats}`);
    console.log(`   Colaboradores: ${testReservation.collaborators.length}`);

    // Verificar validaciones
    console.log('\n🔍 Verificando validaciones...');
    
    // Verificar que el área existe
    const targetArea = await Area.findOne({ name: testReservation.area });
    if (!targetArea) {
      console.log('❌ Área no encontrada');
      return;
    }
    console.log('✅ Área encontrada');

    // Verificar colaboradores
    const validColaboradores = await User.find({
      _id: { $in: testReservation.collaborators },
      role: { $in: ['admin', 'lider', 'colaborador'] },
      isActive: true
    });
    
    console.log(`✅ Colaboradores válidos: ${validColaboradores.length}/${testReservation.collaborators.length}`);

    // Verificar conflictos de horarios
    const [year, month, day] = testReservation.date.split('-').map(Number);
    const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    
    const conflictingReservation = await Reservation.findOne({
      area: testReservation.area,
      date: utcDate,
      status: { $in: ['confirmed', 'active'] },
      $expr: {
        $and: [
          { $lt: ["$startTime", testReservation.endTime] },
          { $gt: ["$endTime", testReservation.startTime] }
        ]
      }
    });

    if (conflictingReservation) {
      console.log('❌ Conflicto de horarios detectado');
      console.log(`   Reserva conflictiva: ${conflictingReservation.reservationId}`);
    } else {
      console.log('✅ No hay conflictos de horarios');
    }

    // Verificar capacidad
    if (testReservation.requestedSeats > targetArea.capacity) {
      console.log('❌ Capacidad insuficiente');
    } else {
      console.log('✅ Capacidad suficiente');
    }

    console.log('\n🎯 Simulación completada. Revisar logs para errores específicos.');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

testPruebaReservation();
