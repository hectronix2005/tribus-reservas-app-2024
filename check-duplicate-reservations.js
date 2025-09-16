const mongoose = require('mongoose');

// Configuración de MongoDB
const MONGODB_CONFIG = {
  uri: process.env.MONGODB_URI || 'mongodb+srv://tribus_admin:Tribus2024@cluster0.o16ucum.mongodb.net/tribus?retryWrites=true&w=majority&appName=Cluster0',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  database: {
    name: 'tribus',
    cluster: 'cluster0.o16ucum.mongodb.net',
    provider: 'MongoDB Atlas'
  }
};

// Esquema de Reservación
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

const Reservation = mongoose.model('Reservation', reservationSchema);

async function checkDuplicateReservations() {
  try {
    console.log('🔍 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_CONFIG.uri, MONGODB_CONFIG.options);
    console.log('✅ Conectado a MongoDB');

    // Buscar las reservas específicas mencionadas
    const specificIds = ['RES-20250916-204657-8245', 'RES-20250916-225148-7952'];
    
    console.log('\n🔍 Buscando reservas específicas...');
    const specificReservations = await Reservation.find({
      reservationId: { $in: specificIds }
    });

    console.log(`\n📋 Reservas encontradas: ${specificReservations.length}`);
    
    if (specificReservations.length > 0) {
      specificReservations.forEach((res, index) => {
        console.log(`\n${index + 1}. Reserva ID: ${res.reservationId}`);
        console.log(`   Área: ${res.area}`);
        console.log(`   Fecha: ${res.date.toISOString().split('T')[0]}`);
        console.log(`   Hora inicio: ${res.startTime}`);
        console.log(`   Hora fin: ${res.endTime}`);
        console.log(`   Estado: ${res.status}`);
        console.log(`   Usuario: ${res.userName}`);
        console.log(`   Creada: ${res.createdAt.toISOString()}`);
      });

      // Verificar si son duplicadas
      if (specificReservations.length === 2) {
        const [res1, res2] = specificReservations;
        const isDuplicate = 
          res1.area === res2.area &&
          res1.date.toISOString().split('T')[0] === res2.date.toISOString().split('T')[0] &&
          res1.startTime === res2.startTime &&
          res1.endTime === res2.endTime;

        console.log(`\n🚨 ¿Son duplicadas?: ${isDuplicate ? 'SÍ' : 'NO'}`);
        
        if (isDuplicate) {
          console.log('❌ PROBLEMA CONFIRMADO: Reservas duplicadas detectadas');
          console.log('   - Misma área:', res1.area);
          console.log('   - Misma fecha:', res1.date.toISOString().split('T')[0]);
          console.log('   - Misma hora inicio:', res1.startTime);
          console.log('   - Misma hora fin:', res1.endTime);
        }
      }
    }

    // Buscar TODAS las reservas duplicadas en el sistema
    console.log('\n🔍 Buscando TODAS las reservas duplicadas en el sistema...');
    
    const allReservations = await Reservation.find({
      status: { $in: ['confirmed', 'active', 'completed'] }
    }).sort({ area: 1, date: 1, startTime: 1 });

    console.log(`📊 Total de reservas activas: ${allReservations.length}`);

    // Agrupar por área, fecha y horario
    const groupedReservations = {};
    const duplicates = [];

    allReservations.forEach(reservation => {
      const key = `${reservation.area}-${reservation.date.toISOString().split('T')[0]}-${reservation.startTime}-${reservation.endTime}`;
      
      if (!groupedReservations[key]) {
        groupedReservations[key] = [];
      }
      groupedReservations[key].push(reservation);
    });

    // Encontrar duplicados
    Object.entries(groupedReservations).forEach(([key, reservations]) => {
      if (reservations.length > 1) {
        duplicates.push({
          key,
          count: reservations.length,
          reservations
        });
      }
    });

    console.log(`\n🚨 Duplicados encontrados: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
      duplicates.forEach((duplicate, index) => {
        console.log(`\n${index + 1}. Duplicado: ${duplicate.key}`);
        console.log(`   Cantidad: ${duplicate.count} reservas`);
        duplicate.reservations.forEach((res, resIndex) => {
          console.log(`   ${resIndex + 1}. ID: ${res.reservationId} | Usuario: ${res.userName} | Estado: ${res.status} | Creada: ${res.createdAt.toISOString()}`);
        });
      });
    } else {
      console.log('✅ No se encontraron duplicados en el sistema');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

checkDuplicateReservations();
