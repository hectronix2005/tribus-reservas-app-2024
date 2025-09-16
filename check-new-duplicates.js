const mongoose = require('mongoose');

// Configuración de MongoDB
const MONGODB_CONFIG = {
  uri: 'mongodb+srv://tribus_admin:Tribus2024@cluster0.o16ucum.mongodb.net/tribus?retryWrites=true&w=majority&appName=Cluster0',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
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

async function checkNewDuplicates() {
  try {
    console.log('🔍 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_CONFIG.uri, MONGODB_CONFIG.options);
    console.log('✅ Conectado a MongoDB');

    // Buscar las reservas específicas mencionadas
    const specificIds = ['RES-20250916-225617-7051', 'RES-20250916-230340-0180'];
    
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

      // Verificar si se solapan
      if (specificReservations.length === 2) {
        const [res1, res2] = specificReservations;
        const isOverlapping = 
          res1.area === res2.area &&
          res1.date.toISOString().split('T')[0] === res2.date.toISOString().split('T')[0] &&
          res1.startTime < res2.endTime &&
          res2.startTime < res1.endTime;

        console.log(`\n🚨 ¿Se solapan?: ${isOverlapping ? 'SÍ' : 'NO'}`);
        
        if (isOverlapping) {
          console.log('❌ PROBLEMA CONFIRMADO: Reservas solapadas detectadas');
          console.log('   - Misma área:', res1.area);
          console.log('   - Misma fecha:', res1.date.toISOString().split('T')[0]);
          console.log('   - Solapamiento de horarios detectado');
          console.log(`   - Reserva 1: ${res1.startTime} - ${res1.endTime}`);
          console.log(`   - Reserva 2: ${res2.startTime} - ${res2.endTime}`);
        }
      }
    }

    // Buscar TODAS las reservas duplicadas/solapadas en el sistema
    console.log('\n🔍 Buscando TODAS las reservas solapadas en el sistema...');
    
    const allReservations = await Reservation.find({
      status: { $in: ['confirmed', 'active', 'completed'] }
    }).sort({ area: 1, date: 1, startTime: 1 });

    console.log(`📊 Total de reservas activas: ${allReservations.length}`);

    // Agrupar por área y fecha
    const groupedReservations = {};
    const overlappingReservations = [];

    allReservations.forEach(reservation => {
      const key = `${reservation.area}-${reservation.date.toISOString().split('T')[0]}`;
      
      if (!groupedReservations[key]) {
        groupedReservations[key] = [];
      }
      groupedReservations[key].push(reservation);
    });

    // Encontrar solapamientos
    Object.entries(groupedReservations).forEach(([key, reservations]) => {
      if (reservations.length > 1) {
        // Ordenar por hora de inicio
        reservations.sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        // Verificar solapamientos
        for (let i = 0; i < reservations.length - 1; i++) {
          for (let j = i + 1; j < reservations.length; j++) {
            const res1 = reservations[i];
            const res2 = reservations[j];
            
            // Verificar si se solapan
            if (res1.startTime < res2.endTime && res2.startTime < res1.endTime) {
              overlappingReservations.push({
                key,
                reservation1: res1,
                reservation2: res2
              });
            }
          }
        }
      }
    });

    console.log(`\n🚨 Solapamientos encontrados: ${overlappingReservations.length}`);
    
    if (overlappingReservations.length > 0) {
      overlappingReservations.forEach((overlap, index) => {
        console.log(`\n${index + 1}. Solapamiento: ${overlap.key}`);
        console.log(`   Reserva 1: ${overlap.reservation1.reservationId} | ${overlap.reservation1.userName} | ${overlap.reservation1.startTime}-${overlap.reservation1.endTime} | Estado: ${overlap.reservation1.status}`);
        console.log(`   Reserva 2: ${overlap.reservation2.reservationId} | ${overlap.reservation2.userName} | ${overlap.reservation2.startTime}-${overlap.reservation2.endTime} | Estado: ${overlap.reservation2.status}`);
      });
    } else {
      console.log('✅ No se encontraron solapamientos en el sistema');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

checkNewDuplicates();
