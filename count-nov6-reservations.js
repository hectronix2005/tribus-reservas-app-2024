const mongoose = require('mongoose');
const MONGODB_CONFIG = require('./mongodb-config');

// Modelo de Reservación (simplificado)
const reservationSchema = new mongoose.Schema({
  reservationId: String,
  userId: mongoose.Schema.Types.ObjectId,
  userName: String,
  area: String,
  date: Date,
  startTime: String,
  endTime: String,
  requestedSeats: Number,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'active', 'cancelled', 'completed'],
    default: 'pending'
  },
  teamName: String,
  colaboradores: [String],
  createdBy: {
    userId: mongoose.Schema.Types.ObjectId,
    userName: String,
    userEmail: String,
    userRole: String
  }
}, {
  timestamps: true,
  collection: 'reservations'  // Especificar el nombre de la colección
});

const Reservation = mongoose.model('Reservation', reservationSchema);

async function countNov6Reservations() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_CONFIG.uri, MONGODB_CONFIG.options);
    console.log('✅ Conectado exitosamente a MongoDB');

    // Buscar todas las reservas que contengan '2025-11-06' en la fecha
    console.log('\n📊 Buscando reservas para el 6 de noviembre de 2025...\n');

    // Crear rango de fechas para el 6 de noviembre
    const startDate = new Date('2025-11-06T00:00:00.000Z');
    const endDate = new Date('2025-11-07T00:00:00.000Z');

    const allReservations = await Reservation.find({
      date: {
        $gte: startDate,
        $lt: endDate
      }
    }).sort({ date: 1, startTime: 1 });

    console.log(`📋 TOTAL DE RESERVAS PARA 2025-11-06: ${allReservations.length}\n`);

    // Agrupar por status
    const byStatus = {
      confirmed: allReservations.filter(r => r.status === 'confirmed'),
      active: allReservations.filter(r => r.status === 'active'),
      pending: allReservations.filter(r => r.status === 'pending'),
      cancelled: allReservations.filter(r => r.status === 'cancelled'),
      completed: allReservations.filter(r => r.status === 'completed')
    };

    console.log('📊 CONTEO POR STATUS:');
    console.log(`  ✅ Confirmadas: ${byStatus.confirmed.length}`);
    console.log(`  🟢 Activas: ${byStatus.active.length}`);
    console.log(`  🟡 Pendientes: ${byStatus.pending.length}`);
    console.log(`  ❌ Canceladas: ${byStatus.cancelled.length}`);
    console.log(`  ✔️  Completadas: ${byStatus.completed.length}\n`);

    // Contar puestos por status
    const seatsConfirmed = byStatus.confirmed.reduce((sum, r) => sum + (r.requestedSeats || 0), 0);
    const seatsActive = byStatus.active.reduce((sum, r) => sum + (r.requestedSeats || 0), 0);
    const seatsTotal = allReservations.reduce((sum, r) => sum + (r.requestedSeats || 0), 0);

    console.log('💺 PUESTOS SOLICITADOS:');
    console.log(`  ✅ Confirmadas: ${seatsConfirmed} puestos`);
    console.log(`  🟢 Activas: ${seatsActive} puestos`);
    console.log(`  📊 Total: ${seatsTotal} puestos\n`);

    // Mostrar detalles de cada reserva confirmada
    if (byStatus.confirmed.length > 0) {
      console.log('📝 DETALLES DE RESERVAS CONFIRMADAS:\n');
      byStatus.confirmed.forEach((reservation, index) => {
        console.log(`${index + 1}. ${reservation.area} - ${reservation.teamName}`);
        console.log(`   📅 Fecha: ${reservation.date.toISOString()}`);
        console.log(`   🕐 Horario: ${reservation.startTime || 'N/A'} - ${reservation.endTime || 'N/A'}`);
        console.log(`   💺 Puestos: ${reservation.requestedSeats || 0}`);
        console.log(`   👤 Creado por: ${reservation.createdBy?.userName || reservation.userName}`);
        console.log(`   🆔 ID: ${reservation.reservationId || reservation._id}`);
        console.log(`   ⚡ Status: ${reservation.status}\n`);
      });
    }

    // Mostrar detalles de reservas activas si existen
    if (byStatus.active.length > 0) {
      console.log('\n📝 DETALLES DE RESERVAS ACTIVAS:\n');
      byStatus.active.forEach((reservation, index) => {
        console.log(`${index + 1}. ${reservation.area} - ${reservation.teamName}`);
        console.log(`   📅 Fecha: ${reservation.date.toISOString()}`);
        console.log(`   🕐 Horario: ${reservation.startTime || 'N/A'} - ${reservation.endTime || 'N/A'}`);
        console.log(`   💺 Puestos: ${reservation.requestedSeats || 0}`);
        console.log(`   👤 Creado por: ${reservation.createdBy?.userName || reservation.userName}`);
        console.log(`   🆔 ID: ${reservation.reservationId || reservation._id}`);
        console.log(`   ⚡ Status: ${reservation.status}\n`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
}

countNov6Reservations();
