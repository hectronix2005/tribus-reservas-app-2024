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

async function cleanDuplicateReservations() {
  try {
    console.log('🔍 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_CONFIG.uri, MONGODB_CONFIG.options);
    console.log('✅ Conectado a MongoDB');

    // Obtener todas las reservas activas
    const allReservations = await Reservation.find({
      status: { $in: ['confirmed', 'active', 'completed'] }
    }).sort({ area: 1, date: 1, startTime: 1, createdAt: 1 });

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
          reservations: reservations.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        });
      }
    });

    console.log(`\n🚨 Duplicados encontrados: ${duplicates.length}`);
    
    if (duplicates.length === 0) {
      console.log('✅ No hay duplicados para limpiar');
      return;
    }

    // Mostrar duplicados y limpiar
    let totalDeleted = 0;
    
    for (const duplicate of duplicates) {
      console.log(`\n🔍 Procesando duplicado: ${duplicate.key}`);
      console.log(`   Cantidad: ${duplicate.count} reservas`);
      
      // Mantener la primera (más antigua) y eliminar las demás
      const [keepReservation, ...deleteReservations] = duplicate.reservations;
      
      console.log(`   ✅ MANTENER: ${keepReservation.reservationId} (${keepReservation.userName}) - Creada: ${keepReservation.createdAt.toISOString()}`);
      
      for (const deleteReservation of deleteReservations) {
        console.log(`   ❌ ELIMINAR: ${deleteReservation.reservationId} (${deleteReservation.userName}) - Creada: ${deleteReservation.createdAt.toISOString()}`);
        
        try {
          await Reservation.findByIdAndDelete(deleteReservation._id);
          totalDeleted++;
          console.log(`   ✅ Eliminada exitosamente`);
        } catch (error) {
          console.log(`   ❌ Error eliminando: ${error.message}`);
        }
      }
    }

    console.log(`\n📊 RESUMEN:`);
    console.log(`   - Duplicados procesados: ${duplicates.length}`);
    console.log(`   - Reservas eliminadas: ${totalDeleted}`);
    console.log(`   - Reservas mantenidas: ${duplicates.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

cleanDuplicateReservations();
