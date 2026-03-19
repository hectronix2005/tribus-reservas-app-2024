// Utility functions shared across reservation components

/**
 * Returns Tailwind CSS class strings for a reservation status badge.
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'confirmed': return 'bg-blue-100 text-blue-800';
    case 'active': return 'bg-green-100 text-green-800';
    case 'completed': return 'bg-gray-100 text-gray-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Returns the Spanish display text for a reservation status.
 */
export const getStatusText = (status: string): string => {
  switch (status) {
    case 'confirmed': return 'Confirmada';
    case 'active': return 'Activa';
    case 'completed': return 'Cumplida';
    case 'pending': return 'Pendiente';
    case 'cancelled': return 'Cancelada';
    default: return 'Desconocido';
  }
};

/**
 * Adds the given number of minutes to a HH:MM time string and returns the new HH:MM string.
 */
export const addMinutesToTime = (time: string, minutes: number): string => {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
};
