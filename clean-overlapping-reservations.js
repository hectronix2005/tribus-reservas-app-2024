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

async function cleanOverlappingReservations() {
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
    
    if (specificReservations.length === 2) {
      const [res1, res2] = specificReservations.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      console.log('\n🔍 Analizando reservas solapadas:');
      console.log(`1. ${res1.reservationId} - ${res1.userName} - ${res1.startTime}-${res1.endTime} - Creada: ${res1.createdAt.toISOString()}`);
      console.log(`2. ${res2.reservationId} - ${res2.userName} - ${res2.startTime}-${res2.endTime} - Creada: ${res2.createdAt.toISOString()}`);
      
      // Mantener la más antigua, eliminar la más reciente
      const keepReservation = res1;
      const deleteReservation = res2;
      
      console.log(`\n✅ MANTENER: ${keepReservation.reservationId} (más antigua)`);
      console.log(`❌ ELIMINAR: ${deleteReservation.reservationId} (más reciente)`);
      
      try {
        await Reservation.findByIdAndDelete(deleteReservation._id);
        console.log(`✅ Reserva ${deleteReservation.reservationId} eliminada exitosamente`);
      } catch (error) {
        console.log(`❌ Error eliminando ${deleteReservation.reservationId}: ${error.message}`);
      }
    }

    // Verificar que no queden solapamientos
    console.log('\n🔍 Verificando que no queden solapamientos...');
    
    const allReservations = await Reservation.find({
      status: { $in: ['confirmed', 'active', 'completed'] }
    }).sort({ area: 1, date: 1, startTime: 1 });

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

    console.log(`\n📊 Solapamientos restantes: ${overlappingReservations.length}`);
    
    if (overlappingReservations.length === 0) {
      console.log('✅ ¡No quedan solapamientos en el sistema!');
    } else {
      console.log('❌ Aún hay solapamientos:');
      overlappingReservations.forEach((overlap, index) => {
        console.log(`${index + 1}. ${overlap.key}: ${overlap.reservation1.reservationId} vs ${overlap.reservation2.reservationId}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

cleanOverlappingReservations();
