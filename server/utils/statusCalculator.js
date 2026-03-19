const dateHelpers = require('./dateHelpers');

/**
 * Calculate the correct status for a reservation based on current date/time.
 * @param {Object} params
 * @param {string} params.reservationDate - YYYY-MM-DD string
 * @param {string} params.startTime - HH:MM
 * @param {string} params.endTime - HH:MM
 * @param {string} [params.currentStatus] - existing status (for cancelled check)
 * @returns {'confirmed'|'active'|'completed'|'cancelled'}
 */
function calculateReservationStatus({ reservationDate, startTime, endTime, currentStatus }) {
  // Never auto-change cancelled reservations
  if (currentStatus === 'cancelled') return 'cancelled';

  const today = dateHelpers.getTodayString();
  const currentTime = dateHelpers.getCurrentTimeString();

  if (reservationDate === today) {
    if (currentTime >= startTime && currentTime <= endTime) return 'active';
    if (currentTime > endTime) return 'completed';
    return 'confirmed';
  }

  if (reservationDate < today) return 'completed';
  return 'confirmed';
}

module.exports = { calculateReservationStatus };
