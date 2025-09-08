// Script para probar el cálculo de capacidad de Hot Desk para 09/09/2025
const axios = require('axios');

async function testCapacityCalculation() {
  try {
    console.log('🔍 Iniciando prueba de capacidad para Hot Desk 09/09/2025...\n');
    
    // 1. Obtener áreas
    console.log('1. Obteniendo áreas...');
    const areasResponse = await axios.get('http://localhost:3001/api/areas');
    const hotDeskArea = areasResponse.data.find(area => area.name === 'Hot Desk');
    console.log('Hot Desk area:', {
      id: hotDeskArea.id,
      name: hotDeskArea.name,
      capacity: hotDeskArea.capacity
    });
    
    // 2. Obtener reservaciones para 09/09/2025
    console.log('\n2. Obteniendo reservaciones para 09/09/2025...');
    const reservationsResponse = await axios.get('http://localhost:3001/api/reservations');
    const hotDeskReservations = reservationsResponse.data.filter(reservation => 
      reservation.area === 'Hot Desk' && 
      reservation.date.includes('2025-09-09') &&
      reservation.status === 'active'
    );
    
    console.log('Reservaciones de Hot Desk para 09/09/2025:', hotDeskReservations.map(r => ({
      requestedSeats: r.requestedSeats,
      status: r.status,
      date: r.date
    })));
    
    // 3. Calcular capacidad manualmente
    console.log('\n3. Cálculo manual de capacidad:');
    const totalCapacity = hotDeskArea.capacity;
    const reservedSeats = hotDeskReservations.reduce((total, r) => total + r.requestedSeats, 0);
    const availableSeats = totalCapacity - reservedSeats;
    
    console.log({
      totalCapacity,
      reservedSeats,
      availableSeats,
      reservations: hotDeskReservations.length
    });
    
    // 4. Simular lo que debería devolver getDailyCapacity
    console.log('\n4. Simulando getDailyCapacity para 2025-09-09:');
    const normalizedDate = '2025-09-09';
    const reservationsForDate = reservationsResponse.data.filter(reservation => {
      const reservationDate = reservation.date.includes('T') ? reservation.date.split('T')[0] : reservation.date;
      return reservationDate === normalizedDate && reservation.status !== 'cancelled';
    });
    
    const hotDeskReservationsForDate = reservationsForDate.filter(r => r.area === 'Hot Desk');
    const calculatedReservedSeats = hotDeskReservationsForDate.reduce((total, r) => total + r.requestedSeats, 0);
    const calculatedAvailableSeats = totalCapacity - calculatedReservedSeats;
    
    console.log({
      normalizedDate,
      reservationsForDate: reservationsForDate.length,
      hotDeskReservationsForDate: hotDeskReservationsForDate.length,
      calculatedReservedSeats,
      calculatedAvailableSeats
    });
    
    // 5. Verificar si hay discrepancias
    console.log('\n5. Verificación de discrepancias:');
    if (availableSeats !== calculatedAvailableSeats) {
      console.log('❌ DISCREPANCIA ENCONTRADA:');
      console.log('Manual:', availableSeats);
      console.log('Calculado:', calculatedAvailableSeats);
    } else {
      console.log('✅ Cálculos coinciden:', availableSeats);
    }
    
  } catch (error) {
    console.error('Error en la prueba:', error.message);
  }
}

testCapacityCalculation();
