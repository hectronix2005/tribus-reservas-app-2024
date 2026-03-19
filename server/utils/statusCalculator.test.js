const { calculateReservationStatus } = require('./statusCalculator');
const dateHelpers = require('./dateHelpers');

// Helper to get a date string N days from today
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

describe('calculateReservationStatus', () => {
  test('returns confirmed for future dates', () => {
    const status = calculateReservationStatus({
      reservationDate: daysFromNow(5),
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(status).toBe('confirmed');
  });

  test('returns completed for past dates', () => {
    const status = calculateReservationStatus({
      reservationDate: daysFromNow(-3),
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(status).toBe('completed');
  });

  test('never changes cancelled status', () => {
    const status = calculateReservationStatus({
      reservationDate: daysFromNow(5),
      startTime: '09:00',
      endTime: '10:00',
      currentStatus: 'cancelled',
    });
    expect(status).toBe('cancelled');
  });

  test('returns active when current time is within reservation window today', () => {
    const today = daysFromNow(0);
    // Mock the current time to be within 09:00-10:00
    jest.spyOn(dateHelpers, 'getCurrentTimeString').mockReturnValue('09:30');

    const status = calculateReservationStatus({
      reservationDate: today,
      startTime: '09:00',
      endTime: '10:00',
    });

    expect(status).toBe('active');
    jest.restoreAllMocks();
  });

  test('returns completed when current time is after reservation end today', () => {
    const today = daysFromNow(0);
    jest.spyOn(dateHelpers, 'getCurrentTimeString').mockReturnValue('11:00');

    const status = calculateReservationStatus({
      reservationDate: today,
      startTime: '09:00',
      endTime: '10:00',
    });

    expect(status).toBe('completed');
    jest.restoreAllMocks();
  });

  test('returns confirmed when current time is before reservation start today', () => {
    const today = daysFromNow(0);
    jest.spyOn(dateHelpers, 'getCurrentTimeString').mockReturnValue('08:00');

    const status = calculateReservationStatus({
      reservationDate: today,
      startTime: '09:00',
      endTime: '10:00',
    });

    expect(status).toBe('confirmed');
    jest.restoreAllMocks();
  });
});
