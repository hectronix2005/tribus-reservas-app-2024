const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Esquema de Reservación
const reservationSchema = new mongoose.Schema({}, { strict: false, collection: 'reservations' });
const Reservation = mongoose.model('Reservation', reservationSchema);

// Esquema de Usuario
const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const User = mongoose.model('User', userSchema);

async function deleteNeonGerenciaReservations() {
  try {
    console.log('🔍 Buscando usuario Hector Neira...');

    // Buscar usuario Hector Neira
    const user = await User.findOne({ name: /hector.*neira/i });

    if (!user) {
      console.log('❌ Usuario Hector Neira no encontrado');
      process.exit(1);
    }

    console.log('✅ Usuario encontrado:', { id: user._id, name: user.name });

    console.log('\n🔍 Buscando reservas de Sala Neon - Gerencia...');

    // Buscar reservas de Sala Neon con equipo Gerencia creadas por Hector Neira
    const reservations = await Reservation.find({
      area: /neon/i,
      teamName: /gerencia/i,
      userId: user._id
    }).sort({ date: 1 });

    if (reservations.length === 0) {
      console.log('❌ No se encontraron reservas de Sala Neon - Gerencia creadas por Hector Neira');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log(`\n📋 Encontradas ${reservations.length} reservas:\n`);

    reservations.forEach(res => {
      console.log(`  • ${res.reservationId} - ${res.area} - ${res.teamName}`);
      console.log(`    Fecha: ${res.date} | Hora: ${res.startTime}-${res.endTime} | Estado: ${res.status}`);
    });

    console.log(`\n🗑️  Eliminando ${reservations.length} reservas...`);

    // Eliminar todas las reservas encontradas
    const result = await Reservation.deleteMany({
      area: /neon/i,
      teamName: /gerencia/i,
      userId: user._id
    });

    console.log(`✅ Se eliminaron ${result.deletedCount} reservas exitosamente`);

    await mongoose.connection.close();
    console.log('\n✅ Proceso completado');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteNeonGerenciaReservations();
